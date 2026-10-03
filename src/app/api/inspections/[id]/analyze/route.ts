import { NextResponse } from "next/server";
import { calculateEstimate } from "@/config/pricing";
import { analyzeDamagePhotos } from "@/lib/openaiVision";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const inspection = await prisma.inspection.findUnique({
    where: { id },
    include: { photos: true, estimate: true, vehicle: true }
  });

  if (!inspection) {
    return NextResponse.json({ error: "Analyse nicht gefunden." }, { status: 404 });
  }

  if (inspection.estimate) {
    return NextResponse.json({ inspection });
  }

  await prisma.inspection.update({ where: { id }, data: { status: "analyzing" } });

  const analysis = await analyzeDamagePhotos(inspection.photos);
  const costs = calculateEstimate(analysis);

  const estimate = await prisma.estimate.create({
    data: {
      inspectionId: id,
      damagedParts: analysis.damagedParts,
      damageDescriptions: analysis.damageDescriptions,
      repairActions: analysis.repairActions,
      paintRequired: analysis.paintRequired,
      estimatedLaborHours: analysis.estimatedLaborHours,
      confidence: analysis.confidence,
      partsCost: costs.partsCost,
      paintCost: costs.paintCost,
      laborCost: costs.laborCost,
      totalCost: costs.totalCost
    }
  });

  const updatedInspection = await prisma.inspection.update({
    where: { id },
    data: { status: "completed" },
    include: { vehicle: true, photos: true }
  });

  return NextResponse.json({
    inspection: { ...updatedInspection, estimate },
    disclaimer: "Unverbindliche KI-basierte Ersteinschätzung"
  });
}
