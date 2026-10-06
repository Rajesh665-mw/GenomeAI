"""
Mock biomedical data, used internally by the service layer only.

This deliberately lives inside `app/services/`, NOT in `app/datasets/` —
`app/datasets/` is reserved empty space for real data files later (see its
README). This module is throwaway scaffolding: when real datasets are
wired up, this file gets deleted and each service's internals change to
query a DatasetLoader/DB instead. No agent code changes either way.

Covers the same six example genes already used in the frontend demo, plus
a generic fallback so arbitrary gene symbols still produce a coherent
(clearly synthetic) response instead of an error.
"""

GENES = {
    "BRCA1": {
        "name": "BRCA1 DNA repair associated",
        "aliases": ["BRCC1", "PPP1R53", "RNF53"],
        "chromosome": "17q21.31",
        "description": "Tumor suppressor gene involved in DNA double-strand break repair.",
    },
    "TP53": {
        "name": "Tumor protein P53",
        "aliases": ["LFS1", "P53"],
        "chromosome": "17p13.1",
        "description": "Regulates the cell cycle and functions as a tumor suppressor.",
    },
    "CFTR": {
        "name": "CF transmembrane conductance regulator",
        "aliases": ["ABCC7", "CF"],
        "chromosome": "7q31.2",
        "description": "Encodes a chloride channel; variants cause cystic fibrosis.",
    },
    "EGFR": {
        "name": "Epidermal growth factor receptor",
        "aliases": ["ERBB", "ERBB1", "HER1"],
        "chromosome": "7p11.2",
        "description": "Cell surface receptor implicated in several cancers when mutated.",
    },
    "KRAS": {
        "name": "KRAS proto-oncogene, GTPase",
        "aliases": ["KRAS2", "RASK2"],
        "chromosome": "12p12.1",
        "description": "Commonly mutated oncogene across multiple solid tumors.",
    },
    "APOE": {
        "name": "Apolipoprotein E",
        "aliases": ["AD2", "APO-E"],
        "chromosome": "19q13.32",
        "description": "Involved in lipid metabolism; the e4 allele is a risk factor for Alzheimer's disease.",
    },
}

DISEASES_BY_GENE = {
    "BRCA1": [
        {"name": "Hereditary Breast and Ovarian Cancer Syndrome", "category": "Oncology", "probability": 72},
        {"name": "Fanconi Anemia, complementation group S", "category": "Hematology", "probability": 8},
    ],
    "TP53": [
        {"name": "Li-Fraumeni Syndrome (Early-Onset Breast Cancer & Sarcomas)", "category": "Oncology", "probability": 65},
        {"name": "Adrenocortical Carcinoma", "category": "Oncology", "probability": 14},
    ],
    "CFTR": [
        {"name": "Cystic Fibrosis", "category": "Pulmonology", "probability": 88},
        {"name": "Congenital Bilateral Absence of the Vas Deferens", "category": "Urology", "probability": 22},
    ],
    "EGFR": [
        {"name": "Non-Small Cell Lung Cancer", "category": "Oncology", "probability": 58},
    ],
    "KRAS": [
        {"name": "Colorectal Cancer", "category": "Oncology", "probability": 61},
        {"name": "Noonan Syndrome", "category": "Developmental", "probability": 6},
    ],
    "APOE": [
        {"name": "Late-Onset Alzheimer's Disease", "category": "Neurology", "probability": 45},
        {"name": "Cardiovascular Disease Risk", "category": "Cardiology", "probability": 30},
    ],
}

RESEARCH_BY_GENE = {
    "BRCA1": [
        {
            "title": "BRCA1 mutation spectrum and cancer risk stratification",
            "journal": "J. Clin. Oncol.",
            "year": 2025,
            "url": "https://example.org/research/brca1-spectrum",
            "summary": "Reviews contemporary variant classification and its effect on risk estimates.",
        },
        {
            "title": "Population screening outcomes for hereditary cancer genes",
            "journal": "Nature Medicine",
            "year": 2025,
            "url": "https://example.org/research/population-screening",
            "summary": "Evaluates outcomes of population-level BRCA1/2 screening programs.",
        },
    ],
}

GUIDANCE_BY_CATEGORY = {
    "Oncology": [
        {"category": "screening", "text": "Discuss enhanced screening frequency and imaging modality with a specialist."},
        {"category": "lifestyle", "text": "General cancer-risk-reduction lifestyle factors (diet, exercise, no smoking) apply."},
        {"category": "management", "text": "Genetic counseling is recommended to discuss risk-reducing options."},
    ],
    "Pulmonology": [
        {"category": "screening", "text": "Newborn and carrier screening should be discussed with a genetic counselor."},
        {"category": "management", "text": "Coordinate care with a pulmonologist experienced in CFTR-related disease."},
    ],
    "Neurology": [
        {"category": "lifestyle", "text": "Cardiovascular-healthy lifestyle habits are associated with lower dementia risk."},
        {"category": "screening", "text": "Discuss cognitive baseline screening timing with a physician."},
    ],
}

DEFAULT_GUIDANCE = [
    {"category": "management", "text": "Discuss this result with a genetic counselor or physician before acting on it."},
]
