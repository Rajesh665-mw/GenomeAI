export const WORKFLOW_STEPS = [
  {
    id: "input",
    title: "Gene Input",
    text: "Enter a gene symbol or upload variant data to start the pipeline.",
    icon: (
      <path d="M12 4v16m0-16l-5 5m5-5l5 5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    id: "disease",
    title: "Disease Analysis",
    text: "The Disease Analysis Agent correlates markers against known pathogenic patterns.",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
        <path d="M20 20l-4.3-4.3" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "verification",
    title: "Verification",
    text: "Every candidate finding is cross-checked against ClinVar, OMIM, and NCBI.",
    icon: (
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M9 12l2 2 4-4"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "guidance",
    title: "Preventive Guidance",
    text: "Confirmed risks are translated into a personalized preventive care plan.",
    icon: (
      <path
        d="M12 20s-7-4.35-7-9.5C5 7.5 7.2 5.5 10 5.5c1.6 0 2.7.8 3.5 2 .8-1.2 1.9-2 3.5-2 2.8 0 5 2 5 5C22 15.65 12 20 12 20z"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "research",
    title: "Research Recommendation",
    text: "Relevant recent publications are retrieved and ranked for deeper reading.",
    icon: (
      <path
        d="M4 5.5A2.5 2.5 0 016.5 3H12v18H6.5A2.5 2.5 0 014 18.5v-13zM20 5.5A2.5 2.5 0 0017.5 3H12v18h5.5a2.5 2.5 0 002.5-2.5v-13z"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: "report",
    title: "Report Generation",
    text: "All agent outputs are compiled into a structured, exportable report.",
    icon: (
      <>
        <path d="M7 3h7l4 4v14H7z" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M14 3v4h4M9.5 12.5h5M9.5 15.5h5M9.5 9.5h2" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
];

