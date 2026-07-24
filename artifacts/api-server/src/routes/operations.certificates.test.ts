import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";

// Shared, mutable mock state referenced from the hoisted vi.mock factories.
const mocks = vi.hoisted(() => ({
  // Values returned, in order, by successive `db.select()...` chains
  // (both plain db selects and selects inside the transaction).
  selectQueue: [] as unknown[],
  // Records lock acquisition (`.for("update")`) on select chains.
  lockedSelects: 0,
  // Rows returned by insert().returning() calls, in order.
  insertQueue: [] as unknown[],
  insertCalls: 0,
  // Rows returned by update().returning() calls, in order.
  updateQueue: [] as unknown[],
  // Called when a transaction begins; lets a test mutate the queues to
  // simulate a concurrent resubmission committing before our locked re-check.
  onTransactionStart: null as (() => void) | null,
}));

vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  asc: () => ({}),
  desc: () => ({}),
  inArray: () => ({}),
  sql: () => ({}),
}));

vi.mock("@workspace/db", () => {
  const makeSelectChain = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ["from", "where", "limit", "innerJoin", "leftJoin", "orderBy"]) {
      chain[method] = () => chain;
    }
    chain.for = () => {
      mocks.lockedSelects += 1;
      return chain;
    };
    (chain as { then: unknown }).then = (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(mocks.selectQueue.shift() ?? []).then(resolve, reject);
    return chain;
  };
  const executor = {
    select: () => makeSelectChain(),
    insert: () => ({
      values: () => ({
        returning: () => {
          mocks.insertCalls += 1;
          return Promise.resolve(mocks.insertQueue.shift() ?? []);
        },
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve(mocks.updateQueue.shift() ?? []),
        }),
      }),
    }),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      mocks.onTransactionStart?.();
      return fn(executor);
    },
  };
  return {
    db: executor,
    paymentsTable: {},
    paymentPlansTable: {},
    coursesTable: {},
    usersTable: {},
    certificatesTable: {},
    emailLogsTable: {},
    courierTrackingTable: {},
    enrollmentsTable: {},
    subjectsTable: {},
    assignmentsTable: {},
    submissionsTable: {},
    examsTable: {},
    resultsTable: {},
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
vi.mock("../lib/certificate", () => ({
  generateDegreeCertificate: vi.fn(),
  generateTranscript: vi.fn(),
  GRADE_POINTS: {},
  letterGradeFromPercent: vi.fn(),
}));
const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/email", () => ({
  sendEmail: sendEmailMock,
  resendEmailLog: vi.fn(),
  buildCertificateIssued: vi.fn(() => ({ subject: "s", html: "h" })),
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

import router from "./operations";

async function postCertificates(body: unknown): Promise<{ status: number; json: any }> {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const resp = await fetch(`http://127.0.0.1:${port}/api/certificates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: resp.status, json: await resp.json() };
  } finally {
    server.close();
  }
}

const student = { id: 7, email: "s@x.com", firstName: "Stu", lastName: "Dent" };
const course = { id: 3, title: "BBA" };
const approvedRow = {
  assignmentTitle: "Case Study",
  year: 1,
  submissionStatus: "submitted",
  approvalStatus: "approved",
};
const pendingRow = { ...approvedRow, approvalStatus: "pending" };

// Selects issued by POST /certificates, in order:
// 1 student, 2 course, 3 completed enrollment, then inside the transaction:
// 4 course assignment ids, 5 FOR UPDATE lock on submissions,
// 6 approval-progress rows, 7 existing issued certificate.
function queuePreTransactionSelects() {
  mocks.selectQueue.push([student], [course], [{ id: 1 }]);
}

beforeEach(() => {
  mocks.selectQueue.length = 0;
  mocks.insertQueue.length = 0;
  mocks.updateQueue.length = 0;
  mocks.insertCalls = 0;
  mocks.lockedSelects = 0;
  mocks.onTransactionStart = null;
  sendEmailMock.mockClear();
});

describe("POST /certificates issuance vs concurrent resubmission", () => {
  it("issues a certificate when the locked re-check still shows approval", async () => {
    queuePreTransactionSelects();
    mocks.selectQueue.push(
      [{ id: 10 }], // course assignment ids
      [{ id: 100 }], // FOR UPDATE lock rows
      [approvedRow], // re-checked progress inside the transaction
      [], // no existing issued certificate
    );
    const created = { id: 55, issuedAt: new Date("2026-07-24"), userId: 7, courseId: 3 };
    mocks.insertQueue.push([created]);
    mocks.updateQueue.push([
      { ...created, certificateNumber: "CGU-DEG-2026-00055" },
    ]);

    const res = await postCertificates({ userId: 7, courseId: 3, type: "degree" });
    expect(res.status).toBe(201);
    expect(res.json.certificateNumber).toBe("CGU-DEG-2026-00055");
    // The submissions were locked before the re-check ran.
    expect(mocks.lockedSelects).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("refuses issuance when a resubmission lands just before the locked re-check", async () => {
    queuePreTransactionSelects();
    // Simulate the race: the student's resubmission (approval reset to
    // pending) commits while issuance waits on the row lock — so the
    // re-check inside the transaction now sees a pending approval.
    mocks.onTransactionStart = () => {
      mocks.selectQueue.push(
        [{ id: 10 }], // course assignment ids
        [{ id: 100 }], // FOR UPDATE lock rows (resubmitter committed first)
        [pendingRow], // re-checked progress: approval was reset
      );
    };

    const res = await postCertificates({ userId: 7, courseId: 3, type: "degree" });
    expect(res.status).toBe(422);
    expect(res.json.error).toMatch(/not eligible/);
    // No certificate row was ever inserted and no email sent.
    expect(mocks.insertCalls).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("refuses a duplicate when another issuance won the race inside the transaction", async () => {
    queuePreTransactionSelects();
    mocks.selectQueue.push(
      [{ id: 10 }],
      [{ id: 100 }],
      [approvedRow],
      [{ id: 54 }], // an issued certificate already exists (concurrent winner)
    );

    const res = await postCertificates({ userId: 7, courseId: 3, type: "degree" });
    expect(res.status).toBe(409);
    expect(mocks.insertCalls).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
