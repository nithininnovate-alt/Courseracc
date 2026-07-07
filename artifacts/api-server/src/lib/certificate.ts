import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

const PRIMARY = rgb(0.12, 0.25, 0.46);
const GOLD = rgb(0.72, 0.55, 0.21);
const MUTED = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0.1, 0.1, 0.1);
const LINE = rgb(0.85, 0.85, 0.85);

function centerText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color = BLACK,
) {
  const width = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
}

export interface DegreeCertificateData {
  studentName: string;
  courseTitle: string;
  courseLevel: string;
  certificateNumber: string;
  issuedAt: Date;
}

/**
 * Generate an ornate landscape degree/completion certificate.
 */
export async function generateDegreeCertificate(
  data: DegreeCertificateData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]); // A4 landscape
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // Outer + inner decorative borders
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: PRIMARY,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: GOLD,
    borderWidth: 1,
  });

  // Header
  centerText(page, "CENTRAL GLOBAL UNIVERSITY", height - 92, 28, serifBold, PRIMARY);
  centerText(page, "Office of the Registrar", height - 116, 12, font, MUTED);
  page.drawLine({
    start: { x: width / 2 - 120, y: height - 132 },
    end: { x: width / 2 + 120, y: height - 132 },
    thickness: 1,
    color: GOLD,
  });

  centerText(page, "CERTIFICATE OF COMPLETION", height - 178, 20, fontBold, BLACK);

  centerText(page, "This is to certify that", height - 224, 14, fontItalic, MUTED);

  // Recipient name
  centerText(page, data.studentName, height - 268, 32, serifBold, PRIMARY);
  page.drawLine({
    start: { x: width / 2 - 200, y: height - 282 },
    end: { x: width / 2 + 200, y: height - 282 },
    thickness: 1,
    color: LINE,
  });

  centerText(
    page,
    "has successfully completed all requirements for the",
    height - 320,
    14,
    fontItalic,
    MUTED,
  );

  centerText(page, data.courseTitle, height - 356, 22, serifBold, BLACK);
  centerText(
    page,
    `(${data.courseLevel.toUpperCase()} PROGRAMME)`,
    height - 378,
    11,
    font,
    MUTED,
  );

  const fmtDate = data.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Footer: certificate number, date, signatures
  const baseY = 96;
  page.drawText("Certificate No.", { x: 80, y: baseY + 16, size: 9, font, color: MUTED });
  page.drawText(data.certificateNumber, {
    x: 80,
    y: baseY,
    size: 11,
    font: fontBold,
    color: BLACK,
  });

  page.drawText("Date of Issue", {
    x: width - 220,
    y: baseY + 16,
    size: 9,
    font,
    color: MUTED,
  });
  page.drawText(fmtDate, { x: width - 220, y: baseY, size: 11, font: fontBold, color: BLACK });

  // Registrar signature line (center)
  page.drawLine({
    start: { x: width / 2 - 90, y: baseY + 14 },
    end: { x: width / 2 + 90, y: baseY + 14 },
    thickness: 1,
    color: BLACK,
  });
  centerText(page, "Registrar", baseY, 10, font, MUTED);

  centerText(
    page,
    "Verify this certificate at registrar.cgu.edu using the certificate number above.",
    50,
    8,
    serif,
    MUTED,
  );

  return doc.save();
}

export interface TranscriptRow {
  moduleCode: string;
  moduleTitle: string;
  credits: number;
  year: number;
  grade: string; // letter grade, e.g. "A", "B+"
  passed: boolean;
}

export interface TranscriptData {
  studentName: string;
  studentId: string;
  degreeAwarded: string;
  certificateNumber: string; // Transcript Ref
  enrollmentDate: Date | null;
  completionDate: Date | null;
  issuedAt: Date;
  rows: TranscriptRow[];
}

/** Official CGU grading key: letter grade → grade points (4.00 scale). */
export const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  "A-": 3.67,
  "B+": 3.33,
  B: 3.0,
  "B-": 2.67,
  "C+": 2.33,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};

export interface TranscriptSummary {
  totalCredits: number;
  earnedCredits: number;
  gradedCredits: number;
  weightedPoints: number;
  gpa: number;
}

/** Credit-weighted GPA + credit totals for a set of transcript rows. */
export function computeTranscriptSummary(rows: TranscriptRow[]): TranscriptSummary {
  let totalCredits = 0;
  let earnedCredits = 0;
  let weightedPoints = 0;
  let gradedCredits = 0;
  for (const row of rows) {
    totalCredits += row.credits;
    if (row.passed) earnedCredits += row.credits;
    const points = GRADE_POINTS[row.grade];
    if (points !== undefined) {
      weightedPoints += points * row.credits;
      gradedCredits += row.credits;
    }
  }
  const gpa = gradedCredits > 0 ? weightedPoints / gradedCredits : 0;
  return { totalCredits, earnedCredits, gradedCredits, weightedPoints, gpa };
}

/** Derive a letter grade from a percentage score. */
export function letterGradeFromPercent(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

/**
 * Generate an official academic transcript (official registrar format).
 */
export async function generateTranscript(data: TranscriptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const margin = 56;

  const drawHeader = (page: PDFPage) => {
    page.drawRectangle({ x: 0, y: PAGE_H - 110, width: PAGE_W, height: 110, color: PRIMARY });
    page.drawText("CENTRAL GLOBAL UNIVERSITY", {
      x: margin,
      y: PAGE_H - 42,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("OFFICE OF THE REGISTRAR & ACADEMIC RECORDS", {
      x: margin,
      y: PAGE_H - 60,
      size: 10,
      font: fontBold,
      color: rgb(0.85, 0.89, 0.96),
    });
    page.drawText(
      "Campus & Administrative Office: Georgia | Verification Portal: verification.cgu.edu.ge",
      { x: margin, y: PAGE_H - 76, size: 8.5, font, color: rgb(0.85, 0.89, 0.96) },
    );
    page.drawText("OFFICIAL ACADEMIC TRANSCRIPT", {
      x: PAGE_W - margin - fontBold.widthOfTextAtSize("OFFICIAL ACADEMIC TRANSCRIPT", 11),
      y: PAGE_H - 96,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  };

  const drawPageFooter = (page: PDFPage) => {
    page.drawLine({
      start: { x: margin, y: 56 },
      end: { x: PAGE_W - margin, y: 56 },
      thickness: 0.75,
      color: LINE,
    });
    page.drawText(
      "This is an official academic transcript issued by Central Global University. Verify at verification.cgu.edu.ge",
      { x: margin, y: 42, size: 8, font, color: MUTED },
    );
  };

  const newPage = (): { page: PDFPage; y: number } => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    drawHeader(page);
    drawPageFooter(page);
    return { page, y: PAGE_H - 148 };
  };

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "In Progress";

  let { page, y } = newPage();

  // Student information block
  const info: [string, string][] = [
    ["Student Name", data.studentName],
    ["Student ID", data.studentId],
    ["Degree Awarded", data.degreeAwarded],
    ["Transcript Ref", data.certificateNumber],
    ["Enrollment Date", fmt(data.enrollmentDate)],
    ["Completion Date", fmt(data.completionDate)],
    ["Date of Issue", fmt(data.issuedAt)],
  ];
  for (const [label, value] of info) {
    page.drawText(label.toUpperCase(), { x: margin, y, size: 8, font: fontBold, color: MUTED });
    page.drawText(value, { x: margin + 130, y, size: 9.5, font: fontBold, color: BLACK });
    y -= 16;
  }
  y -= 12;

  // Table columns
  const colCode = margin + 4;
  const colTitle = margin + 90;
  const colCredits = PAGE_W - margin - 170;
  const colGrade = PAGE_W - margin - 105;
  const colStatus = PAGE_W - margin - 55;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 6,
      width: PAGE_W - margin * 2,
      height: 22,
      color: rgb(0.95, 0.96, 0.98),
    });
    page.drawText("MODULE CODE", { x: colCode, y, size: 8.5, font: fontBold, color: PRIMARY });
    page.drawText("MODULE TITLE", { x: colTitle, y, size: 8.5, font: fontBold, color: PRIMARY });
    page.drawText("CREDITS", { x: colCredits, y, size: 8.5, font: fontBold, color: PRIMARY });
    page.drawText("GRADE", { x: colGrade, y, size: 8.5, font: fontBold, color: PRIMARY });
    page.drawText("STATUS", { x: colStatus, y, size: 8.5, font: fontBold, color: PRIMARY });
    y -= 24;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 90) {
      ({ page, y } = newPage());
      drawTableHeader();
    }
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;

  drawTableHeader();

  const years = [...new Set(data.rows.map((r) => r.year))].sort((a, b) => a - b);
  const ordinal = ["FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH"];
  const { totalCredits, earnedCredits, gpa } = computeTranscriptSummary(data.rows);

  for (const yr of years) {
    ensureSpace(40);
    page.drawText(`${ordinal[yr - 1] ?? `YEAR ${yr}`} ACADEMIC YEAR`, {
      x: colCode,
      y,
      size: 9,
      font: fontBold,
      color: GOLD,
    });
    y -= 20;
    for (const row of data.rows.filter((r) => r.year === yr)) {
      ensureSpace(22);
      page.drawText(row.moduleCode, { x: colCode, y, size: 9, font: fontBold, color: BLACK });
      page.drawText(truncate(row.moduleTitle, 52), { x: colTitle, y, size: 9, font, color: BLACK });
      page.drawText(String(row.credits), { x: colCredits, y, size: 9, font, color: BLACK });
      page.drawText(row.grade, { x: colGrade, y, size: 9, font: fontBold, color: BLACK });
      page.drawText(row.passed ? "Pass" : "Fail", {
        x: colStatus,
        y,
        size: 9,
        font: fontBold,
        color: row.passed ? rgb(0.13, 0.5, 0.23) : rgb(0.7, 0.16, 0.16),
      });
      page.drawLine({
        start: { x: margin, y: y - 6 },
        end: { x: PAGE_W - margin, y: y - 6 },
        thickness: 0.5,
        color: LINE,
      });
      y -= 20;
    }
    y -= 6;
  }

  if (data.rows.length === 0) {
    page.drawText("No published results on record.", {
      x: colCode,
      y,
      size: 10,
      font,
      color: MUTED,
    });
    y -= 24;
  }

  // Totals + GPA
  ensureSpace(120);
  y -= 8;
  page.drawRectangle({
    x: margin,
    y: y - 30,
    width: PAGE_W - margin * 2,
    height: 44,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: LINE,
    borderWidth: 0.5,
  });
  page.drawText("TOTAL CREDITS EARNED", { x: margin + 10, y, size: 8.5, font: fontBold, color: MUTED });
  page.drawText(`${earnedCredits} / ${totalCredits} ECTS`, {
    x: margin + 10,
    y: y - 16,
    size: 11,
    font: fontBold,
    color: BLACK,
  });
  page.drawText("CUMULATIVE GPA", { x: PAGE_W / 2 + 10, y, size: 8.5, font: fontBold, color: MUTED });
  page.drawText(`${gpa.toFixed(2)} / 4.00`, {
    x: PAGE_W / 2 + 10,
    y: y - 16,
    size: 11,
    font: fontBold,
    color: BLACK,
  });
  y -= 56;

  // Grading key
  ensureSpace(60);
  page.drawText("GRADING KEY", { x: margin, y, size: 9, font: fontBold, color: PRIMARY });
  y -= 14;
  const key =
    "A = 4.00 | A- = 3.67 | B+ = 3.33 | B = 3.00 | B- = 2.67 | C+ = 2.33 | C = 2.00 | D = 1.00 | F = 0.00";
  page.drawText(key, { x: margin, y, size: 8.5, font, color: BLACK });
  y -= 40;

  // Registrar signature
  ensureSpace(60);
  page.drawLine({
    start: { x: margin, y: y + 12 },
    end: { x: margin + 180, y: y + 12 },
    thickness: 1,
    color: BLACK,
  });
  page.drawText("Office of the Registrar", { x: margin, y, size: 9.5, font: fontBold, color: BLACK });
  page.drawText("Central Global University, Georgia Office", {
    x: margin,
    y: y - 13,
    size: 8.5,
    font,
    color: MUTED,
  });

  return doc.save();
}
