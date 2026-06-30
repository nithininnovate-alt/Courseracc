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
  subjectTitle: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  grade: string | null;
  passed: boolean;
}

export interface TranscriptData {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseLevel: string;
  certificateNumber: string;
  issuedAt: Date;
  rows: TranscriptRow[];
}

/**
 * Generate an official academic transcript (portrait, tabular).
 */
export async function generateTranscript(data: TranscriptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 56;

  // Header band
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: PRIMARY });
  page.drawText("CENTRAL GLOBAL UNIVERSITY", {
    x: margin,
    y: height - 56,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Office of the Registrar", {
    x: margin,
    y: height - 80,
    size: 11,
    font,
    color: rgb(0.85, 0.89, 0.96),
  });
  page.drawText("TRANSCRIPT", {
    x: width - margin - 135,
    y: height - 62,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const fmtDate = data.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Meta + student
  let y = height - 150;
  page.drawText("STUDENT", { x: margin, y, size: 10, font: fontBold, color: MUTED });
  page.drawText("Issued", { x: width - margin - 220, y, size: 10, font, color: MUTED });
  page.drawText(fmtDate, {
    x: width - margin - 110,
    y,
    size: 10,
    font: fontBold,
    color: BLACK,
  });
  y -= 18;
  page.drawText(data.studentName, { x: margin, y, size: 12, font: fontBold, color: BLACK });
  page.drawText("Transcript No.", {
    x: width - margin - 220,
    y,
    size: 10,
    font,
    color: MUTED,
  });
  page.drawText(data.certificateNumber, {
    x: width - margin - 110,
    y,
    size: 10,
    font: fontBold,
    color: BLACK,
  });
  y -= 16;
  page.drawText(data.studentEmail, { x: margin, y, size: 10, font, color: MUTED });

  y -= 32;
  const infoRows: [string, string][] = [
    ["Programme", data.courseTitle],
    ["Level", data.courseLevel],
  ];
  for (const [label, value] of infoRows) {
    page.drawText(label, { x: margin, y, size: 10, font, color: MUTED });
    page.drawText(value, { x: margin + 110, y, size: 11, font: fontBold, color: BLACK });
    y -= 20;
  }

  // Table header
  y -= 8;
  const colSubject = margin + 6;
  const colExam = margin + 180;
  const colMarks = width - margin - 150;
  const colGrade = width - margin - 80;
  const colOutcome = width - margin - 36;
  page.drawRectangle({
    x: margin,
    y: y - 6,
    width: width - margin * 2,
    height: 24,
    color: rgb(0.95, 0.96, 0.98),
  });
  page.drawText("SUBJECT", { x: colSubject, y, size: 9, font: fontBold, color: PRIMARY });
  page.drawText("EXAM", { x: colExam, y, size: 9, font: fontBold, color: PRIMARY });
  page.drawText("MARKS", { x: colMarks, y, size: 9, font: fontBold, color: PRIMARY });
  page.drawText("GRD", { x: colGrade, y, size: 9, font: fontBold, color: PRIMARY });
  page.drawText("P/F", { x: colOutcome, y, size: 9, font: fontBold, color: PRIMARY });
  y -= 24;

  const truncate = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;

  let totalScore = 0;
  let totalMax = 0;
  let passedCount = 0;
  for (const row of data.rows) {
    if (y < 120) break; // single page guard
    page.drawText(truncate(row.subjectTitle, 28), {
      x: colSubject,
      y,
      size: 9,
      font,
      color: BLACK,
    });
    page.drawText(truncate(row.examTitle, 22), {
      x: colExam,
      y,
      size: 9,
      font,
      color: BLACK,
    });
    page.drawText(`${row.score}/${row.totalMarks}`, {
      x: colMarks,
      y,
      size: 9,
      font,
      color: BLACK,
    });
    page.drawText(row.grade ?? "—", { x: colGrade, y, size: 9, font, color: BLACK });
    page.drawText(row.passed ? "P" : "F", {
      x: colOutcome,
      y,
      size: 9,
      font: fontBold,
      color: row.passed ? rgb(0.13, 0.5, 0.23) : rgb(0.7, 0.16, 0.16),
    });
    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: width - margin, y: y - 6 },
      thickness: 0.5,
      color: LINE,
    });
    totalScore += row.score;
    totalMax += row.totalMarks;
    if (row.passed) passedCount += 1;
    y -= 22;
  }

  if (data.rows.length === 0) {
    page.drawText("No published results on record.", {
      x: colSubject,
      y,
      size: 10,
      font,
      color: MUTED,
    });
    y -= 22;
  }

  // Summary
  y -= 16;
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  page.drawText("Aggregate", { x: margin, y, size: 11, font: fontBold, color: PRIMARY });
  page.drawText(`${totalScore} / ${totalMax}  (${pct}%)`, {
    x: margin + 110,
    y,
    size: 11,
    font: fontBold,
    color: BLACK,
  });
  y -= 18;
  page.drawText("Subjects passed", { x: margin, y, size: 10, font, color: MUTED });
  page.drawText(`${passedCount} / ${data.rows.length}`, {
    x: margin + 110,
    y,
    size: 10,
    font: fontBold,
    color: BLACK,
  });

  // Footer
  page.drawLine({
    start: { x: margin, y: 70 },
    end: { x: width - margin, y: 70 },
    thickness: 1,
    color: LINE,
  });
  page.drawText(
    "This is an official academic transcript issued by Central Global University.",
    { x: margin, y: 54, size: 8, font, color: MUTED },
  );

  return doc.save();
}
