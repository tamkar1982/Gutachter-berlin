export const pricing = {
  parts: {
    "Stoßfänger": 450,
    Stossfaenger: 450,
    Kotflügel: 350,
    Kotfluegel: 350,
    Tür: 900,
    Tuer: 900,
    Lackierung: 350
  },
  paint: 350,
  laborHour: 120
} as const;

export type AiDamageResult = {
  damagedParts: string[];
  damageDescriptions: string[];
  repairActions: string[];
  paintRequired: boolean;
  estimatedLaborHours: number;
  confidence: number;
};

export function calculateEstimate(analysis: AiDamageResult) {
  const partsCost = analysis.damagedParts.reduce((sum, part) => {
    const exactPrice = pricing.parts[part as keyof typeof pricing.parts];
    if (exactPrice) {
      return sum + exactPrice;
    }

    const normalizedPart = part.toLowerCase();
    if (normalizedPart.includes("stoß") || normalizedPart.includes("stoss")) return sum + 450;
    if (normalizedPart.includes("kotfl")) return sum + 350;
    if (normalizedPart.includes("tür") || normalizedPart.includes("tuer")) return sum + 900;
    return sum + 300;
  }, 0);

  const paintCost = analysis.paintRequired ? pricing.paint : 0;
  const laborCost = Math.round(analysis.estimatedLaborHours * pricing.laborHour);

  return {
    partsCost,
    paintCost,
    laborCost,
    totalCost: partsCost + paintCost + laborCost
  };
}
