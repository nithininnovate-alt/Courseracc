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
    isUserEnrolled: vi.fn(),
    getUnlockedYears: vi.fn(),
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

function postChat(body: unknown, authed: boolean): Promise<Response> {
  mocks.authed.value = authed;
  return fetch(`${baseUrl}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  messages: [{ role: "user", content: "What is a derivative?" }],
};

describe("POST /ai/chat authorization matrix", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    const res = await postChat(validBody, false);

    expect(res.status).toBe(401);
    // The AI provider must never be invoked for an unauthenticated request.
    expect(mocks.openaiCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is invalid", async () => {
    // Empty messages array violates the SendChatMessageBody schema.
    const res = await postChat({ messages: [] }, true);

    expect(res.status).toBe(400);
    // An invalid request must never reach the AI provider.
    expect(mocks.openaiCreate).not.toHaveBeenCalled();
  });

  it("returns a 200 SSE stream for an authenticated valid request", async () => {
    // buildStudentContext queries enrollments first; an empty result short
    // circuits the remaining lookups.
    mocks.selectQueue.push([]);
    mocks.openaiCreate.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "Hello " } }] };
        yield { choices: [{ delta: { content: "world" } }] };
      })(),
    );

    const res = await postChat(validBody, true);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(mocks.openaiCreate).toHaveBeenCalledTimes(1);

    const text = await res.text();
    expect(text).toContain("data:");
    expect(text).toContain("Hello ");
    expect(text).toContain("world");
    expect(text).toContain('"done":true');
  });

  it("excludes locked-year subjects and materials from the AI context", async () => {
    // Enrolled in course 1, which has Year 1 (unlocked) and Year 2 (locked).
    mocks.selectQueue.push(
      [{ courseId: 1 }], // enrollments
      [{ id: 1, title: "BSc Medicine", description: null }], // courses
      [
        { id: 10, courseId: 1, year: 1, title: "Anatomy", description: null },
        {
          id: 20,
          courseId: 1,
          year: 2,
          title: "Pharmacology",
          description: null,
        },
      ], // subjects
      [
        {
          id: 100,
          subjectId: 10,
          title: "Bones",
          type: "text",
          content: "Year one bones content",
        },
      ], // materials (only unlocked-year subjects are queried)
    );
    mocks.access.getUnlockedYears.mockResolvedValue({
      courseId: 1,
      years: [1, 2],
      allYearsUnlocked: false,
      unlockedYears: [1],
    });
    mocks.openaiCreate.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "ok" } }] };
      })(),
    );

    const res = await postChat(validBody, true);
    expect(res.status).toBe(200);
    await res.text();

    expect(mocks.openaiCreate).toHaveBeenCalledTimes(1);
    const call = mocks.openaiCreate.mock.calls[0][0] as {
      messages: { role: string; content: string }[];
    };
    const systemPrompt = call.messages.find((m) => m.role === "system")!
      .content;
    // Unlocked Year 1 subject is present; locked Year 2 subject is not.
    expect(systemPrompt).toContain("Anatomy");
    expect(systemPrompt).toContain("Year one bones content");
    expect(systemPrompt).not.toContain("Pharmacology");
  });
});
