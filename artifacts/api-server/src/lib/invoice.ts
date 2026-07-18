import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  PRIMARY,
  MUTED,
  BLACK,
  LINE,
  TABLE_BG,
  MARGIN,
  A4_PORTRAIT,
  drawLetterhead,
  drawThemeFooter,
  drawSealedClosing,
  embedBrandImages,
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
}

/**
 * Generate a one-page PDF invoice / receipt and return the raw bytes.
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
      office: "Office of the Bursar",
      contactLines: [
        "Campus & Administrative Hub: Georgia",
        "Official Portal: www.cgu.edu.ge",
        "Bursar Desk: bursar@cgu.edu.ge",
      ],
      docLabel: "INVOICE",
    },
    images,
  );

  let y = contentTop;

  const fmtDate = data.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Meta block (right aligned labels)
  const metaRows: [string, string][] = [
    ["Invoice No.", data.invoiceNumber],
    ["Date", fmtDate],
    ["Status", data.status.toUpperCase()],
  ];
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: width - margin - 220, y, size: 10, font, color: MUTED });
    page.drawText(value, { x: width - margin - 110, y, size: 10, font: fontBold, color: BLACK });
    y -= 16;
  }

  // Bill to
  y = contentTop;
  page.drawText("BILL TO", { x: margin, y, size: 10, font: fontBold, color: MUTED });
  y -= 18;
  page.drawText(data.studentName, { x: margin, y, size: 12, font: fontBold, color: BLACK });
  y -= 16;
  page.drawText(data.studentEmail, { x: margin, y, size: 10, font, color: MUTED });

  // Table header
  y = contentTop - 100;
  page.drawRectangle({ x: margin, y: y - 6, width: width - margin * 2, height: 26, color: TABLE_BG });
  page.drawText("DESCRIPTION", { x: margin + 10, y, size: 10, font: fontBold, color: PRIMARY });
  page.drawText("AMOUNT", { x: width - margin - 90, y, size: 10, font: fontBold, color: PRIMARY });

  y -= 34;
  page.drawText(
    fitText(`Tuition — ${data.courseTitle}`, font, 11, width - margin * 2 - 130),
    { x: margin + 10, y, size: 11, font, color: BLACK },
  );
  page.drawText(`${data.currency} ${data.amount.toFixed(2)}`, {
    x: width - margin - 90,
    y,
    size: 11,
    font,
    color: BLACK,
  });

  y -= 18;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE });

  // Total
  y -= 28;
  page.drawText("TOTAL", { x: width - margin - 200, y, size: 12, font: fontBold, color: BLACK });
  page.drawText(`${data.currency} ${data.amount.toFixed(2)}`, {
    x: width - margin - 90,
    y,
    size: 12,
    font: fontBold,
    color: PRIMARY,
  });

  // Payment details
  y -= 60;
  page.drawText("PAYMENT DETAILS", { x: margin, y, size: 10, font: fontBold, color: MUTED });
  y -= 18;
  page.drawText(`Method: ${data.provider}`, { x: margin, y, size: 10, font, color: BLACK });
  if (data.reference) {
    y -= 14;
    page.drawText(`Transaction Reference: ${data.reference}`, { x: margin, y, size: 10, font, color: BLACK });
  }

  // Sealed closing (registrar seal + signature)
  y -= 40;
  drawSealedClosing(page, fonts, images, {
    x: margin,
    topY: y,
    lines: [
      "Office of the Bursar",
      "Central Global University (CGU)",
      "Georgia Administrative Campus",
    ],
  });

  // Footer
  drawThemeFooter(page, fonts, {
    left: "Official Payment Receipt | Central Global University",
  });

  return doc.save();
}
