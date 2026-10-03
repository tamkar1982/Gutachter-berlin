import { readFile } from "fs/promises";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const pageSize: [number, number] = [595, 842];
const margin = 48;
const disclaimer = "Unverbindliche KI-basierte Ersteinschaetzung";

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function money(value: number) {
  return `${value.toLocaleString("de-DE")} EUR`;
}

function cleanText(value: string) {
  return value
    .replaceAll("€", "EUR")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ß", "ss");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = cleanText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      line = nextLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

async function embedPhoto(pdf: PDFDocument, filePath: string, mimeType: string) {
  const bytes = await readFile(filePath);
  if (mimeType.includes("png") || filePath.toLowerCase().endsWith(".png")) {
    return pdf.embedPng(bytes);
  }
  if (
    mimeType.includes("jpeg") ||
    mimeType.includes("jpg") ||
    filePath.toLowerCase().endsWith(".jpg") ||
    filePath.toLowerCase().endsWith(".jpeg")
  ) {
    return pdf.embedJpg(bytes);
  }
  return null;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const inspection = await prisma.inspection.findUnique({
    where: { id },
    include: { vehicle: true, estimate: true, photos: true }
  });

  if (!inspection?.estimate) {
    return NextResponse.json({ error: "Es liegt noch keine Kostenschaetzung vor." }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { estimate, vehicle } = inspection;

  let page = pdf.addPage(pageSize);
  let y = 790;

  const ensureSpace = (height: number) => {
    if (y - height > 54) return;
    page = pdf.addPage(pageSize);
    y = 790;
  };

  const text = (
    value: string,
    x: number,
    size = 11,
    font = regular,
    color = rgb(0.1, 0.14, 0.2),
    maxWidth = 495
  ) => {
    const lines = wrapText(value, font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 8);
      page.drawText(line, { x, y, size, font, color });
      y -= size + 6;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(40);
    y -= 10;
    page.drawText(cleanText(title), { x: margin, y, size: 15, font: bold, color: rgb(0.05, 0.1, 0.18) });
    y -= 18;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 547, y },
      thickness: 1,
      color: rgb(0.78, 0.84, 0.9)
    });
    y -= 14;
  };

  const bulletList = (items: string[]) => {
    const safeItems = items.length ? items : ["Keine eindeutige Angabe erkannt."];
    for (const item of safeItems) {
      text(`- ${item}`, 62, 11, regular, rgb(0.18, 0.24, 0.33), 470);
    }
  };

  page.drawRectangle({ x: 0, y: 724, width: 595, height: 118, color: rgb(0.04, 0.14, 0.19) });
  page.drawText(disclaimer, { x: margin, y: 794, size: 11, font: bold, color: rgb(0.45, 0.95, 0.86) });
  page.drawText("KI-Schadensbericht", { x: margin, y: 758, size: 28, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Bericht-ID: ${inspection.id}`, { x: margin, y: 735, size: 10, font: regular, color: rgb(0.8, 0.9, 0.94) });
  y = 692;

  page.drawRectangle({ x: margin, y: y - 88, width: 499, height: 100, color: rgb(0.95, 0.98, 0.99) });
  page.drawText("Fahrzeug", { x: 64, y: y - 16, size: 12, font: bold, color: rgb(0.06, 0.36, 0.34) });
  page.drawText(cleanText(`${vehicle.make} ${vehicle.model}`), { x: 64, y: y - 40, size: 17, font: bold, color: rgb(0.05, 0.1, 0.18) });
  page.drawText(`Baujahr ${vehicle.year}`, { x: 64, y: y - 64, size: 11, font: regular, color: rgb(0.22, 0.29, 0.38) });
  page.drawText(`${vehicle.mileage.toLocaleString("de-DE")} km`, { x: 190, y: y - 64, size: 11, font: regular, color: rgb(0.22, 0.29, 0.38) });
  page.drawText("Geschaetzte Gesamtkosten", { x: 344, y: y - 16, size: 12, font: bold, color: rgb(0.06, 0.36, 0.34) });
  page.drawText(money(estimate.totalCost), { x: 344, y: y - 45, size: 22, font: bold, color: rgb(0.05, 0.1, 0.18) });
  page.drawText(`Konfidenz ${Math.round(estimate.confidence * 100)} %`, { x: 344, y: y - 67, size: 11, font: regular, color: rgb(0.22, 0.29, 0.38) });
  y -= 124;

  sectionTitle("Kostenaufschluesselung");
  const costRows = [
    ["Teile / Bauteile", money(estimate.partsCost)],
    ["Lackierung", money(estimate.paintCost)],
    ["Arbeitszeit", `${estimate.estimatedLaborHours} h x 120 EUR = ${money(estimate.laborCost)}`],
    ["Gesamt", money(estimate.totalCost)]
  ];

  for (const [label, value] of costRows) {
    ensureSpace(30);
    page.drawText(label, { x: margin, y, size: 11, font: label === "Gesamt" ? bold : regular, color: rgb(0.1, 0.14, 0.2) });
    page.drawText(value, { x: 360, y, size: 11, font: label === "Gesamt" ? bold : regular, color: rgb(0.1, 0.14, 0.2) });
    y -= 22;
  }

  sectionTitle("KI-Bewertung");
  text(`Lackierung erforderlich: ${estimate.paintRequired ? "Ja" : "Nein"}`, margin, 11, bold);
  y -= 4;
  text("Erkannte beschaedigte Teile", margin, 12, bold);
  bulletList(asStringList(estimate.damagedParts));
  y -= 4;
  text("Schadensbeschreibung", margin, 12, bold);
  bulletList(asStringList(estimate.damageDescriptions));
  y -= 4;
  text("Empfohlene Reparaturschritte", margin, 12, bold);
  bulletList(asStringList(estimate.repairActions));

  const photos = inspection.photos;
  page = pdf.addPage(pageSize);
  y = 790;
  sectionTitle("Fotodokumentation");
  if (!photos.length) {
    text("Keine Fotos im Bericht vorhanden.", margin);
  }

  const photoWidth = 232;
  const photoHeight = 168;
  const columnGap = 31;
  const rowGap = 38;
  const labelHeight = 18;
  const photoCardHeight = photoHeight + labelHeight;
  const photoPositions = [
    { x: margin, y: 706 },
    { x: margin + photoWidth + columnGap, y: 706 },
    { x: margin, y: 706 - photoCardHeight - rowGap },
    { x: margin + photoWidth + columnGap, y: 706 - photoCardHeight - rowGap },
    { x: margin, y: 706 - (photoCardHeight + rowGap) * 2 }
  ];

  for (const [index, photo] of photos.entries()) {
    if (index > 0 && index % photoPositions.length === 0) {
      page = pdf.addPage(pageSize);
      y = 790;
      sectionTitle("Fotodokumentation");
    }

    const position = photoPositions[index % photoPositions.length];
    let image: PDFImage | null = null;
    try {
      image = await embedPhoto(pdf, photo.filePath, photo.mimeType);
    } catch {
      image = null;
    }

    page.drawRectangle({
      x: position.x,
      y: position.y - photoHeight,
      width: photoWidth,
      height: photoHeight,
      color: rgb(0.94, 0.96, 0.98)
    });
    page.drawRectangle({
      x: position.x,
      y: position.y - photoHeight - labelHeight,
      width: photoWidth,
      height: labelHeight,
      color: rgb(0.88, 0.94, 0.95)
    });

    if (image) {
      const scaled = image.scaleToFit(photoWidth - 12, photoHeight - 12);
      page.drawImage(image, {
        x: position.x + (photoWidth - scaled.width) / 2,
        y: position.y - photoHeight + (photoHeight - scaled.height) / 2,
        width: scaled.width,
        height: scaled.height
      });
    } else {
      page.drawText("Bildformat nicht eingebettet", {
        x: position.x + 18,
        y: position.y - 88,
        size: 10,
        font: regular,
        color: rgb(0.45, 0.5, 0.58)
      });
    }

    page.drawText(cleanText(photo.label), {
      x: position.x + 8,
      y: position.y - photoHeight - 13,
      size: 10,
      font: bold,
      color: rgb(0.1, 0.14, 0.2)
    });
  }

  page = pdf.addPage(pageSize);
  y = 790;
  sectionTitle("Hinweis");
  text(
    "Diese Einschaetzung wurde KI-basiert aus den bereitgestellten Fotos erstellt. Sie ersetzt kein Gutachten, keine Demontagepruefung und keine verbindliche Reparaturzusage. Verdeckte Schaeden koennen die tatsaechlichen Kosten veraendern.",
    margin,
    10,
    regular,
    rgb(0.35, 0.4, 0.48)
  );

  const pages = pdf.getPages();
  pages.forEach((pdfPage: PDFPage, index: number) => {
    pdfPage.drawText(`${disclaimer} · Seite ${index + 1}/${pages.length}`, {
      x: margin,
      y: 28,
      size: 8,
      font: regular,
      color: rgb(0.45, 0.5, 0.58)
    });
  });

  const bytes = Buffer.from(await pdf.save());
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ki-schadensbericht-${inspection.id}.pdf"`
    }
  });
}
