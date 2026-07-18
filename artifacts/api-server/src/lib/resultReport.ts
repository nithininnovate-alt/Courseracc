import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  PRIMARY,
  MUTED,
  BLACK,
  LINE,
  TABLE_BG,
  PASS_GREEN,
  FAIL_RED,
  MARGIN,
  A4_PORTRAIT,
  drawLetterhead,
  drawThemeFooter,
  drawSealedClosing,
  embedBrandImages,
  fitText,
  embedAssetFont,
} from "./pdfTheme";

export interface ResultReportData {
  studentName: string;
  studentId?: string | null;
  studentEmail: string;
  examTitle: string;
  subjectTitle: string;
  courseTitle: string;
  score: number;
  totalMarks: number;
  grade?: string | null;
  passed: boolean;
  remarks?: string | null;
  publishedAt: Date;
}

const PASS = PASS_GREEN;
const FAIL = FAIL_RED;

/**
 * Generate a one-page PDF result slip and return the raw bytes.
 */
export async function generateResultReport(
  data: ResultReportData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const images = await embedBrandImages(doc);
  const page = doc.addPage(A4_PORTRAIT);
  const { width } = page.getSize();

  const font = await embedAssetFont(doc, "font-plexsans.ttf");
  const fontBold = await embedAssetFont(doc, "font-poppins-semibold.ttf");
  const fonts = { regular: font, bold: fontBold };

  const margin = MARGIN;

  const contentTop = drawLetterhead(
    page,
    fonts,
    {
      office: "Office of the Registrar",
      docLabel: "RESULT SLIP",
    },
    images,
  );

  // Meta block (right aligned)
  let y = contentTop;
  const fmtDate = data.publishedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const metaRows: [string, string][] = [["Published", fmtDate]];
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: width - margin - 220, y, size: 10, font, color: MUTED });
    page.drawText(value, { x: width - margin - 110, y, size: 10, font: fontBold, color: BLACK });
    y -= 16;
  }

  // Student block
  y = contentTop;
  page.drawText("STUDENT", { x: margin, y, size: 10, font: fontBold, color: MUTED });
  y -= 18;
  page.drawText(data.studentName, { x: margin, y, size: 12, font: fontBold, color: BLACK });
  y -= 16;
  if (data.studentId) {
    page.drawText(`Student ID: ${data.studentId}`, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: BLACK,
    });
    y -= 14;
  }
  page.drawText(data.studentEmail, { x: margin, y, size: 10, font, color: MUTED });

  // Course / subject
  y = contentTop - 100;
  const infoRows: [string, string][] = [
    ["Course", data.courseTitle],
    ["Subject", data.subjectTitle],
    ["Examination", data.examTitle],
  ];
  for (const [label, value] of infoRows) {
    page.drawText(label, { x: margin, y, size: 10, font, color: MUTED });
    page.drawText(fitText(value, fontBold, 11, width - margin * 2 - 110), {
      x: margin + 110,
      y,
      size: 11,
      font: fontBold,
      color: BLACK,
    });
    y -= 22;
  }

  // Score table
  y -= 10;
  page.drawRectangle({ x: margin, y: y - 6, width: width - margin * 2, height: 26, color: TABLE_BG });
  page.drawText("ASSESSMENT", { x: margin + 10, y, size: 10, font: fontBold, color: PRIMARY });
  page.drawText("MARKS", { x: width - margin - 120, y, size: 10, font: fontBold, color: PRIMARY });

  y -= 34;
  page.drawText(fitText(data.examTitle, font, 11, width - margin * 2 - 140), {
    x: margin + 10,
    y,
    size: 11,
    font,
    color: BLACK,
  });
  page.drawText(`${data.score} / ${data.totalMarks}`, {
    x: width - margin - 120,
    y,
    size: 11,
    font,
    color: BLACK,
  });

  y -= 18;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });

  // Grade + outcome
  y -= 30;
  page.drawText("Grade", { x: margin, y, size: 11, font, color: MUTED });
  page.drawText(data.grade ?? "—", { x: margin + 110, y, size: 12, font: fontBold, color: BLACK });

  y -= 24;
  page.drawText("Outcome", { x: margin, y, size: 11, font, color: MUTED });
  page.drawText(data.passed ? "PASS" : "FAIL", {
    x: margin + 110,
    y,
    size: 13,
    font: fontBold,
    color: data.passed ? PASS : FAIL,
  });

  if (data.remarks) {
    y -= 36;
    page.drawText("REMARKS", { x: margin, y, size: 10, font: fontBold, color: MUTED });
    y -= 16;
    const remarks = data.remarks.slice(0, 400);
    page.drawText(remarks, { x: margin, y, size: 10, font, color: BLACK, maxWidth: width - margin * 2, lineHeight: 14 });
  }

  // Sealed closing (registrar seal + signature)
  y -= 44;
  drawSealedClosing(page, fonts, images, { x: margin, topY: y });

  // Footer
  drawThemeFooter(page, fonts, {
    left: "Official Result Slip | Central Global University",
  });

  return doc.save();
}
