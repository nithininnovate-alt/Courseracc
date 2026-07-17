import { PDFDocument, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";
import {
  PRIMARY,
  GOLD,
  MUTED,
  BLACK,
  LINE,
  TABLE_BG,
  PASS_GREEN,
  FAIL_RED,
  WHITE,
  A4_PORTRAIT,
  drawPaper,
  drawLetterhead,
  drawThemeFooter,
  drawAttestationBlock,
  drawImageW,
  embedBrandImages,
  type BrandImages,
  type ThemeFonts,
} from "./pdfTheme";

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

function centerWrapped(
  page: PDFPage,
  text: string,
  topY: number,
  size: number,
  font: PDFFont,
  color = BLACK,
  maxWidth = 460,
  lineHeight?: number,
): number {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const cand = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(cand, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = cand;
    }
  }
  if (line) lines.push(line);
  let y = topY;
  const lh = lineHeight ?? size * 1.5;
  for (const l of lines) {
    centerText(page, l, y, size, font, color);
    y -= lh;
  }
  return y;
}

export interface DegreeCertificateData {
  studentName: string;
  studentId?: string | null;
  courseTitle: string;
  courseLevel: string;
  certificateNumber: string;
  issuedAt: Date;
}

function ordinalDay(d: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = d % 100;
  if (v >= 11 && v <= 13) return `${d}th`;
  return `${d}${s[d % 10] ?? "th"}`;
}

/**
 * Generate the official portrait IEAC-accredited degree certificate,
 * matched to the CGU accreditation certificate template, with a second
 * "Official Institutional Status" appendix page.
 */
export async function generateDegreeCertificate(
  data: DegreeCertificateData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const images = await embedBrandImages(doc);
  const page = doc.addPage(A4_PORTRAIT);
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  drawPaper(page);

  // Shield crest, centered at top
  const shieldW = 86;
  drawImageW(page, images.shield, (width - shieldW) / 2, height - 36, shieldW);

  centerText(page, "Central Global University", height - 168, 30, serifBold, PRIMARY);
  centerText(page, "IEAC-Accredited Program", height - 196, 15, serifBold, BLACK);

  let y = centerWrapped(
    page,
    "By the authority of the Academic Board of Central Global University, and in alignment with the academic standards of the International Education Accreditation Council (UK), this degree is awarded upon completion of all required coursework, assessments, and quality assurance measures, with demonstrated academic excellence and ethical integrity.",
    height - 226,
    10.5,
    fontItalic,
    BLACK,
    440,
  );

  y -= 22;
  centerText(page, "Be it known that", y, 15, serifBold, BLACK);
  y -= 30;
  centerText(page, data.studentName, y, 22, serifBold, PRIMARY);
  y -= 26;
  centerText(page, "has been formally awarded the academic degree of", y, 11, fontItalic, BLACK);
  y -= 34;
  y = centerWrapped(page, data.courseTitle, y, 19, serifBold, BLACK, 460, 24);
  y -= 8;
  y = centerWrapped(
    page,
    "with all rights, privileges, and responsibilities thereto pertaining, as an IEAC-accredited qualification benchmarked to international standards of higher education.",
    y,
    10.5,
    fontItalic,
    BLACK,
    440,
  );
  y -= 10;
  y = centerWrapped(
    page,
    "In witness whereof, under the Seal of the University and the governance of its duly authorized officers, this degree has been issued on this",
    y,
    10.5,
    fontItalic,
    BLACK,
    440,
  );
  y -= 8;
  const d = data.issuedAt;
  const dateLine = `${ordinalDay(d.getDate())} of ${d.toLocaleDateString("en-US", { month: "long" })}, ${d.getFullYear()}`;
  centerText(page, dateLine, y, 12.5, serifBold, BLACK);
  y -= 16;
  centerText(page, "at Georgia", y, 10.5, fontItalic, BLACK);

  // Signature block (centered): Doromal signature over name
  const sigW = 64;
  const sigH = (images.sigDoromal.height / images.sigDoromal.width) * sigW;
  page.drawImage(images.sigDoromal, {
    x: width / 2 - sigW / 2,
    y: 178,
    width: sigW,
    height: sigH,
  });
  // Small registrar seal to the right of the signature
  drawImageW(page, images.sealRegistrar, width / 2 + 70, 236, 66);
  centerText(page, "Dr. Cherry M. Doromal", 168, 16, serifBold, BLACK);
  centerText(page, "Director", 154, 9, fontItalic, MUTED);

  // Red embossed seal, bottom-left
  drawImageW(page, images.sealRed, 54, 148, 88);

  // SID + certificate number + verification, bottom-center-left
  let infoY = 96;
  if (data.studentId) {
    page.drawText(`SID: ${data.studentId}`, {
      x: 168,
      y: infoY,
      size: 9.5,
      font: fontBold,
      color: BLACK,
    });
    infoY -= 13;
  }
  page.drawText(`Certificate No: ${data.certificateNumber}`, {
    x: 168,
    y: infoY,
    size: 9.5,
    font: fontBold,
    color: BLACK,
  });
  infoY -= 14;
  page.drawText("Verification available at:", {
    x: 168,
    y: infoY,
    size: 8.5,
    font,
    color: BLACK,
  });
  infoY -= 12;
  page.drawText("verification.cgu.edu.ge", {
    x: 168,
    y: infoY,
    size: 8.5,
    font,
    color: PRIMARY,
  });

  // IEAC badge, bottom-right
  drawImageW(page, images.ieacBadge, width - 54 - 78, 128, 78);

  // ---------- Page 2: Official Institutional Status appendix ----------
  drawStatusAppendix(doc, images, { regular: font, bold: fontBold }, serif);

  return doc.save();
}

function drawStatusAppendix(
  doc: PDFDocument,
  images: BrandImages,
  fonts: ThemeFonts,
  serif: PDFFont,
) {
  const page = doc.addPage(A4_PORTRAIT);
  const { width, height } = page.getSize();
  drawPaper(page);
  const M = 46;
  const colW = width - M * 2 - 190; // left column width
  const rightX = width - M - 172;

  let y = height - 58;
  page.drawText("OFFICIAL INSTITUTIONAL STATUS & INTERNATIONAL QUALITY VALIDATIONS", {
    x: M,
    y,
    size: 11,
    font: fonts.bold,
    color: BLACK,
  });
  page.drawLine({
    start: { x: M, y: y - 8 },
    end: { x: width - M, y: y - 8 },
    thickness: 1,
    color: PRIMARY,
  });
  y -= 36;

  const wrapped = (
    text: string,
    x: number,
    topY: number,
    size: number,
    font: PDFFont,
    maxWidth: number,
    color = BLACK,
  ): number => {
    const words = text.split(/\s+/);
    let line = "";
    let yy = topY;
    for (const word of words) {
      const cand = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(cand, size) > maxWidth && line) {
        page.drawText(line, { x, y: yy, size, font, color });
        yy -= size * 1.45;
        line = word;
      } else {
        line = cand;
      }
    }
    if (line) {
      page.drawText(line, { x, y: yy, size, font, color });
      yy -= size * 1.45;
    }
    return yy;
  };

  // Left column sections
  page.drawText("I. INDEPENDENT GLOBAL MANDATE", { x: M, y, size: 9.5, font: fonts.bold, color: BLACK });
  y -= 16;
  y = wrapped(
    "Central Global University (CGU) is established as an autonomous international institution operating outside the statutory framework of localized national education systems and is instead listed in recognized global accreditation directories. The university is strategically organized as a borderless global entity, specifically empowered to deliver transnational distance education models, formulate progressive curricular benchmarks, and confer academic credentials to cross-border professionals.",
    M,
    y,
    8.5,
    fonts.regular,
    colW,
  );
  y -= 12;
  page.drawText("II. International Education Accreditation Council", { x: M, y, size: 9.5, font: fonts.bold, color: BLACK });
  y -= 12;
  page.drawText("(Full Institutional Accreditation)", { x: M, y, size: 9.5, font: fonts.bold, color: BLACK });
  y -= 20;
  // Highlight box
  const boxText =
    "Central Global University operates under the rigorous quality management standards of international higher education and holds Full Institutional Accreditation from the International Education Accreditation Council (IEAC).";
  page.drawRectangle({ x: M, y: y - 44, width: colW, height: 58, color: TABLE_BG, borderColor: GOLD, borderWidth: 0.75 });
  wrapped(boxText, M + 8, y - 2, 8.5, fonts.bold, colW - 16);
  y -= 60;
  y = wrapped(
    "The Full Institutional Accreditation from the International Education Accreditation Council (IEAC) serves as the primary external regulatory body governing the academic structures of CGU. This premier transnational validation ensures that all degree tracks, assessment matrices, and institutional operations strictly adhere to international quality assurance metrics, providing high-tier academic validity independent of local regional registries.",
    M,
    y,
    8.5,
    fonts.regular,
    colW,
  );
  y -= 12;
  page.drawText("III. CREDIT MATRIX & INTERNATIONAL MOBILITY", { x: M, y, size: 9.5, font: fonts.bold, color: BLACK });
  y -= 16;
  y = wrapped(
    "Degrees conferred by Central Global University are mapped directly to universally recognized credit accounting principles (180 ECTS / 120 US semester credit hours). This structure delivers standardized, transparent metrics that facilitate international credential mobility, transcript evaluation, and performance authentication across global corporate, professional, and private enterprise networks.",
    M,
    y,
    8.5,
    fonts.regular,
    colW,
  );
  y -= 16;
  page.drawText("Areas of Excellence", { x: M, y, size: 10, font: serif, color: BLACK });
  y -= 14;
  const areas = [
    "Transnational distance education and borderless academic delivery",
    "ECTS-aligned credit structures and international credential mobility",
    "Rigorous quality assurance under IEAC full institutional accreditation",
    "Secure digital verification of academic records and transcripts",
  ];
  for (const area of areas) {
    y = wrapped(`\u2022 ${area}`, M, y, 8.5, fonts.regular, colW - 96);
    y -= 2;
  }
  // IEAC "ACCREDITED" badge beside the Areas of Excellence list
  const badgeW = 84;
  const badgeH = (images.ieacBadge.height / images.ieacBadge.width) * badgeW;
  page.drawImage(images.ieacBadge, {
    x: M + colW - badgeW,
    y: y + 6,
    width: badgeW,
    height: badgeH,
  });

  // Right column: shield + institutional profile
  let ry = height - 92;
  const shieldW2 = 74;
  drawImageW(page, images.shield, rightX + (172 - shieldW2) / 2, ry + 14, shieldW2);
  ry -= 84;
  const cp = "INSTITUTIONAL PROFILE";
  const cpw = fonts.bold.widthOfTextAtSize(cp, 8.5);
  page.drawText(cp, { x: rightX + (172 - cpw) / 2, y: ry, size: 8.5, font: fonts.bold, color: BLACK });
  ry -= 16;
  const profile: [string, string][] = [
    ["Institution:", "Central Global University"],
    ["Type:", "Transnational Distance Learning"],
    ["Validation:", "IEAC Fully Accredited"],
    ["Registry:", "www.cgu.edu.ge"],
  ];
  for (const [k, v] of profile) {
    page.drawText(k, { x: rightX, y: ry, size: 7.5, font: fonts.regular, color: MUTED });
    const vw = fonts.bold.widthOfTextAtSize(v, 7.5);
    page.drawText(v, { x: rightX + 172 - vw, y: ry, size: 7.5, font: fonts.bold, color: BLACK });
    page.drawLine({ start: { x: rightX, y: ry - 4 }, end: { x: rightX + 172, y: ry - 4 }, thickness: 0.4, color: LINE });
    ry -= 16;
  }
  ry -= 12;
  page.drawRectangle({ x: rightX - 6, y: ry - 128, width: 184, height: 132, borderColor: GOLD, borderWidth: 0.75 });
  page.drawText("SECURITY & AUTHENTICITY FEATURES", { x: rightX, y: ry - 12, size: 7.5, font: fonts.bold, color: BLACK });
  let sy = ry - 26;
  const feats: [string, string][] = [
    ["Microtext Security Border:", "Authentic certificates utilize precision alphanumeric microprint patterns embedded along the margin limits."],
    ["Digital QR Verification:", "Scan to access the secure registrar database and immediately verify matching permanent student transcript records."],
    ["Embossed Foil Certification:", "The document face features an authenticated, tactile hot-stamped verification seal from the Office of the Registrar."],
  ];
  for (const [t, b] of feats) {
    sy = wrapped(`\u2022 ${t} ${b}`, rightX, sy, 6.8, fonts.regular, 168, BLACK);
    sy -= 4;
  }
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

const YEAR_SECTION_TITLES: Record<string, string[]> = {
  bachelor: [
    "CORE BUSINESS FOUNDATIONS",
    "ADVANCED MANAGEMENT FRAMEWORKS",
    "SPECIALIZATION TRACK",
    "CAPSTONE & APPLIED RESEARCH",
  ],
  master: [
    "CORE EXECUTIVE FRAMEWORKS",
    "ADVANCED SPECIALIZATION & RESEARCH",
    "STRATEGIC RESEARCH & THESIS",
  ],
  doctorate: [
    "ADVANCED DOCTORAL CORE FOUNDATIONS",
    "DOCTORAL STRATEGIC MANAGEMENT FRAMEWORKS",
    "DOCTORAL DISSERTATION & RESEARCH DEFENSE",
  ],
};

function methodologyFor(degree: string): string {
  const d = degree.toLowerCase();
  if (d.includes("doctor") || d.includes("dba") || d.includes("phd")) {
    return "*Assessment Methodology: Evaluated based on Doctoral Advanced Framework benchmarks, requiring complete implementation of practical business models, extensive peer-reviewed literature contributions, an active research thesis monograph, and an official viva-voce board oral defense panel.";
  }
  if (d.includes("master") || d.includes("mba")) {
    return "*Assessment Methodology: Based on Graduate Continuous Assessment Framework including Advanced Strategic Case Studies, Applied Research Monographs, Viva Voce Defense Seminars, and Master Thesis Projects. 1 ECTS = 25-30 Learning Hours.";
  }
  return "*Assessment Methodology: Based on Continuous Assessment Framework including Application-Oriented Assignments, Research Case Studies, Oral Defense Seminars, and Final Capstone Projects. 1 ECTS = 25-30 Learning Hours.";
}

function sectionTitlesFor(degree: string): string[] {
  const d = degree.toLowerCase();
  if (d.includes("doctor") || d.includes("dba") || d.includes("phd")) return YEAR_SECTION_TITLES.doctorate;
  if (d.includes("master") || d.includes("mba")) return YEAR_SECTION_TITLES.master;
  return YEAR_SECTION_TITLES.bachelor;
}

/**
 * Generate the official academic transcript, matched to the CGU registrar
 * template: cream paper, purple header table, year sections, totals block,
 * grading key & methodology, and the attested registry record seal block.
 */
export async function generateTranscript(data: TranscriptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const images = await embedBrandImages(doc);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts: ThemeFonts = { regular: font, bold: fontBold };

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const margin = 42;
  const tableW = PAGE_W - margin * 2;

  const newPage = (): { page: PDFPage; y: number } => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    const y = drawLetterhead(
      page,
      fonts,
      { office: "Office of the Registrar", docLabel: "OFFICIAL ACADEMIC TRANSCRIPT" },
      images,
    );
    drawThemeFooter(page, fonts, {
      left: "Official Academic Transcript | Central Global University",
    });
    return { page, y };
  };

  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "In Progress";

  let { page, y } = newPage();

  // Student information block: bordered label/value grid, two columns
  const infoLeft: [string, string][] = [
    ["Student Name:", data.studentName],
    ["Student ID:", data.studentId],
    ["Degree Awarded:", data.degreeAwarded],
  ];
  const infoRight: [string, string][] = [
    ["Enrollment Date:", fmt(data.enrollmentDate)],
    ["Completion Date:", fmt(data.completionDate)],
    ["Transcript Ref:", data.certificateNumber],
  ];
  const infoRowH = 22;
  const infoH = infoRowH * infoLeft.length + 8;
  page.drawRectangle({
    x: margin,
    y: y - infoH + 14,
    width: tableW,
    height: infoH,
    borderColor: PRIMARY,
    borderWidth: 0.75,
  });
  let iy = y - 2;
  const halfW = tableW / 2;
  for (let i = 0; i < infoLeft.length; i++) {
    const [lk, lv] = infoLeft[i];
    const [rk, rv] = infoRight[i];
    page.drawText(lk, { x: margin + 8, y: iy, size: 8.5, font: fontBold, color: BLACK });
    page.drawText(lv.length > 46 ? `${lv.slice(0, 45)}…` : lv, {
      x: margin + 92,
      y: iy,
      size: 8.5,
      font,
      color: BLACK,
    });
    page.drawText(rk, { x: margin + halfW + 16, y: iy, size: 8.5, font: fontBold, color: BLACK });
    page.drawText(rv, { x: margin + halfW + 108, y: iy, size: 8.5, font, color: BLACK });
    iy -= infoRowH;
  }
  y = y - infoH - 6;

  // Table columns
  const colCode = margin + 8;
  const colTitle = margin + 78;
  const colCredits = margin + tableW - 150;
  const colGrade = margin + tableW - 95;
  const colStatus = margin + tableW - 50;

  const drawTableHeader = () => {
    page.drawRectangle({ x: margin, y: y - 9, width: tableW, height: 30, color: PRIMARY });
    page.drawText("MODULE", { x: colCode, y: y + 8, size: 7.5, font: fontBold, color: WHITE });
    page.drawText("CODE", { x: colCode, y: y - 2, size: 7.5, font: fontBold, color: WHITE });
    page.drawText("MODULE TITLE", { x: colTitle, y: y + 3, size: 7.5, font: fontBold, color: WHITE });
    page.drawText("CREDITS", { x: colCredits, y: y + 8, size: 7.5, font: fontBold, color: WHITE });
    page.drawText("(ECTS)", { x: colCredits, y: y - 2, size: 7.5, font: fontBold, color: WHITE });
    page.drawText("GRADE", { x: colGrade, y: y + 3, size: 7.5, font: fontBold, color: WHITE });
    page.drawText("STATUS", { x: colStatus, y: y + 3, size: 7.5, font: fontBold, color: WHITE });
    y -= 26;
  };

  const ensureSpace = (needed: number, withHeader = true) => {
    if (y - needed < 60) {
      ({ page, y } = newPage());
      if (withHeader) drawTableHeader();
    }
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? `${text.slice(0, max - 1)}…` : text;

  drawTableHeader();

  const years = [...new Set(data.rows.map((r) => r.year))].sort((a, b) => a - b);
  const sectionTitles = sectionTitlesFor(data.degreeAwarded);
  const { earnedCredits, gpa } = computeTranscriptSummary(data.rows);

  for (const yr of years) {
    ensureSpace(44);
    const subtitle = sectionTitles[yr - 1] ?? "CONTINUED PROGRAMME MODULES";
    page.drawRectangle({ x: margin, y: y - 5, width: tableW, height: 18, color: TABLE_BG });
    page.drawText(`YEAR ${yr} - ${subtitle}`, {
      x: colCode,
      y,
      size: 8,
      font: fontBold,
      color: PRIMARY,
    });
    y -= 20;
    for (const row of data.rows.filter((r) => r.year === yr)) {
      ensureSpace(20);
      page.drawText(row.moduleCode, { x: colCode, y, size: 8.5, font, color: BLACK });
      page.drawText(truncate(row.moduleTitle, 58), { x: colTitle, y, size: 8.5, font, color: BLACK });
      const credits = row.credits.toFixed(1);
      page.drawText(credits, {
        x: colCredits + 18 - font.widthOfTextAtSize(credits, 8.5) / 2,
        y,
        size: 8.5,
        font,
        color: BLACK,
      });
      page.drawText(row.grade, {
        x: colGrade + 10 - font.widthOfTextAtSize(row.grade, 8.5) / 2,
        y,
        size: 8.5,
        font,
        color: BLACK,
      });
      page.drawText(row.passed ? "Pass" : "Fail", {
        x: colStatus,
        y,
        size: 8.5,
        font,
        color: row.passed ? PASS_GREEN : FAIL_RED,
      });
      page.drawLine({
        start: { x: margin, y: y - 5 },
        end: { x: PAGE_W - margin, y: y - 5 },
        thickness: 0.4,
        color: LINE,
      });
      y -= 17;
    }
  }

  if (data.rows.length === 0) {
    page.drawText("No published results on record.", {
      x: colCode,
      y,
      size: 9.5,
      font,
      color: MUTED,
    });
    y -= 24;
  }

  // Totals block (right-aligned bordered rows, per template)
  ensureSpace(90, false);
  y -= 10;
  const totalsX = margin + tableW - 240;
  const totals: [string, string][] = [
    ["Total Modules:", String(data.rows.length)],
    ["Total ECTS Earned:", `${Number.isInteger(earnedCredits) ? earnedCredits : earnedCredits.toFixed(1)} ECTS`],
    ["Cumulative GPA:", `${gpa.toFixed(2)} / 4.00`],
  ];
  for (const [k, v] of totals) {
    page.drawRectangle({
      x: totalsX,
      y: y - 7,
      width: 240,
      height: 21,
      borderColor: PRIMARY,
      borderWidth: 0.6,
    });
    page.drawText(k, { x: totalsX + 8, y: y - 1, size: 8.5, font: fontBold, color: BLACK });
    const vw = fontBold.widthOfTextAtSize(v, 8.5);
    page.drawText(v, { x: totalsX + 240 - 12 - vw, y: y - 1, size: 8.5, font: fontBold, color: BLACK });
    y -= 21;
  }
  y -= 40;

  // Grading key & methodology (left) + attested registry record (right)
  ensureSpace(200, false);
  const keyTop = y;
  page.drawText("GRADING KEY & METHODOLOGY:", { x: margin, y, size: 8.5, font: fontBold, color: BLACK });
  y -= 13;
  const keyLines = [
    "A (Excellent): 4.00 | A- : 3.67 | B+ : 3.33 | B (Good): 3.00 | B- : 2.67",
    "C+ : 2.33 | C (Satisfactory): 2.00 | D (Passing): 1.00 | F (Failure): 0.00",
  ];
  for (const l of keyLines) {
    page.drawText(l, { x: margin, y, size: 7.5, font, color: BLACK });
    y -= 11;
  }
  // Methodology paragraph (wrapped to the left column)
  const methodology = methodologyFor(data.degreeAwarded);
  {
    const maxW = 290;
    const words = methodology.split(/\s+/);
    let line = "";
    for (const word of words) {
      const cand = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(cand, 7.5) > maxW && line) {
        page.drawText(line, { x: margin, y, size: 7.5, font, color: BLACK });
        y -= 11;
        line = word;
      } else {
        line = cand;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: 7.5, font, color: BLACK });
      y -= 11;
    }
  }

  // Attestation block, right side (seal + registrar signature)
  drawAttestationBlock(page, fonts, images, {
    x: PAGE_W - margin - 130,
    topY: keyTop,
  });

  return doc.save();
}
