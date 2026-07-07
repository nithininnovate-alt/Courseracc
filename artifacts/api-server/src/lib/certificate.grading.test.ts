import { describe, expect, it } from "vitest";
import {
  GRADE_POINTS,
  computeTranscriptSummary,
  letterGradeFromPercent,
  type TranscriptRow,
} from "./certificate";

const row = (overrides: Partial<TranscriptRow>): TranscriptRow => ({
  moduleCode: "CGU101",
  moduleTitle: "Module",
  credits: 7.5,
  year: 1,
  grade: "A",
  passed: true,
  ...overrides,
});

describe("letterGradeFromPercent", () => {
  it("maps each band boundary to the official CGU letter grade", () => {
    const cases: Array<[number, string]> = [
      [100, "A"],
      [93, "A"],
      [92.9, "A-"],
      [90, "A-"],
      [89.9, "B+"],
      [87, "B+"],
      [86.9, "B"],
      [83, "B"],
      [82.9, "B-"],
      [80, "B-"],
      [79.9, "C+"],
      [77, "C+"],
      [76.9, "C"],
      [70, "C"],
      [69.9, "D"],
      [60, "D"],
      [59.9, "F"],
      [0, "F"],
    ];
    for (const [pct, expected] of cases) {
      expect(letterGradeFromPercent(pct), `${pct}%`).toBe(expected);
    }
  });

  it("only ever returns grades present in the GRADE_POINTS key", () => {
    for (let pct = 0; pct <= 100; pct += 0.5) {
      expect(GRADE_POINTS[letterGradeFromPercent(pct)]).toBeDefined();
    }
  });
});

describe("computeTranscriptSummary (GPA weighting)", () => {
  it("computes a credit-weighted GPA, not a plain average", () => {
    // A (4.0) worth 10 credits + F (0.0) worth 2 credits:
    // weighted = (4*10 + 0*2) / 12 = 3.333..., plain average would be 2.0
    const summary = computeTranscriptSummary([
      row({ grade: "A", credits: 10 }),
      row({ grade: "F", credits: 2, passed: false }),
    ]);
    expect(summary.gpa).toBeCloseTo(40 / 12, 10);
    expect(summary.weightedPoints).toBeCloseTo(40, 10);
    expect(summary.gradedCredits).toBe(12);
  });

  it("uses the official GRADE_POINTS scale for every letter grade", () => {
    for (const [grade, points] of Object.entries(GRADE_POINTS)) {
      const summary = computeTranscriptSummary([row({ grade, credits: 7.5 })]);
      expect(summary.gpa, grade).toBeCloseTo(points, 10);
    }
  });

  it("counts total credits for all rows but earned credits only for passes", () => {
    const summary = computeTranscriptSummary([
      row({ grade: "B", credits: 7.5, passed: true }),
      row({ grade: "F", credits: 7.5, passed: false }),
      row({ grade: "C", credits: 5, passed: true }),
    ]);
    expect(summary.totalCredits).toBe(20);
    expect(summary.earnedCredits).toBe(12.5);
  });

  it("failed modules still drag the GPA down (F = 0.00 is graded)", () => {
    const summary = computeTranscriptSummary([
      row({ grade: "A", credits: 7.5 }),
      row({ grade: "F", credits: 7.5, passed: false }),
    ]);
    expect(summary.gpa).toBeCloseTo(2.0, 10);
  });

  it("excludes unrecognized grades from GPA but keeps their credits in totals", () => {
    const summary = computeTranscriptSummary([
      row({ grade: "B", credits: 7.5 }),
      row({ grade: "N/A", credits: 7.5 }),
    ]);
    expect(summary.gradedCredits).toBe(7.5);
    expect(summary.totalCredits).toBe(15);
    expect(summary.gpa).toBeCloseTo(3.0, 10);
  });

  it("returns 0.00 GPA (not NaN) for an empty transcript", () => {
    const summary = computeTranscriptSummary([]);
    expect(summary.gpa).toBe(0);
    expect(summary.totalCredits).toBe(0);
    expect(summary.earnedCredits).toBe(0);
  });

  it("matches a realistic full-programme GPA computation", () => {
    // 4 modules: A(7.5), B+(7.5), C(7.5), A-(7.5)
    // = (4.0 + 3.33 + 2.0 + 3.67) * 7.5 / 30 = 3.25
    const summary = computeTranscriptSummary([
      row({ grade: "A" }),
      row({ grade: "B+" }),
      row({ grade: "C" }),
      row({ grade: "A-" }),
    ]);
    expect(summary.gpa).toBeCloseTo((4.0 + 3.33 + 2.0 + 3.67) / 4, 10);
  });
});
