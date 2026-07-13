import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { resolveProgramInfo, ACCREDITATIONS } from "./programInfo";
import {
  PRIMARY,
  MUTED,
  BLACK,
  LINE,
  TABLE_BG,
  LETTERHEAD_HEIGHT,
  drawLetterhead,
  drawThemeFooter,
} from "./pdfTheme";

export interface AdmissionLetterData {
  applicantName: string;
  programName: string;
  applicationId: number;
  reviewNote?: string | null;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

/**
 * Generate the official two-page CGU admission letter
 * (Office of Admissions & Registrar format).
 */
export async function generateAdmissionLetter(
  data: AdmissionLetterData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };

  const program = resolveProgramInfo(data.programName);
  const year = new Date().getFullYear();
  const refNo = `CGU/${program.code}/${year}/${String(data.applicationId).padStart(4, "0")}`;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let pageIndex = 0;
  const totalPages = 2;
  const newPage = (): { page: PDFPage; y: number } => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    pageIndex++;
    drawHeader(page, fonts);
    drawPageFooter(page, fonts, pageIndex, totalPages);
    return { page, y: PAGE_H - LETTERHEAD_HEIGHT - 28 };
  };

  // ---------- Page 1 ----------
  let { page, y } = newPage();

  page.drawText("To:", { x: MARGIN, y, size: 10, font: fonts.bold, color: BLACK });
  page.drawText(`Date: ${today}`, {
    x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(`Date: ${today}`, 10),
    y,
    size: 10,
    font: fonts.regular,
    color: BLACK,
  });
  y -= 15;
  page.drawText(data.applicantName, { x: MARGIN, y, size: 10, font: fonts.regular, color: BLACK });
  page.drawText(`Ref No: ${refNo}`, {
    x: PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(`Ref No: ${refNo}`, 10),
    y,
    size: 10,
    font: fonts.regular,
    color: BLACK,
  });

  y -= 30;
  y = drawWrapped(page, fonts.bold, {
    text: `Subject: Official Letter of Admission – ${data.programName}`,
    x: MARGIN,
    y,
    size: 11,
    color: BLACK,
  });

  y -= 12;
  page.drawText(`Dear ${data.applicantName},`, {
    x: MARGIN,
    y,
    size: 10.5,
    font: fonts.regular,
    color: BLACK,
  });
  y -= 20;

  const introParas = [
    `On behalf of the Admissions Committee, I am pleased to inform you that you have been officially accepted into the ${data.programName} program at Central Global University (CGU) for the upcoming academic session.`,
    "Your application was evaluated thoroughly based on your academic credentials, professional potential, and alignment with our rigorous educational benchmarks. We believe your profile will contribute significantly to our global learning community.",
  ];
  for (const p of introParas) {
    y = drawWrapped(page, fonts.regular, { text: p, x: MARGIN, y, size: 10.5, color: BLACK });
    y -= 10;
  }

  // Program details table
  y -= 6;
  const rows: [string, string][] = [
    ["Degree Program", data.programName],
    ["Mode of Delivery", "Online / Distance Learning / Hybrid"],
    ["Duration", program.duration],
    ["Language of Instruction", "English"],
    ["Academic Credits", program.credits],
  ];
  const rowH = 24;
  const labelW = 180;
  for (const [label, value] of rows) {
    page.drawRectangle({
      x: MARGIN,
      y: y - rowH + 8,
      width: PAGE_W - MARGIN * 2,
      height: rowH,
      color: TABLE_BG,
      borderColor: LINE,
      borderWidth: 0.5,
    });
    page.drawText(label, { x: MARGIN + 10, y: y - 8, size: 10, font: fonts.bold, color: PRIMARY });
    page.drawText(value, { x: MARGIN + labelW, y: y - 8, size: 10, font: fonts.regular, color: BLACK });
    y -= rowH;
  }

  y -= 24;
  page.drawText("INSTITUTIONAL FRAMEWORK & GLOBAL RECOGNITION", {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.bold,
    color: PRIMARY,
  });
  y -= 18;
  y = drawWrapped(page, fonts.regular, {
    text: "Central Global University is committed to delivering world-class business education aligned with international quality frameworks. CGU operates with structural validations, international accreditations, and high-tier institutional memberships:",
    x: MARGIN,
    y,
    size: 10.5,
    color: BLACK,
  });
  y -= 8;

  // First two accreditations on page 1, rest on page 2.
  for (const acc of ACCREDITATIONS.slice(0, 2)) {
    y = drawAccreditation(page, fonts, acc, y);
  }

  // ---------- Page 2 ----------
  ({ page, y } = newPage());
  for (const acc of ACCREDITATIONS.slice(2)) {
    y = drawAccreditation(page, fonts, acc, y);
  }

  y -= 14;
  page.drawText("KEY CONDITIONS OF ADMISSION", {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.bold,
    color: PRIMARY,
  });
  y -= 18;
  y = drawWrapped(page, fonts.regular, {
    text: "To finalize your enrollment and secure your student record, please fulfill the following institutional requirements:",
    x: MARGIN,
    y,
    size: 10.5,
    color: BLACK,
  });
  y -= 8;

  const conditions = [
    `1. Official Documentation: Submit clear scanned copies of your official ${program.priorCredential} (or equivalent) along with full academic transcripts. Note: Any non-English documentation must be accompanied by a certified English translation.`,
    "2. Transcript Submission Timeline: Official, original documents must be formally verified by the Registrar's office before you complete your first 9 semester credit hours.",
    "3. Program Fees: Complete the relevant program fee installments or structural tuition payments as detailed in your fee schedule to formalize your structural enrollment and activate your university portal login.",
  ];
  for (const c of conditions) {
    y = drawWrapped(page, fonts.regular, { text: c, x: MARGIN, y, size: 10.5, color: BLACK });
    y -= 8;
  }

  y -= 6;
  y = drawWrapped(page, fonts.regular, {
    text: "We are thrilled to welcome you to Central Global University and look forward to supporting your path toward cross-border professional and corporate leadership.",
    x: MARGIN,
    y,
    size: 10.5,
    color: BLACK,
  });

  if (data.reviewNote) {
    y -= 8;
    y = drawWrapped(page, fonts.italic, {
      text: `Note from the admissions office: ${data.reviewNote}`,
      x: MARGIN,
      y,
      size: 9.5,
      color: MUTED,
    });
  }

  y -= 16;
  page.drawText("Sincerely,", { x: MARGIN, y, size: 10.5, font: fonts.regular, color: BLACK });
  y -= 44;
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
  page.drawText("Georgia Office", { x: MARGIN, y, size: 10, font: fonts.regular, color: BLACK });

  return doc.save();
}

function drawHeader(page: PDFPage, fonts: Fonts) {
  drawLetterhead(page, fonts, {
    office: "Office of Admissions & Registrar",
    contact: "Verification Portal: verification.cgu.edu.ge | Email: admission@cgu.edu.ge",
    docLabel: "LETTER OF ADMISSION",
  });
}

function drawPageFooter(page: PDFPage, fonts: Fonts, num: number, total: number) {
  drawThemeFooter(page, fonts, {
    left: "Official Letter of Admission | Central Global University",
    right: `Page ${num} of ${total}`,
  });
}

function drawAccreditation(
  page: PDFPage,
  fonts: Fonts,
  acc: { title: string; body: string },
  y: number,
): number {
  page.drawText("•", { x: MARGIN + 4, y, size: 10.5, font: fonts.bold, color: PRIMARY });
  y = drawWrapped(page, fonts.regular, {
    text: `${acc.title} ${acc.body}`,
    x: MARGIN + 18,
    y,
    size: 10,
    color: BLACK,
    maxWidth: PAGE_W - MARGIN * 2 - 18,
    boldPrefix: acc.title,
    boldFont: fonts.bold,
  });
  return y - 8;
}

function drawWrapped(
  page: PDFPage,
  font: PDFFont,
  opts: {
    text: string;
    x: number;
    y: number;
    size: number;
    color: ReturnType<typeof rgb>;
    maxWidth?: number;
    lineHeight?: number;
    boldPrefix?: string;
    boldFont?: PDFFont;
  },
): number {
  const maxWidth = opts.maxWidth ?? PAGE_W - MARGIN * 2;
  const lineHeight = opts.lineHeight ?? opts.size * 1.45;
  const prefixLen = opts.boldPrefix?.length ?? 0;

  const words = opts.text.split(/\s+/);
  let line: { word: string; bold: boolean }[] = [];
  let consumed = 0;
  let y = opts.y;

  const widthOf = (items: { word: string; bold: boolean }[]) =>
    items.reduce((w, it, i) => {
      const f = it.bold && opts.boldFont ? opts.boldFont : font;
      return w + f.widthOfTextAtSize((i > 0 ? " " : "") + it.word, opts.size);
    }, 0);

  const flush = () => {
    let x = opts.x;
    for (let i = 0; i < line.length; i++) {
      const it = line[i];
      const f = it.bold && opts.boldFont ? opts.boldFont : font;
      const t = (i > 0 ? " " : "") + it.word;
      page.drawText(t, { x, y, size: opts.size, font: f, color: opts.color });
      x += f.widthOfTextAtSize(t, opts.size);
    }
    y -= lineHeight;
    line = [];
  };

  for (const word of words) {
    const bold = consumed < prefixLen;
    consumed += word.length + 1;
    const candidate = [...line, { word, bold }];
    if (widthOf(candidate) > maxWidth && line.length > 0) {
      flush();
      line = [{ word, bold }];
    } else {
      line = candidate;
    }
  }
  if (line.length > 0) flush();
  return y;
}
