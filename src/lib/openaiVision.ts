import { readFile } from "fs/promises";
import OpenAI from "openai";
import type { AiDamageResult } from "@/config/pricing";

const fallbackAnalysis: AiDamageResult = {
  damagedParts: ["Stoßfänger", "Kotflügel", "Lackierung"],
  damageDescriptions: [
    "Sichtbare Kratzer und Verformungen im Schadensbereich.",
    "Mögliche Lackbeschädigung an angrenzenden Bauteilen."
  ],
  repairActions: ["Bauteile prüfen und instandsetzen", "Beschädigte Flächen lackieren"],
  paintRequired: true,
  estimatedLaborHours: 6,
  confidence: 0.62
};

function normalizeAnalysis(value: unknown): AiDamageResult {
  const data = value as Partial<AiDamageResult>;

  return {
    damagedParts: Array.isArray(data.damagedParts) ? data.damagedParts.map(String) : [],
    damageDescriptions: Array.isArray(data.damageDescriptions) ? data.damageDescriptions.map(String) : [],
    repairActions: Array.isArray(data.repairActions) ? data.repairActions.map(String) : [],
    paintRequired: Boolean(data.paintRequired),
    estimatedLaborHours: Number(data.estimatedLaborHours) || 0,
    confidence: Math.min(1, Math.max(0, Number(data.confidence) || 0))
  };
}

export async function analyzeDamagePhotos(
  photos: { filePath: string; mimeType: string; label: string }[]
): Promise<AiDamageResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnalysis;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imageContent = await Promise.all(
    photos.map(async (photo) => {
      const image = await readFile(photo.filePath);
      return {
        type: "image_url" as const,
        image_url: {
          url: `data:${photo.mimeType};base64,${image.toString("base64")}`
        }
      };
    })
  );

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Du bewertest Fahrzeugschäden auf Fotos. Antworte ausschließlich als JSON mit diesen Keys: "damagedParts", "damageDescriptions", "repairActions", "paintRequired", "estimatedLaborHours", "confidence". Keine zusätzlichen Felder.'
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Erstelle eine unverbindliche KI-basierte Ersteinschätzung des sichtbaren Fahrzeugschadens. Nutze kurze deutsche Begriffe für Bauteile."
          },
          ...imageContent
        ]
      }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    return fallbackAnalysis;
  }

  return normalizeAnalysis(JSON.parse(content));
}
