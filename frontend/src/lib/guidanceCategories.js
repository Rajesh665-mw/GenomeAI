// Maps the analysis agent's raw guidance categories onto the five
// patient-facing buckets. This is a presentation-only regrouping — the
// underlying text always comes straight from the analysis result, never
// invented here.
const CATEGORY_MAP = {
  lifestyle: "Lifestyle",
  screening: "Monitoring / Screening",
  management: "When to Seek Professional Advice",
};

const CATEGORY_ORDER = [
  "Lifestyle",
  "Monitoring / Screening",
  "Risk Awareness",
  "When to Seek Professional Advice",
  "General Preventive Measures",
];

export function groupGuidance(guidance, riskAssessment) {
  const buckets = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, []]));

  for (const item of guidance || []) {
    const bucket = CATEGORY_MAP[(item.category || "").toLowerCase()] || "General Preventive Measures";
    buckets[bucket].push(item.text);
  }

  // "Risk Awareness" is populated from the analysis's own risk_assessment
  // data (restated plainly), not from invented advice — there's no raw
  // "risk_awareness" guidance category in the underlying data.
  for (const risk of riskAssessment || []) {
    buckets["Risk Awareness"].push(
      `${risk.disease_name}: categorized as ${risk.risk_level.toLowerCase()} risk based on the analysis (${risk.evidence_confidence_score ?? risk.probability}% variant evidence score).`
    );
  }

  return CATEGORY_ORDER
    .map((category) => ({ category, items: buckets[category] }))
    .filter((group) => group.items.length > 0);
}
