import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

/**
 * Shared CGU PDF design theme, matched to the official registrar templates:
 * cream paper (borderless), purple headline letterhead with the
 * CGU shield logo top-right, purple table headers, and the official
 * registrar seal / signature artwork.
 */

/* ------------------------------- palette -------------------------------- */

/** CGU deep purple (matches the official documents #4B396A). */
export const PRIMARY = rgb(0.294, 0.224, 0.416);
/** CGU gold accent (#C9A227). */
export const GOLD = rgb(0.788, 0.635, 0.153);
export const MUTED = rgb(0.4, 0.4, 0.4);
export const BLACK = rgb(0.1, 0.1, 0.1);
export const LINE = rgb(0.8, 0.77, 0.72);
/** Cream paper background used on every official document (#FAF8E8). */
export const PAPER = rgb(0.98, 0.973, 0.91);
/** Light lavender used for text on the purple header band. */
export const HEADER_TINT = rgb(0.88, 0.86, 0.93);
/** Light purple-tinted background for year-section / info rows. */
export const TABLE_BG = rgb(0.93, 0.915, 0.95);
export const PASS_GREEN = rgb(0.13, 0.5, 0.23);
export const FAIL_RED = rgb(0.7, 0.16, 0.16);
export const WHITE = rgb(1, 1, 1);

/* ------------------------------ dimensions ------------------------------ */

export const A4_PORTRAIT: [number, number] = [595.28, 841.89];
export const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
export const MARGIN = 42;

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

/* ------------------------------- assets --------------------------------- */

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Candidate asset dirs: running from src/ (tsx) or bundled from dist/. */
const ASSET_DIR_CANDIDATES = [
  path.resolve(HERE, "assets"),
  path.resolve(HERE, "../assets"),
  path.resolve(HERE, "../src/assets"),
  path.resolve(process.cwd(), "src/assets"),
  path.resolve(process.cwd(), "artifacts/api-server/src/assets"),
];

const assetCache = new Map<string, Buffer>();
export function assetBytes(name: string): Buffer {
  let buf = assetCache.get(name);
  if (!buf) {
    let lastErr: unknown;
    for (const dir of ASSET_DIR_CANDIDATES) {
      try {
        buf = readFileSync(path.join(dir, name));
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!buf) throw lastErr;
    assetCache.set(name, buf);
  }
  return buf;
}

export interface BrandImages {
  /** Horizontal "CENTRAL GLOBAL UNIVERSITY" logo (768x244). */
  logo: PDFImage;
  /** Purple CGU shield crest. */
  shield: PDFImage;
  /** Round maroon Office of the Registrar seal. */
  sealRegistrar: PDFImage;
  /** Red embossed certificate seal. */
  sealRed: PDFImage;
  /** Registrar signature (Lito Molano). */
  sigLito: PDFImage;
  /** Director signature (Dr. Cherry M. Doromal). */
  sigDoromal: PDFImage;
  /** Dashed registrar signature used on enrollment/admission letters. */
  sigDashed: PDFImage;
  /** IEAC "ACCREDITED" badge. */
  ieacBadge: PDFImage;
  /** The eight IEAC per-area star-rating mini badges. */
  ieacMini: PDFImage[];
}

/** Embed the official CGU brand artwork into a document. */
export async function embedBrandImages(doc: PDFDocument): Promise<BrandImages> {
  const [
    logo,
    shield,
    sealRegistrar,
    sealRed,
    sigLito,
    sigDoromal,
    sigDashed,
    ieacBadge,
    ...ieacMini
  ] = await Promise.all([
    doc.embedPng(assetBytes("logo-full.png")),
    doc.embedPng(assetBytes("shield-logo.png")),
    doc.embedPng(assetBytes("seal-registrar.png")),
    doc.embedPng(assetBytes("seal-red.png")),
    doc.embedPng(assetBytes("sig-lito.png")),
    doc.embedPng(assetBytes("sig-doromal.png")),
    doc.embedPng(assetBytes("sig-dashed.png")),
    doc.embedPng(assetBytes("ieac-badge.png")),
    ...Array.from({ length: 8 }, (_, i) =>
      doc.embedPng(assetBytes(`ieac-mini-${i + 1}.png`)),
    ),
  ]);
  return {
    logo,
    shield,
    sealRegistrar,
    sealRed,
    sigLito,
    sigDoromal,
    sigDashed,
    ieacBadge,
    ieacMini,
  };
}

/** Draw an image scaled to a given width, anchored at top-left. Returns drawn height. */
export function drawImageW(
  page: PDFPage,
  img: PDFImage,
  x: number,
  topY: number,
  width: number,
  opts?: { opacity?: number },
): number {
  const h = (img.height / img.width) * width;
  page.drawImage(img, {
    x,
    y: topY - h,
    width,
    height: h,
    opacity: opts?.opacity ?? 1,
  });
  return h;
}

/* ------------------------------ page frame ------------------------------ */

/** Cream paper background (borderless, per the official templates). */
export function drawPaper(page: PDFPage) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: PAPER });
}

/** Tan/bronze frame color used on the formal degree certificate. */
const FRAME_BROWN = rgb(0.647, 0.529, 0.373);

/**
 * Draw the formal double-line certificate frame with concave (scalloped)
 * corners, matching the official degree certificate template.
 */
export function drawCertFrame(page: PDFPage) {
  const { width: w, height: h } = page.getSize();
  const frame = (m: number, r: number, lw: number) => {
    const d = [
      `M ${m + r} ${m}`,
      `H ${w - m - r}`,
      `A ${r} ${r} 0 0 0 ${w - m} ${m + r}`,
      `V ${h - m - r}`,
      `A ${r} ${r} 0 0 0 ${w - m - r} ${h - m}`,
      `H ${m + r}`,
      `A ${r} ${r} 0 0 0 ${m} ${h - m - r}`,
      `V ${m + r}`,
      `A ${r} ${r} 0 0 0 ${m + r} ${m}`,
      "Z",
    ].join(" ");
    page.drawSvgPath(d, {
      x: 0,
      y: h,
      borderColor: FRAME_BROWN,
      borderWidth: lw,
    });
  };
  frame(22, 16, 2.2);
  frame(32, 11, 0.8);
}

/* ------------------------------ letterhead ------------------------------ */

export interface LetterheadOptions {
  /** e.g. "OFFICE OF THE REGISTRAR" */
  office: string;
  /**
   * Contact lines under the office line. Defaults to the standard
   * registrar block ("Georgia" + verification line).
   */
  contactLines?: string[];
  /** @deprecated single contact line (kept for compatibility). */
  contact?: string;
  /** Optional centered purple document title under the letterhead. */
  docLabel?: string;
}

/** Total height consumed by the standard letterhead (without docLabel). */
export const LETTERHEAD_HEIGHT = 108;

/**
 * Draw the official CGU letterhead: cream paper (borderless), large
 * purple university name top-left, office + contact lines, shield crest
 * top-right, and a purple double rule. Optionally a centered document title.
 *
 * Returns the y coordinate where content should start.
 */
export function drawLetterhead(
  page: PDFPage,
  fonts: ThemeFonts,
  opts: LetterheadOptions,
  images?: BrandImages,
): number {
  const { width, height } = page.getSize();
  drawPaper(page);

  const x = MARGIN;
  let y = height - 48;

  page.drawText("CENTRAL GLOBAL UNIVERSITY", {
    x,
    y,
    size: 19,
    font: fonts.bold,
    color: PRIMARY,
  });
  y -= 17;
  page.drawText(opts.office.toUpperCase(), {
    x,
    y,
    size: 10.5,
    font: fonts.bold,
    color: BLACK,
  });
  y -= 12;
  const contactLines = opts.contactLines ??
    (opts.contact ? ["Georgia", opts.contact] : ["Georgia", VERIFICATION_LINE]);
  for (const line of contactLines) {
    page.drawText(line, { x, y, size: 7.5, font: fonts.regular, color: MUTED });
    y -= 10;
  }

  // Shield crest top-right
  if (images) {
    drawImageW(page, images.shield, width - MARGIN - 58, height - 30, 58);
  }

  // Purple double rule
  const ruleY = Math.min(y - 4, height - LETTERHEAD_HEIGHT + 6);
  page.drawLine({
    start: { x: MARGIN, y: ruleY },
    end: { x: width - MARGIN, y: ruleY },
    thickness: 1.5,
    color: PRIMARY,
  });
  page.drawLine({
    start: { x: MARGIN, y: ruleY - 3 },
    end: { x: width - MARGIN, y: ruleY - 3 },
    thickness: 0.5,
    color: PRIMARY,
  });

  let contentY = ruleY - 24;
  if (opts.docLabel) {
    const size = 14;
    const w = fonts.bold.widthOfTextAtSize(opts.docLabel, size);
    page.drawText(opts.docLabel, {
      x: (width - w) / 2,
      y: contentY,
      size,
      font: fonts.bold,
      color: PRIMARY,
    });
    contentY -= 28;
  }
  return contentY;
}

/* -------------------------------- footer -------------------------------- */

/**
 * Standard document footer: right-aligned muted label above the bottom
 * border, e.g. "Official Academic Transcript | Central Global University".
 */
export function drawThemeFooter(
  page: PDFPage,
  fonts: ThemeFonts,
  opts: { left?: string; right?: string },
) {
  const { width } = page.getSize();
  if (opts.left && opts.right) {
    page.drawText(opts.left, {
      x: MARGIN,
      y: 24,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
    const w = fonts.regular.widthOfTextAtSize(opts.right, 7.5);
    page.drawText(opts.right, {
      x: width - MARGIN - w,
      y: 24,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
    return;
  }
  const text = opts.left ?? opts.right ?? "";
  if (!text) return;
  const w = fonts.regular.widthOfTextAtSize(text, 7.5);
  page.drawText(text, {
    x: width - MARGIN - w,
    y: 24,
    size: 7.5,
    font: fonts.regular,
    color: MUTED,
  });
}

/** Truncate text with an ellipsis so it fits within maxWidth at the given size. */
export function fitText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t.trimEnd()}…`;
}

/* --------------------------- seals & signatures -------------------------- */

/**
 * Draw the "Attested Official Registry Record" block: registrar seal with the
 * registrar signature laid over it, per the official transcript template.
 */
export function drawAttestationBlock(
  page: PDFPage,
  fonts: ThemeFonts,
  images: BrandImages,
  opts: { x: number; topY: number; heading?: boolean },
): number {
  let y = opts.topY;
  const centerX = opts.x;
  if (opts.heading !== false) {
    const t = "Attested Official Registry Record:";
    const w = fonts.bold.widthOfTextAtSize(t, 9);
    page.drawText(t, { x: centerX - w / 2, y, size: 9, font: fonts.bold, color: BLACK });
    y -= 16;
  }
  const sealW = 86;
  drawImageW(page, images.sealRegistrar, centerX - sealW / 2, y, sealW);
  // Signature overlapping the seal
  const sigW = 110;
  const sigH = (images.sigLito.height / images.sigLito.width) * sigW;
  page.drawImage(images.sigLito, {
    x: centerX - sigW / 2,
    y: y - sealW / 2 - sigH / 2,
    width: sigW,
    height: sigH,
  });
  y -= sealW + 14;
  const lines: [string, PDFFont, number][] = [
    ["Office of the Registrar", fonts.bold, 9.5],
    ["Central Global University", fonts.bold, 9.5],
    ["Georgia", fonts.regular, 8.5],
  ];
  for (const [t, f, s] of lines) {
    const w = f.widthOfTextAtSize(t, s);
    page.drawText(t, { x: centerX - w / 2, y, size: s, font: f, color: BLACK });
    y -= 13;
  }
  return y;
}

/**
 * Left-aligned closing block used on letters: registrar seal with the dashed
 * signature over it, above "Office of the Registrar".
 */
export function drawSealedClosing(
  page: PDFPage,
  fonts: ThemeFonts,
  images: BrandImages,
  opts: { x: number; topY: number; lines?: string[] },
): number {
  let y = opts.topY;
  const sealW = 72;
  drawImageW(page, images.sealRegistrar, opts.x, y, sealW);
  const sigW = 96;
  const sigH = (images.sigDashed.height / images.sigDashed.width) * sigW;
  page.drawImage(images.sigDashed, {
    x: opts.x + 14,
    y: y - sealW - sigH / 2 + 26,
    width: sigW,
    height: sigH,
  });
  y -= sealW + 12;
  const lines = opts.lines ?? [
    "Office of the Registrar",
    "Central Global University (CGU)",
    "Georgia Administrative Campus",
  ];
  lines.forEach((t, i) => {
    page.drawText(t, {
      x: opts.x,
      y,
      size: i === 0 ? 10 : 9.5,
      font: i === 0 ? fonts.bold : fonts.regular,
      color: i === lines.length - 1 ? MUTED : BLACK,
    });
    y -= 13;
  });
  return y;
}
