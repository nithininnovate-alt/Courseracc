import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { resolveProgramInfo } from "./programInfo";

export type EnrollmentLetterValidator = "ieac" | "eahea";

export interface EnrollmentLetterData {
  studentName: string;
  programName: string;
  userId: number;
  enrolledAt: Date;
  validator: EnrollmentLetterValidator;
}

const PRIMARY = rgb(0.12, 0.25, 0.46);
const MUTED = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0.1, 0.1, 0.1);
const LINE = rgb(0.85, 0.85, 0.85);
const TABLE_BG = rgb(0.95, 0.96, 0.98);
const GREEN = rgb(0.13, 0.5, 0.23);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

const VALIDATOR_INFO: Record<
  EnrollmentLetterValidator,
  { name: string; refSuffix: string; paragraph: string }
> = {
  ieac: {
    name: "International Education Accreditation Council (IEAC)",
    refSuffix: "V2",
    paragraph:
      "Central Global University is fully accredited by the International Education Accreditation Council (IEAC). The curriculum delivered within this program strictly adheres to global corporate benchmarks, ensuring quality management standards, curriculum integrity, and international transcript mobility for professional avenues.",
  },
  eahea: {
    name: "European Agency for Higher Education Accreditation (EAHEA)",
    refSuffix: "V3",
    paragraph:
      "Central Global University is fully accredited by the European Agency for Higher Education Accreditation (EAHEA) and has been awarded a 3-Star Quality Rating. The curriculum delivered within this program strictly adheres to European Higher Education Area (EHEA) standards, ensuring institutional quality governance, rigorous academic standards, and comprehensive student support frameworks.",
  },
};

/**
 * Generate the official two-page CGU Student Enrollment Record letter
 * in either the IEAC (V2) or EAHEA (V3) validator variant.
 */
export async function generateEnrollmentLetter(
  data: EnrollmentLetterData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const program = resolveProgramInfo(data.programName);
  const validator = VALIDATOR_INFO[data.validator];
  const year = data.enrolledAt.getFullYear();
  const studentId = `CGU-${year}-${program.code}-${String(data.userId).padStart(4, "0")}`;
  const letterRef = `CGU/ER/${new Date().getFullYear()}/${validator.refSuffix}`;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const newPage = (): { page: PDFPage; y: number } => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    drawHeader(page, fonts);
    drawFooter(page, fonts);
    return { page, y: PAGE_H - 148 };
  };

  // ---------- Page 1 ----------
  let { page, y } = newPage();

  page.drawText("STUDENT ENROLLMENT RECORD", {
    x: MARGIN,
    y,
    size: 14,
    font: fonts.bold,
    color: PRIMARY,
  });
  drawRight(page, fonts.regular, `Date of Issuance: ${today}`, y, 10, BLACK);
  y -= 18;
  page.drawText(data.studentName, { x: MARGIN, y, size: 11, font: fonts.bold, color: BLACK });
  drawRight(page, fonts.regular, `Letter Reference: ${letterRef}`, y, 10, BLACK);
  y -= 16;
  page.drawText(`Student ID: ${studentId}`, {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.regular,
    color: BLACK,
  });
  drawRight(page, fonts.bold, "ACTIVE & CONFIRMED", y, 10, GREEN);

  y -= 36;
  page.drawText("CONFIRMATION OF ACADEMIC ENROLLMENT", {
    x: MARGIN,
    y,
    size: 12,
    font: fonts.bold,
    color: PRIMARY,
  });
  y -= 24;
  page.drawText("To Whom It May Concern,", {
    x: MARGIN,
    y,
    size: 10.5,
    font: fonts.regular,
    color: BLACK,
  });
  y -= 20;

  const paras = [
    "This official letter serves to formally certify and confirm that the above-named student is duly matriculated and actively enrolled as a regular student at Central Global University (CGU), pursuing academic coursework under the jurisdiction of the Office of the Registrar.",
    `The student has successfully completed all baseline institutional admissions criteria, cleared primary structural program benchmarks, and is officially registered in the professional track detailed below:`,
  ];
  for (const p of paras) {
    y = drawWrapped(page, fonts.regular, p, MARGIN, y, 10.5, BLACK);
    y -= 10;
  }

  // Details table
  y -= 4;
  const rows: [string, string][] = [
    ["Official Degree Track", data.programName],
    ["Standard Program Duration", program.durationYears],
    ["Total Curriculum Credits", program.credits.replace("Semester Credit Hours", "Credit Hours")],
    ["Medium of Education", "English"],
    ["Current Academic Status", "Matriculated / Fully Enrolled Student"],
    ["Institutional Validator", validator.name],
  ];
  const rowH = 28;
  const labelW = 200;
  for (const [label, value] of rows) {
    page.drawRectangle({
      x: MARGIN,
      y: y - rowH + 10,
      width: PAGE_W - MARGIN * 2,
      height: rowH,
      color: TABLE_BG,
      borderColor: LINE,
      borderWidth: 0.5,
    });
    page.drawText(label, { x: MARGIN + 10, y: y - 6, size: 10, font: fonts.bold, color: PRIMARY });
    drawWrapped(page, fonts.regular, value, MARGIN + labelW, y - 6, 9.5, BLACK, PAGE_W - MARGIN - 10 - (MARGIN + labelW));
    y -= rowH;
  }

  y -= 24;
  y = drawWrapped(page, fonts.regular, validator.paragraph, MARGIN, y, 10.5, BLACK);

  // ---------- Page 2 ----------
  ({ page, y } = newPage());

  y = drawWrapped(
    page,
    fonts.regular,
    "This verification statement has been generated directly from the permanent registry archives of Central Global University at the student's explicit request for administrative, corporate, or external structural documentation needs.",
    MARGIN,
    y,
    10.5,
    BLACK,
  );

  y -= 24;
  y = drawWrapped(
    page,
    fonts.regular,
    "Attested and signed under the authority of the university administration:",
    MARGIN,
    y,
    10.5,
    BLACK,
  );

  y -= 56;
  page.drawText("Office of the Registrar", {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.bold,
    color: PRIMARY,
  });
  y -= 15;
  page.drawText("Central Global University (CGU)", {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.regular,
    color: BLACK,
  });
  y -= 14;
  page.drawText("Georgia Administrative Campus", {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.regular,
    color: BLACK,
  });

  return doc.save();
}

function drawHeader(page: PDFPage, fonts: Fonts) {
  page.drawRectangle({ x: 0, y: PAGE_H - 110, width: PAGE_W, height: 110, color: PRIMARY });
  page.drawText("CENTRAL GLOBAL UNIVERSITY", {
    x: MARGIN,
    y: PAGE_H - 42,
    size: 18,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("OFFICE OF THE REGISTRAR", {
    x: MARGIN,
    y: PAGE_H - 60,
    size: 10,
    font: fonts.bold,
    color: rgb(0.85, 0.89, 0.96),
  });
  page.drawText("Campus & Administrative Hub: Georgia", {
    x: MARGIN,
    y: PAGE_H - 76,
    size: 8.5,
    font: fonts.regular,
    color: rgb(0.85, 0.89, 0.96),
  });
  page.drawText("Official Portal: www.cgu.edu.ge | Registrar Desk: registrar@cgu.edu.ge", {
    x: MARGIN,
    y: PAGE_H - 90,
    size: 8.5,
    font: fonts.regular,
    color: rgb(0.85, 0.89, 0.96),
  });
}

function drawFooter(page: PDFPage, fonts: Fonts) {
  page.drawLine({
    start: { x: MARGIN, y: 56 },
    end: { x: PAGE_W - MARGIN, y: 56 },
    thickness: 0.75,
    color: LINE,
  });
  const label = "Official Enrollment Record | CGU";
  page.drawText(label, {
    x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(label, 8.5),
    y: 42,
    size: 8.5,
    font: fonts.regular,
    color: MUTED,
  });
}

function drawRight(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawText(text, {
    x: PAGE_W - MARGIN - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

function drawWrapped(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
  maxWidth = PAGE_W - MARGIN * 2,
): number {
  const words = text.split(/\s+/);
  let line = "";
  const lineHeight = size * 1.45;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}
