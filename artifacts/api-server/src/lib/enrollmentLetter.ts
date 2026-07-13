import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { resolveProgramInfo } from "./programInfo";
import {
  PRIMARY,
  MUTED,
  BLACK,
  LINE,
  TABLE_BG,
  PASS_GREEN,
  LETTERHEAD_HEIGHT,
  drawLetterhead,
  drawThemeFooter,
} from "./pdfTheme";

export type EnrollmentLetterValidator = "ieac" | "eahea";

export interface EnrollmentLetterData {
  studentName: string;
  programName: string;
  userId: number;
  enrolledAt: Date;
  validator: EnrollmentLetterValidator;
}

const GREEN = PASS_GREEN;

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
    return { page, y: PAGE_H - LETTERHEAD_HEIGHT - 30 };
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
  drawLetterhead(page, fonts, {
    office: "Office of the Registrar",
    docLabel: "ENROLLMENT RECORD",
  });
}

function drawFooter(page: PDFPage, fonts: Fonts) {
  drawThemeFooter(page, fonts, {
    left: "Official Enrollment Record | Central Global University",
    right: "Verify at verification.cgu.edu.ge",
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
