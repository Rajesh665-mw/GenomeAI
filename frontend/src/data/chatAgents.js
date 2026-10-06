// Maps the Gemini planner's tool names (app/agents/tools.py, backend) to
// display labels for the chat's live agent-execution timeline.
export const TOOL_DISPLAY = {
  validate_gene: { label: "Gene Validation Agent", verb: "Validating gene" },
  get_disease_associations: { label: "Disease Analysis Agent", verb: "Retrieving disease associations" },
  assess_genetic_risk: { label: "Risk Assessment Agent", verb: "Assessing genetic risk" },
  verify_disease_associations: { label: "Verification Agent", verb: "Cross-checking against ClinVar / NCBI" },
  get_research_literature: { label: "Biomedical Research Agent", verb: "Searching recent literature" },
  get_preventive_guidance: { label: "Preventive Guidance Agent", verb: "Building preventive guidance" },
  explain_findings: { label: "Explainability Agent", verb: "Explaining the reasoning chain" },
  generate_report: { label: "Report Generation Agent", verb: "Generating downloadable report" },
};

export function toolDisplay(name) {
  return TOOL_DISPLAY[name] || { label: name, verb: `Running ${name}` };
}

export const SUGGESTED_PROMPTS = [
  "Analyze BRCA1",
  "Compare BRCA1 and TP53",
  "Explain CFTR",
  "Show diseases associated with APOE",
  "Generate report for BRCA1",
  "Latest research on TP53",
];
