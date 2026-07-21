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
  // Values returned, in order, by successive `db.select()...` chains.
  selectQueue: [] as unknown[],
  // Whether the mocked requireUser middleware should treat the request as
  // authenticated.
  authed: { value: false },
  access: {
    getCourseIdForMaterial: vi.fn(),
    getCourseAccess: vi.fn(),
    isYearUnlocked: vi.fn(),
  },
  openaiCreate: vi.fn(),
}));

// drizzle helpers are only used to build query predicates that the mocked db
// ignores, so no-op implementations are sufficient.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  inArray: () => ({}),
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
  const db = {
    select: () => makeChain(),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => Promise.resolve({}),
      }),
    }),
  };
  return {
    db,
    enrollmentsTable: {},
    coursesTable: {},
    subjectsTable: {},
    studyMaterialsTable: {},
    lessonExplanationsTable: {},
  };
});

vi.mock("../lib/access", () => mocks.access);

// Stand-in auth middleware that mirrors requireUser: 401 when unauthenticated,
// otherwise attaches a current user and continues.
vi.mock("../lib/auth", () => ({
  isStaff: () => false,
  requireUser: (
    req: { currentUser?: unknown },
    res: { status: (code: number) => { json: (body: unknown) => void } },
    next: () => void,
  ) => {
    if (!mocks.authed.value) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.currentUser = { id: 1, firstName: "Test", lastName: "Student" };
    next();
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mocks.openaiCreate } } },
}));

// Import the router only after the mocks above are registered.
const aiRouter = (await import("./ai")).default;

let server: ReturnType<Express["listen"]>;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(aiRouter);
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
  mocks.authed.value = false;
  vi.clearAllMocks();
});

function postExplain(body: unknown, authed: boolean): Promise<Response> {
  mocks.authed.value = authed;
  return fetch(`${baseUrl}/ai/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const material = {
  id: 1,
  subjectId: 5,
  title: "Intro to Algebra",
  type: "text",
  content: "Some lesson content.",
};

describe("POST /ai/explain authorization matrix", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    const res = await postExplain({ materialId: 1 }, false);

    expect(res.status).toBe(401);
    // The access checks must never run for an unauthenticated request.
    expect(mocks.access.getCourseAccess).not.toHaveBeenCalled();
    expect(mocks.openaiCreate).not.toHaveBeenCalled();
  });

  it("returns 403 when the student lacks access to the course", async () => {
    // Ordered results for the material and subject lookups.
    mocks.selectQueue.push(
      [material],
      [{ id: 5, courseId: 10, title: "Mathematics", description: null, year: 1 }],
    );
    mocks.access.getCourseIdForMaterial.mockResolvedValue(10);
    mocks.access.isYearUnlocked.mockResolvedValue(true);
    mocks.access.getCourseAccess.mockResolvedValue({
      courseId: 10,
      price: 50,
      paid: false,
      hasAccess: false,
    });

    const res = await postExplain({ materialId: 1 }, true);

    expect(res.status).toBe(403);
    // A locked course must never reach the AI provider.
    expect(mocks.openaiCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the materialId is unknown", async () => {
    // Material lookup resolves to no rows.
    mocks.selectQueue.push([]);

    const res = await postExplain({ materialId: 999 }, true);

    expect(res.status).toBe(404);
    expect(mocks.openaiCreate).not.toHaveBeenCalled();
  });

  it("returns a 200 SSE stream when the student has access", async () => {
    // Ordered results for the material, subject and course lookups.
    mocks.selectQueue.push(
      [material],
      [{ id: 5, courseId: 10, title: "Mathematics", description: null, year: 1 }],
      [{ id: 10, title: "Foundation Year", description: null }],
    );
    mocks.access.getCourseIdForMaterial.mockResolvedValue(10);
    mocks.access.isYearUnlocked.mockResolvedValue(true);
    mocks.access.getCourseAccess.mockResolvedValue({
      courseId: 10,
      price: 0,
      paid: false,
      hasAccess: true,
    });
    mocks.openaiCreate.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "Hello " } }] };
        yield { choices: [{ delta: { content: "world" } }] };
      })(),
    );

    const res = await postExplain({ materialId: 1, mode: "explain" }, true);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(mocks.openaiCreate).toHaveBeenCalledTimes(1);

    const text = await res.text();
    expect(text).toContain("data:");
    expect(text).toContain("Hello ");
    expect(text).toContain("world");
    expect(text).toContain('"done":true');
  });
});
