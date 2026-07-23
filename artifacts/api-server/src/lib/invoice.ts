import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  PRIMARY,
  MUTED,
  BLACK,
  LINE,
  MARGIN,
  WHITE,
  A4_PORTRAIT,
  drawLetterhead,
  drawThemeFooter,
  embedBrandImages,
  drawImageW,
  fitText,
  embedAssetFont,
} from "./pdfTheme";

export interface InvoiceData {
  invoiceNumber: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  reference?: string | null;
  date: Date;
  /** Installment context, e.g. "Installment 2 of 4" (optional). */
  installmentLabel?: string | null;
  /** Institutional discount (kept at 0 until discount codes ship). */
  discount?: number;
  /** Processing & handling fee (0 unless charged). */
  processingFee?: number;
}

const TABLE_HEADER_BG = PRIMARY;
const ROW_ALT = rgb(0.955, 0.945, 0.965);

function money(currency: string, value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${currency} ${Math.abs(value).toFixed(2)}`;
}

/**
 * Generate a one-page PDF invoice matching the official CGU financial invoice
 * layout: Billed From / Billed To, academic fees table (rate / qty / amount),
 * subtotal + institutional discount + processing lines, purple total band,
 * and bank transfer instructions — on the shared registrar letterhead theme.
 */
export async function generateInvoice(data: InvoiceData): Promise<Uint8Array> {
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
      office: "Office of Global Enrollment & Financial Operations",
      contactLines: [
        "#33, Tsereteli St, Kutaisi, Georgia",
        "Official Portal: www.cgu.edu.ge",
        "Bursar Desk: bursar@cgu.edu.ge",
      ],
      docLabel: "INVOICE",
    },
    images,
  );

  const fmtDate = data.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* ------------------------- invoice meta (right) ------------------------ */
  let y = contentTop;
  const metaRows: [string, string][] = [
    ["Invoice No.", data.invoiceNumber],
    ["Invoice Date", fmtDate],
    ["Status", data.status.toUpperCase()],
  ];
  const metaLabelX = width - margin - 210;
  const metaValueX = width - margin - 120;
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: metaLabelX, y, size: 9.5, font, color: MUTED });
    page.drawText(value, { x: metaValueX, y, size: 9.5, font: fontBold, color: BLACK });
    y -= 15;
  }

  /* ------------------------ Billed From / Billed To ----------------------- */
  let leftY = contentTop;
  page.drawText("BILLED FROM", { x: margin, y: leftY, size: 9.5, font: fontBold, color: MUTED });
  leftY -= 15;
  page.drawText("CENTRAL GLOBAL UNIVERSITY", { x: margin, y: leftY, size: 10.5, font: fontBold, color: BLACK });
  leftY -= 13;
  page.drawText("#33, Tsereteli St, Kutaisi, Georgia", { x: margin, y: leftY, size: 9.5, font, color: MUTED });

  y -= 14;
  page.drawText("BILLED TO", { x: metaLabelX, y, size: 9.5, font: fontBold, color: MUTED });
  y -= 15;
  page.drawText(fitText(data.studentName, fontBold, 10.5, margin + 210), {
    x: metaLabelX,
    y,
    size: 10.5,
    font: fontBold,
    color: BLACK,
  });
  y -= 13;
  page.drawText(fitText(data.studentEmail, font, 9.5, margin + 210), {
    x: metaLabelX,
    y,
    size: 9.5,
    font,
    color: MUTED,
  });

  /* ------------------------------ fees table ------------------------------ */
  let tableY = Math.min(leftY, y) - 34;
  const tableW = width - margin * 2;
  const colDesc = margin + 10;
  const colRate = margin + tableW * 0.52;
  const colQty = margin + tableW * 0.68;
  const colAmount = width - margin - 10;

  page.drawRectangle({
    x: margin,
    y: tableY - 8,
    width: tableW,
    height: 26,
    color: TABLE_HEADER_BG,
  });
  page.drawText("DESCRIPTION OF ACADEMIC FEES & SERVICES", { x: colDesc, y: tableY, size: 8.5, font: fontBold, color: WHITE });
  page.drawText("RATE", { x: colRate, y: tableY, size: 8.5, font: fontBold, color: WHITE });
  page.drawText("QTY", { x: colQty, y: tableY, size: 8.5, font: fontBold, color: WHITE });
  {
    const t = `AMOUNT (${data.currency})`;
    const w = fontBold.widthOfTextAtSize(t, 8.5);
    page.drawText(t, { x: colAmount - w, y: tableY, size: 8.5, font: fontBold, color: WHITE });
  }

  tableY -= 32;
  const description = data.installmentLabel
    ? `Tuition Fees — ${data.courseTitle} (${data.installmentLabel})`
    : `Tuition Fees — ${data.courseTitle}`;
  // Wrap the description onto up to two lines so long titles stay readable.
  const descMaxW = colRate - colDesc - 14;
  const words = description.split(" ");
  let line1 = "";
  let rest = "";
  for (const w of words) {
    const candidate = line1 ? `${line1} ${w}` : w;
    if (!rest && font.widthOfTextAtSize(candidate, 10) <= descMaxW) {
      line1 = candidate;
    } else {
      rest = rest ? `${rest} ${w}` : w;
    }
  }
  const line2 = rest ? fitText(rest, font, 10, descMaxW) : null;
  const rowH = line2 ? 40 : 26;
  page.drawRectangle({ x: margin, y: tableY - (rowH - 18), width: tableW, height: rowH, color: ROW_ALT });
  page.drawText(line1, { x: colDesc, y: tableY, size: 10, font, color: BLACK });
  if (line2) {
    page.drawText(line2, { x: colDesc, y: tableY - 14, size: 10, font, color: BLACK });
  }
  page.drawText(data.amount.toFixed(2), { x: colRate, y: tableY, size: 10, font, color: BLACK });
  page.drawText("1", { x: colQty, y: tableY, size: 10, font, color: BLACK });
  {
    const t = money(data.currency, data.amount);
    const w = font.widthOfTextAtSize(t, 10);
    page.drawText(t, { x: colAmount - w, y: tableY, size: 10, font, color: BLACK });
  }

  tableY -= line2 ? 30 : 16;
  page.drawLine({ start: { x: margin, y: tableY }, end: { x: width - margin, y: tableY }, thickness: 1, color: LINE });

  /* ------------------- totals (right) + instructions (left) --------------- */
  const discount = data.discount ?? 0;
  const processing = data.processingFee ?? 0;
  const total = data.amount - discount + processing;

  const totalsLabelX = margin + tableW * 0.52;
  let totalsY = tableY - 26;
  const totalsRows: [string, string, boolean][] = [
    ["Subtotal:", money(data.currency, data.amount), false],
    ["Institutional Discount / Grant:", money(data.currency, -discount), false],
    ["Processing & Handling:", money(data.currency, processing), false],
  ];
  for (const [label, value, _] of totalsRows) {
    page.drawText(label, { x: totalsLabelX, y: totalsY, size: 9.5, font, color: BLACK });
    const w = fontBold.widthOfTextAtSize(value, 9.5);
    page.drawText(value, { x: colAmount - w, y: totalsY, size: 9.5, font: fontBold, color: BLACK });
    totalsY -= 20;
  }
  // Purple total band
  page.drawRectangle({
    x: totalsLabelX - 10,
    y: totalsY - 8,
    width: width - margin - totalsLabelX + 10,
    height: 26,
    color: PRIMARY,
  });
  page.drawText("Total Amount Due:", { x: totalsLabelX, y: totalsY, size: 10.5, font: fontBold, color: WHITE });
  {
    const t = money(data.currency, total);
    const w = fontBold.widthOfTextAtSize(t, 10.5);
    page.drawText(t, { x: colAmount - w, y: totalsY, size: 10.5, font: fontBold, color: WHITE });
  }

  // Payment instructions (left column, aligned with totals)
  let instrY = tableY - 26;
  page.drawText("Payment Instructions or Other Notes", { x: margin, y: instrY, size: 10.5, font: fontBold, color: BLACK });
  instrY -= 18;
  page.drawText("Bank to Bank Transfer", { x: margin, y: instrY, size: 9.5, font: fontBold, color: BLACK });
  instrY -= 14;
  const bankLines = [
    "Bank of Georgia",
    "Name: Central Global University",
    "Account: GE36BG0000000588977857",
    "Beneficiary Bank Code: BAGAGE22",
    "Beneficiary Bank: Central Branch Tbilisi",
  ];
  for (const line of bankLines) {
    page.drawText(line, { x: margin, y: instrY, size: 9.5, font, color: BLACK });
    instrY -= 14;
  }

  /* ------------------------- payment record block ------------------------- */
  instrY -= 12;
  page.drawText("PAYMENT RECORD", { x: margin, y: instrY, size: 9, font: fontBold, color: MUTED });
  instrY -= 14;
  page.drawText(`Method: ${data.provider.toUpperCase()}`, { x: margin, y: instrY, size: 9.5, font, color: BLACK });
  if (data.reference) {
    instrY -= 14;
    page.drawText(
      fitText(`Transaction Reference: ${data.reference}`, font, 9.5, tableW * 0.5),
      { x: margin, y: instrY, size: 9.5, font, color: BLACK },
    );
  }

  /* ------------------------------ seal + footer --------------------------- */
  const sealW = 76;
  drawImageW(page, images.sealRegistrar, (width - sealW) / 2, Math.min(instrY, totalsY) - 44, sealW);

  drawThemeFooter(page, fonts, {
    left: "Central Global University • Official Financial Invoice",
    right: "Page 1 of 1",
  });

  return doc.save();
}
