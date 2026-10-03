import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requiredPhotoLabels } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const make = String(formData.get("make") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const year = Number(formData.get("year"));
  const mileage = Number(formData.get("mileage"));

  if (!make || !model || !year || !mileage) {
    return NextResponse.json({ error: "Fahrzeugdaten sind unvollständig." }, { status: 400 });
  }

  const files = requiredPhotoLabels.map((label) => ({ label, file: formData.get(label) }));
  if (files.some(({ file }) => !(file instanceof File) || file.size === 0)) {
    return NextResponse.json({ error: "Alle fünf Pflichtfotos müssen hochgeladen werden." }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.create({
    data: { make, model, year, mileage }
  });
  const inspection = await prisma.inspection.create({
    data: { vehicleId: vehicle.id }
  });

  const uploadDir = path.join(process.cwd(), "public", "uploads", inspection.id);
  await mkdir(uploadDir, { recursive: true });

  for (const { label, file } of files) {
    const photoFile = file as File;
    const extension = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = `${label.replace(/\s+/g, "-").toLowerCase()}.${extension}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await writeFile(filePath, buffer);

    await prisma.photo.create({
      data: {
        inspectionId: inspection.id,
        label,
        filePath,
        mimeType: photoFile.type || "image/jpeg"
      }
    });
  }

  return NextResponse.json({ inspectionId: inspection.id });
}
