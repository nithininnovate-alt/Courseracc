import { beforeEach, describe, expect, it, vi } from "vitest";

// Shared, mutable mock state referenced from the hoisted vi.mock factories.
const mocks = vi.hoisted(() => ({
  selectQueue: [] as unknown[],
}));

// drizzle helpers only build predicates the mocked db ignores.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  asc: () => ({}),
  desc: () => ({}),
  inArray: () => ({}),
  sql: vi.fn(),
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
    applicationsTable: {},
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
    discountCodesTable: {},
  };
});

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
vi.mock("../lib/bog", () => ({
  isBogConfigured: () => false,
  createBogOrder: vi.fn(),
  getBogPaymentDetails: vi.fn(),
  verifyBogCallbackSignature: vi.fn(),
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
vi.mock("../lib/studentId", () => ({ ensureStudentId: vi.fn() }));
vi.mock("../lib/discounts", () => ({ resolveDiscount: vi.fn() }));
vi.mock("../lib/certificate", () => ({
  generateDegreeCertificate: vi.fn(),
  generateTranscript: vi.fn(),
  GRADE_POINTS: {},
  letterGradeFromPercent: vi.fn(),
}));

import { requireApprovedApplication } from "./operations";

describe("requireApprovedApplication", () => {
  beforeEach(() => {
    mocks.selectQueue = [];
  });

  it("returns null when the user has an approved application", async () => {
    // db.select returns an approved application row
    mocks.selectQueue.push([{ id: 7 }]);
    const result = await requireApprovedApplication(42);
    expect(result).toBeNull();
  });

  it("returns an error string when the user has no approved application", async () => {
    // db.select returns empty array — no approved application
    mocks.selectQueue.push([]);
    const result = await requireApprovedApplication(99);
    expect(result).not.toBeNull();
    expect(result).toMatch(/application must be approved/i);
  });

  it("error message mentions registrar office", async () => {
    mocks.selectQueue.push([]);
    const result = await requireApprovedApplication(99);
    expect(result).toMatch(/registrar/i);
  });
});
