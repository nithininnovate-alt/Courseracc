import type { AddressInfo } from "node:net";
import express, { type Express } from "express";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Shared, mutable mock state. Declared via vi.hoisted so it can be referenced
// inside the (hoisted) vi.mock factories below.
const mocks = vi.hoisted(() => ({
  // Values returned, in order, by successive `db.select()...` chains. The
  // ownership/shared-asset lookups in storage.ts consult the db directly; an
  // empty queue makes every one of them resolve to no rows (i.e. "not owned"
  // and "not a shared academic asset").
  selectQueue: [] as unknown[],
  // The user resolveCurrentUser should return (null == unauthenticated).
  currentUser: { value: null as unknown },
  access: {
    userCanAccessMaterialObject: vi.fn(),
  },
  storage: {
    getObjectEntityFile: vi.fn(),
    downloadObject: vi.fn(),
  },
}));

// drizzle helpers only build predicates the mocked db ignores.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
}));

// A minimal drizzle-like db whose select() returns a chainable, awaitable
// object resolving to the next value queued by each test.
vi.mock("@workspace/db", () => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ["from", "where", "limit", "innerJoin", "orderBy"]) {
      chain[method] = () => chain;
    }
    (chain as { then: unknown }).then = (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(mocks.selectQueue.shift() ?? []).then(resolve, reject);
    return chain;
  };
  const db = { select: () => makeChain() };
  return {
    db,
    usersTable: {},
    applicationsTable: {},
    applicationDocumentsTable: {},
    submissionsTable: {},
    examSubmissionsTable: {},
    assignmentsTable: {},
    examsTable: {},
  };
});

vi.mock("../lib/access", () => mocks.access);

// Stand-in auth helpers mirroring the real module: resolveCurrentUser returns
// the queued user (or null), and only admins/superadmins count as staff.
vi.mock("../lib/auth", () => ({
  resolveCurrentUser: () => Promise.resolve(mocks.currentUser.value),
  resolveStaffCookieUser: () => Promise.resolve(null),
  isStaff: (user: { role?: string } | null | undefined) =>
    user?.role === "admin" || user?.role === "superadmin",
}));

// Replace the object-storage service so tests never touch Google Cloud Storage.
vi.mock("../lib/objectStorage", () => ({
  ObjectNotFoundError: class ObjectNotFoundError extends Error {
    constructor() {
      super("Object not found");
      this.name = "ObjectNotFoundError";
    }
  },
  ObjectStorageService: class {
    getObjectEntityFile = mocks.storage.getObjectEntityFile;
    downloadObject = mocks.storage.downloadObject;
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Import the router only after the mocks above are registered.
const storageRouter = (await import("./storage")).default;

let server: ReturnType<Express["listen"]>;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // storage.ts reads req.log in its catch blocks (attached by pino-http in
  // production); provide a no-op stand-in.
  app.use((req, _res, next) => {
    (req as { log?: unknown }).log = {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };
    next();
  });
  app.use(storageRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  mocks.selectQueue.length = 0;
  mocks.currentUser.value = null;
  vi.clearAllMocks();
});

const student = { id: 7, role: "student", firstName: "Test", lastName: "Student" };

function getObject(): Promise<Response> {
  return fetch(`${baseUrl}/storage/objects/materials/locked.pdf`);
}

describe("GET /storage/objects/* material-object authorization matrix", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    mocks.currentUser.value = null;

    const res = await getObject();

    expect(res.status).toBe(401);
    // No access check or download should ever run for an anonymous request.
    expect(mocks.access.userCanAccessMaterialObject).not.toHaveBeenCalled();
    expect(mocks.storage.downloadObject).not.toHaveBeenCalled();
  });

  it("returns 403 when the student lacks access to the material's course", async () => {
    mocks.currentUser.value = student;
    // The object maps to a real material, but the course is locked.
    mocks.access.userCanAccessMaterialObject.mockResolvedValue(false);

    const res = await getObject();

    expect(res.status).toBe(403);
    // A locked course must never be downloaded.
    expect(mocks.storage.downloadObject).not.toHaveBeenCalled();
  });

  it("returns 403 when the object maps to no study material", async () => {
    mocks.currentUser.value = student;
    // userCanAccessMaterialObject resolves false when no material matches the
    // object path (as well as when the course is locked).
    mocks.access.userCanAccessMaterialObject.mockResolvedValue(false);

    const res = await getObject();

    expect(res.status).toBe(403);
    expect(mocks.storage.downloadObject).not.toHaveBeenCalled();
  });

  it("streams the file when the student has access to the material's course", async () => {
    mocks.currentUser.value = student;
    mocks.access.userCanAccessMaterialObject.mockResolvedValue(true);
    mocks.storage.getObjectEntityFile.mockResolvedValue({ name: "locked.pdf" });
    mocks.storage.downloadObject.mockResolvedValue(
      new Response("file-bytes", {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );

    const res = await getObject();

    expect(res.status).toBe(200);
    expect(mocks.access.userCanAccessMaterialObject).toHaveBeenCalledWith(
      student.id,
      "/objects/materials/locked.pdf",
    );
    expect(mocks.storage.downloadObject).toHaveBeenCalledTimes(1);
    expect(await res.text()).toBe("file-bytes");
  });
});
