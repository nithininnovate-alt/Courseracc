import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression tests for userCanAccessMaterialObject when one object URL is
// shared by materials across multiple courses (e.g. the sample lecture video).
// The old implementation checked only ONE arbitrary matching material row, so
// students were denied (403) whenever the arbitrary row belonged to a course
// they had not unlocked, even though they had full access via another course.

const mocks = vi.hoisted(() => ({
  // Values resolved, in order, by successive db.select()/db.selectDistinct()
  // query chains inside access.ts.
  selectQueue: [] as unknown[],
}));

vi.mock("@workspace/db", () => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    for (const method of [
      "from",
      "where",
      "limit",
      "innerJoin",
      "orderBy",
      "groupBy",
    ]) {
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
    selectDistinct: () => makeChain(),
  };
  return {
    db,
    coursesTable: { id: {}, price: {} },
    subjectsTable: { id: {}, courseId: {}, year: {} },
    studyMaterialsTable: { url: {}, subjectId: {} },
    paymentsTable: { id: {}, userId: {}, courseId: {}, status: {} },
    paymentPlansTable: {},
    enrollmentsTable: { id: {}, userId: {}, courseId: {} },
    usersTable: {},
  };
});

vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  asc: () => ({}),
  desc: () => ({}),
  inArray: () => ({}),
  sql: () => ({}),
}));

const { userCanAccessMaterialObject } = await import("./access");

beforeEach(() => {
  mocks.selectQueue.length = 0;
});

describe("userCanAccessMaterialObject with shared object URLs", () => {
  it("denies access when the URL maps to no study material", async () => {
    mocks.selectQueue.push([]); // selectDistinct: no matching materials

    await expect(userCanAccessMaterialObject(7, "/objects/x.mp4")).resolves.toBe(
      false,
    );
  });

  it("grants access when ANY course sharing the URL is accessible", async () => {
    mocks.selectQueue.push(
      // selectDistinct materials→subjects: URL shared by two courses.
      [
        { courseId: 1, year: 1 },
        { courseId: 2, year: 1 },
      ],
      // getCourseAccess(course 1): paid course, no completed payment → denied.
      [{ id: 1, price: "100" }],
      [], // no completed payment row
      // getCourseAccess(course 2): free course → access granted.
      [{ id: 2, price: "0" }],
      [], // payment row lookup (irrelevant for free course)
      // isYearUnlocked → getUnlockedYears(course 2):
      [{ year: 1 }], // distinct years
      [{ price: "0" }], // free course → all years unlocked
    );

    await expect(
      userCanAccessMaterialObject(7, "/objects/videos/sample-lecture.mp4"),
    ).resolves.toBe(true);
  });

  it("denies access when NO course sharing the URL is accessible", async () => {
    mocks.selectQueue.push(
      [
        { courseId: 1, year: 1 },
        { courseId: 2, year: 2 },
      ],
      // getCourseAccess(course 1): paid, unpaid.
      [{ id: 1, price: "100" }],
      [],
      // getCourseAccess(course 2): paid, unpaid.
      [{ id: 2, price: "250" }],
      [],
    );

    await expect(
      userCanAccessMaterialObject(7, "/objects/videos/sample-lecture.mp4"),
    ).resolves.toBe(false);
  });
});
