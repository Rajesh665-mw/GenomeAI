export const AGENTS = [
  {
    id: "disease",
    name: "Disease Analysis Agent",
    short: "Correlates genetic markers",
    detail:
      "Scans the input gene and its known variants, correlating them against pathogenic mutation patterns to surface likely disease associations.",
  },
  {
    id: "verification",
    name: "Verification Agent",
    short: "Cross-checks the evidence",
    detail:
      "Validates every candidate finding against ClinVar, OMIM, and NCBI records before it's allowed to reach the final report.",
  },
  {
    id: "guidance",
    name: "Preventive Guidance Agent",
    short: "Builds the care plan",
    detail:
      "Converts confirmed genetic risk into personalized, actionable preventive guidance — screening cadence, lifestyle factors, specialist referrals.",
  },
  {
    id: "research",
    name: "Research Agent",
    short: "Retrieves the literature",
    detail:
      "Continuously retrieves and ranks the most relevant recent publications tied to the identified gene and condition from PubMed and beyond.",
  },
  {
    id: "explainability",
    name: "Explainability Agent",
    short: "Explains the reasoning",
    detail:
      "Breaks the full reasoning chain down into plain-language explanations, so every conclusion is traceable back to its supporting evidence.",
  },
  {
    id: "report",
    name: "Report Generation Agent",
    short: "Compiles the report",
    detail:
      "Assembles every agent's output into a single structured, exportable clinical report ready for review or download.",
  },
];

