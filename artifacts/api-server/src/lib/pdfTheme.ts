import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

/**
 * Shared CGU PDF design theme.
 *
 * Every generated document (admission letter, enrollment letter, certificate,
 * transcript, invoice, result slip) uses this module so branding stays
 * consistent with the official registrar document design: deep CGU purple,
 * gold accents, the CGU logo badge, and the standard
 * "OFFICE OF THE REGISTRAR / Georgia / verification portal" letterhead.
 */

/* ------------------------------- palette -------------------------------- */

/** CGU deep purple (matches the portal logo #4B396A). */
export const PRIMARY = rgb(0.294, 0.224, 0.416);
/** CGU gold accent (#C9A227). */
export const GOLD = rgb(0.788, 0.635, 0.153);
export const MUTED = rgb(0.4, 0.4, 0.4);
export const BLACK = rgb(0.1, 0.1, 0.1);
export const LINE = rgb(0.85, 0.85, 0.85);
/** Light lavender used for text on the purple header band. */
export const HEADER_TINT = rgb(0.88, 0.86, 0.93);
/** Light purple-tinted background for table headers / info rows. */
export const TABLE_BG = rgb(0.955, 0.948, 0.972);
export const PASS_GREEN = rgb(0.13, 0.5, 0.23);
export const FAIL_RED = rgb(0.7, 0.16, 0.16);
export const WHITE = rgb(1, 1, 1);

/* ------------------------------ dimensions ------------------------------ */

export const A4_PORTRAIT: [number, number] = [595.28, 841.89];
export const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
export const MARGIN = 56;

/** Standard letterhead contact line (per the official transcript design). */
export const VERIFICATION_LINE =
  "Verification Portal: verification.cgu.edu.ge | Email: registrar@cgu.edu.ge";

export interface ThemeFonts {
  regular: PDFFont;
  bold: PDFFont;
}

export async function embedThemeFonts(doc: PDFDocument): Promise<ThemeFonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

/* -------------------------------- logo ---------------------------------- */

/**
 * Draw the CGU logo badge (rounded purple square with "CGU"), matching the
 * portal logo. `onDark` renders a white badge with purple text for use on
 * the purple header band.
 */
export function drawLogoBadge(
  page: PDFPage,
  bold: PDFFont,
  opts: { x: number; y: number; size?: number; onDark?: boolean },
) {
  const size = opts.size ?? 44;
  const bg = opts.onDark ? WHITE : PRIMARY;
  const fg = opts.onDark ? PRIMARY : WHITE;
  const r = size * 0.18;

  // Approximate rounded corners: cross of two rectangles + corner circles.
  page.drawRectangle({
    x: opts.x + r,
    y: opts.y,
    width: size - 2 * r,
    height: size,
    color: bg,
  });
  page.drawRectangle({
    x: opts.x,
    y: opts.y + r,
    width: size,
    height: size - 2 * r,
    color: bg,
  });
  for (const [cx, cy] of [
    [opts.x + r, opts.y + r],
    [opts.x + size - r, opts.y + r],
    [opts.x + r, opts.y + size - r],
    [opts.x + size - r, opts.y + size - r],
  ] as const) {
    page.drawCircle({ x: cx, y: cy, size: r, color: bg });
  }

  const fontSize = size * 0.34;
  const text = "CGU";
  const textWidth = bold.widthOfTextAtSize(text, fontSize);
  page.drawText(text, {
    x: opts.x + (size - textWidth) / 2,
    y: opts.y + size / 2 - fontSize * 0.36,
    size: fontSize,
    font: bold,
    color: fg,
  });
}

/* ------------------------------ letterhead ------------------------------ */

export interface LetterheadOptions {
  /** e.g. "OFFICE OF THE REGISTRAR" */
  office: string;
  /** Contact / verification line. Defaults to the standard registrar line. */
  contact?: string;
  /** Optional right-aligned document label, e.g. "INVOICE". */
  docLabel?: string;
}

/** Total height consumed by the standard letterhead band + gold rule. */
export const LETTERHEAD_HEIGHT = 118;

/**
 * Draw the standard CGU letterhead: purple band with the logo badge,
 * university name, office line, "Georgia", verification/contact line, and a
 * gold accent rule under the band.
 */
export function drawLetterhead(
  page: PDFPage,
  fonts: ThemeFonts,
  opts: LetterheadOptions,
) {
  const { width, height } = page.getSize();
  const bandH = LETTERHEAD_HEIGHT - 4;

  page.drawRectangle({
    x: 0,
    y: height - bandH,
    width,
    height: bandH,
    color: PRIMARY,
  });
  // Gold accent rule under the band.
  page.drawRectangle({
    x: 0,
    y: height - LETTERHEAD_HEIGHT,
    width,
    height: 4,
    color: GOLD,
  });

  drawLogoBadge(page, fonts.bold, {
    x: MARGIN,
    y: height - 36 - 44,
    size: 44,
    onDark: true,
  });

  const textX = MARGIN + 58;
  page.drawText("CENTRAL GLOBAL UNIVERSITY", {
    x: textX,
    y: height - 44,
    size: 17,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawText(opts.office.toUpperCase(), {
    x: textX,
    y: height - 62,
    size: 10,
    font: fonts.bold,
    color: GOLD,
  });
  page.drawText("Georgia", {
    x: textX,
    y: height - 77,
    size: 9,
    font: fonts.regular,
    color: HEADER_TINT,
  });
  page.drawText(opts.contact ?? VERIFICATION_LINE, {
    x: textX,
    y: height - 91,
    size: 8.5,
    font: fonts.regular,
    color: HEADER_TINT,
  });

  if (opts.docLabel) {
    const size = 12;
    const w = fonts.bold.widthOfTextAtSize(opts.docLabel, size);
    page.drawText(opts.docLabel, {
      x: width - MARGIN - w,
      y: height - 63,
      size,
      font: fonts.bold,
      color: WHITE,
    });
  }
}

/* -------------------------------- footer -------------------------------- */

/**
 * Draw the standard document footer: a rule plus a left-aligned note and an
 * optional right-aligned label (e.g. page number), in the transcript style:
 * "Official Academic Transcript | Central Global University".
 */
export function drawThemeFooter(
  page: PDFPage,
  fonts: ThemeFonts,
  opts: { left: string; right?: string },
) {
  const { width } = page.getSize();
  page.drawLine({
    start: { x: MARGIN, y: 56 },
    end: { x: width - MARGIN, y: 56 },
    thickness: 0.75,
    color: GOLD,
  });
  page.drawText(opts.left, {
    x: MARGIN,
    y: 42,
    size: 8.5,
    font: fonts.regular,
    color: MUTED,
  });
  if (opts.right) {
    const w = fonts.regular.widthOfTextAtSize(opts.right, 8.5);
    page.drawText(opts.right, {
      x: width - MARGIN - w,
      y: 42,
      size: 8.5,
      font: fonts.regular,
      color: MUTED,
    });
  }
}
