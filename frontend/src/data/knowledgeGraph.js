export const KG_NODES = [
  { id: "gene", type: "gene", label: "BRCA1", x: 90, y: 250, detail: "Tumor suppressor gene; pathogenic variants sharply raise lifetime cancer risk." },
  { id: "gene2", type: "gene", label: "TP53", x: 90, y: 410, detail: "A related tumor suppressor gene sometimes co-assessed in the same panel." },
  { id: "protein", type: "protein", label: "BRCA1 Protein", x: 300, y: 250, detail: "The protein product responsible for DNA double-strand break repair." },
  { id: "mutation", type: "mutation", label: "185delAG", x: 300, y: 90, detail: "A common frameshift mutation associated with hereditary cancer risk." },
  { id: "disease1", type: "disease", label: "Breast Cancer", x: 520, y: 140, detail: "Elevated lifetime risk when BRCA1 repair function is disrupted." },
  { id: "disease2", type: "disease", label: "Ovarian Cancer", x: 520, y: 380, detail: "A secondary cancer risk linked to loss of BRCA1 function." },
  { id: "guidance1", type: "guidance", label: "Enhanced Screening", x: 740, y: 140, detail: "Earlier and more frequent screening recommended for carriers." },
  { id: "guidance2", type: "guidance", label: "Preventive Surgery Options", x: 740, y: 380, detail: "Risk-reducing surgical options discussed with a specialist." },
];



export const KG_EDGES = [
  { from: "gene", to: "mutation", weak: false },
  { from: "gene", to: "protein", weak: false },
  { from: "gene", to: "gene2", weak: true },
  { from: "gene2", to: "disease2", weak: true },
  { from: "mutation", to: "disease1", weak: false },
  { from: "protein", to: "disease1", weak: false },
  { from: "protein", to: "disease2", weak: false },
  { from: "disease1", to: "guidance1", weak: false },
  { from: "disease2", to: "guidance2", weak: false },
];



export const KG_TYPE_LABEL = {
  gene: "Gene",
  protein: "Protein",
  mutation: "Mutation",
  disease: "Disease",
  guidance: "Guidance",
};


