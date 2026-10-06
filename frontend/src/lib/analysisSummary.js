// Builds a short summary sentence purely from the analysis result's own
// structured fields (counts, risk levels) — never invented content.
export function buildAnalysisSummary(result) {
  const diseaseCount = result.diseases.length;
  const verifiedCount = result.verification.length;
  const riskLevels = result.risk_assessment.map((r) => r.risk_level);
  const highestRisk = riskLevels.includes("High") ? "High" : riskLevels.includes("Moderate") ? "Moderate" : riskLevels.includes("Low") ? "Low" : null;

  if (diseaseCount === 0) {
    return `No disease associations were found for ${result.gene_symbol} in this analysis.`;
  }
  let sentence = `This analysis of ${result.gene_symbol} identified ${diseaseCount} associated condition${diseaseCount === 1 ? "" : "s"}`;
  if (highestRisk) sentence += `, with risk levels up to ${highestRisk.toLowerCase()}`;
  sentence += ".";
  if (verifiedCount > 0) {
    sentence += ` ${verifiedCount} association${verifiedCount === 1 ? " was" : "s were"} cross-checked against available evidence.`;
  }
  return sentence;
}
