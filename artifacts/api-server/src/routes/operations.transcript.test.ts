import { beforeEach, describe, expect, it, vi } from "vitest";

// Shared, mutable mock state referenced from the hoisted vi.mock factories.
const mocks = vi.hoisted(() => ({
  // Values returned, in order, by successive `db.select()...` chains.
  // buildTranscriptRows issues up to three selects: subjects, exams, results.
  selectQueue: [] as unknown[],
}));

// drizzle helpers only build predicates the mocked db ignores.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  asc: () => ({}),
  desc: () => ({}),
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
  const db = { select: () => makeChain() };
  return {
    db,
    paymentsTable: {},
    paymentPlansTable: {},
    coursesTable: {},
    usersTable: {},
    certificatesTable: {},
    emailLogsTable: {},
    courierTrackingTable: {},
    enrollmentsTable: {},
    subjectsTable: {},
    examsTable: {},
    resultsTable: {},
    assignmentsTable: {},
    submissionsTable: {},
  };
});

// Side-effectful modules the operations router pulls in at import time.
vi.mock("../lib/auth", () => ({
  resolveCurrentUser: vi.fn(),
  isStaff: vi.fn(),
  requireUser: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireStaff: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../lib/paypal", () => ({
  isPaypalConfigured: () => false,
  createOrder: vi.fn(),
  captureOrder: vi.fn(),
}));
vi.mock("../lib/invoice", () => ({ generateInvoice: vi.fn() }));
vi.mock("../lib/email", () => ({
  sendEmail: vi.fn(),
  resendEmailLog: vi.fn(),
  buildCertificateIssued: vi.fn(),
  buildCourierDispatched: vi.fn(),
  buildPaymentConfirmation: vi.fn(),
  buildCourseActivation: vi.fn(),
}));
vi.mock("../lib/access", () => ({
  ensureEnrollment: vi.fn(),
  getPlanStatus: vi.fn(),
}));

import { buildTranscriptRows } from "./operations";

interface SubjectRow {
  id: number;
  courseId: number;
  title: string;
  credits: number | null;
  year: number;
  orderIndex: number;
}
interface ExamRow {
  id: number;
  subjectId: number;
  totalMarks: number;
}
interface ResultRow {
  examId: number;
  userId: number;
  score: number;
  grade: string | null;
  passed: boolean;
  published: boolean;
}

const subject = (id: number, overrides: Partial<SubjectRow> = {}): SubjectRow => ({
  id,
  courseId: 1,
  title: `CGU10${id} — Subject ${id}`,
  credits: 7.5,
  year: 1,
  orderIndex: id,
  ...overrides,
});
const exam = (id: number, subjectId: number, totalMarks = 100): ExamRow => ({
  id,
  subjectId,
  totalMarks,
});
const result = (examId: number, overrides: Partial<ResultRow> = {}): ResultRow => ({
  examId,
  userId: 42,
  score: 80,
  grade: null,
  passed: true,
  published: true,
  ...overrides,
});

interface AssignmentRow {
  id: number;
  subjectId: number;
  maxScore: number | null;
}
interface SubmissionRow {
  assignmentId: number;
  userId: number;
  score: number | null;
}

const assignment = (id: number, subjectId: number, maxScore: number | null = 100): AssignmentRow => ({
  id,
  subjectId,
  maxScore,
});
const submission = (assignmentId: number, score: number | null): SubmissionRow => ({
  assignmentId,
  userId: 42,
  score,
});

// buildTranscriptRows selects, in order: subjects, exams, results (only when
// exams exist), assignments, submissions (only when assignments exist).
const queue = (
  subjects: SubjectRow[],
  exams: ExamRow[],
  results: ResultRow[],
  assignments: AssignmentRow[] = [],
  submissions: SubmissionRow[] = [],
) => {
  mocks.selectQueue.push(subjects, exams);
  if (exams.length > 0) mocks.selectQueue.push(results);
  mocks.selectQueue.push(assignments);
  if (assignments.length > 0) mocks.selectQueue.push(submissions);
};

beforeEach(() => {
  mocks.selectQueue.length = 0;
});

describe("buildTranscriptRows", () => {
  it("returns [] when the course has no subjects or no exams", async () => {
    mocks.selectQueue.push([]);
    expect(await buildTranscriptRows(42, 1)).toEqual([]);

    mocks.selectQueue.length = 0;
    mocks.selectQueue.push([subject(1)], []);
    expect(await buildTranscriptRows(42, 1)).toEqual([]);
  });

  it("keeps only the best published attempt per subject", async () => {
    queue(
      [subject(1)],
      [exam(10, 1), exam(11, 1)],
      [result(10, { score: 61 }), result(11, { score: 88 })],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows).toHaveLength(1);
    // 88/100 → B+
    expect(rows[0].grade).toBe("B+");
  });

  it("skips subjects that have no published result", async () => {
    queue([subject(1), subject(2)], [exam(10, 1), exam(20, 2)], [result(20)]);
    const rows = await buildTranscriptRows(42, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].moduleCode).toBe("CGU102");
  });

  it("keeps rows in curriculum order regardless of result order", async () => {
    queue(
      [subject(1, { orderIndex: 1 }), subject(2, { orderIndex: 2 })],
      [exam(10, 1), exam(20, 2)],
      [result(20), result(10)],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows.map((r) => r.moduleCode)).toEqual(["CGU101", "CGU102"]);
  });

  it("parses module code and title from 'CODE — Title' subject titles", async () => {
    queue(
      [subject(1, { title: "CGU201 — Corporate Finance — Advanced" })],
      [exam(10, 1)],
      [result(10)],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0].moduleCode).toBe("CGU201");
    expect(rows[0].moduleTitle).toBe("Corporate Finance — Advanced");
  });

  it("falls back to an em-dash code when the title has no code prefix", async () => {
    queue([subject(1, { title: "Corporate Finance" })], [exam(10, 1)], [result(10)]);
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0].moduleCode).toBe("—");
    expect(rows[0].moduleTitle).toBe("Corporate Finance");
  });

  it("maps credits and year from the subject, defaulting credits to 7.5", async () => {
    queue(
      [
        subject(1, { credits: 10, year: 2 }),
        subject(2, { credits: null, year: 3 }),
      ],
      [exam(10, 1), exam(20, 2)],
      [result(10), result(20)],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0]).toMatchObject({ credits: 10, year: 2 });
    expect(rows[1]).toMatchObject({ credits: 7.5, year: 3 });
  });

  it("uses a stored grade when it is on the official scale", async () => {
    queue([subject(1)], [exam(10, 1)], [result(10, { grade: "A-", score: 50 })]);
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0].grade).toBe("A-");
  });

  it("derives the letter grade from percentage when stored grade is missing or off-scale", async () => {
    queue(
      [subject(1), subject(2)],
      [exam(10, 1, 200), exam(20, 2)],
      [
        // 186/200 = 93% → A, stored grade absent
        result(10, { score: 186 }),
        // stored grade not in GRADE_POINTS → fall back to 65% → D
        result(20, { score: 65, grade: "PASS" }),
      ],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0].grade).toBe("A");
    expect(rows[1].grade).toBe("D");
  });

  it("treats a zero-mark exam as 0% instead of dividing by zero", async () => {
    queue([subject(1)], [exam(10, 1, 0)], [result(10, { score: 5, passed: false })]);
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0].grade).toBe("F");
  });

  it("carries the pass/fail flag through to the row", async () => {
    queue([subject(1)], [exam(10, 1)], [result(10, { score: 40, passed: false })]);
    const rows = await buildTranscriptRows(42, 1);
    expect(rows[0].passed).toBe(false);
  });

  it("derives a grade from the average of graded assignment scores", async () => {
    queue(
      [subject(1)],
      [],
      [],
      [assignment(100, 1), assignment(101, 1)],
      // 90% and 80% → 85% average → B
      [submission(100, 90), submission(101, 80)],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].grade).toBe("B");
    expect(rows[0].passed).toBe(true);
  });

  it("ignores ungraded submissions and subjects with no graded work", async () => {
    queue(
      [subject(1), subject(2)],
      [],
      [],
      [assignment(100, 1), assignment(200, 2)],
      [submission(100, 70), submission(200, null)],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].moduleCode).toBe("CGU101");
  });

  it("uses the best graded attempt per assignment and fails below 60%", async () => {
    queue(
      [subject(1)],
      [],
      [],
      [assignment(100, 1)],
      [submission(100, 40), submission(100, 55)],
    );
    const rows = await buildTranscriptRows(42, 1);
    // best attempt 55% → F → not passed
    expect(rows[0].grade).toBe("F");
    expect(rows[0].passed).toBe(false);
  });

  it("prefers a published exam result over assignment marks for the same subject", async () => {
    queue(
      [subject(1)],
      [exam(10, 1)],
      [result(10, { score: 93 })],
      [assignment(100, 1)],
      [submission(100, 10)],
    );
    const rows = await buildTranscriptRows(42, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].grade).toBe("A");
  });
});
