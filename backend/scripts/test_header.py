import os
import sys
import argparse
import logging
import re
import json
import time
from datetime import datetime, timezone
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DEMO_GENES = [
    "BRCA1", "BRCA2", "TP53", "CFTR", "HBB", "APC",
    "MLH1", "MSH2", "MSH6", "PMS2", "PTEN", "LDLR", "FBN1", "DMD"
]

GENE_METADATA_REGISTRY = {
    "BRCA1": {
        "name": "BRCA1 DNA repair associated",
        "chromosome": "17q21.31",
        "description": "Tumor suppressor gene involved in DNA double-strand break repair.",
        "aliases": ["BRCC1", "RNF53", "PPP1R53"]
    },
    "BRCA2": {
        "name": "BRCA2 DNA repair associated",
        "chromosome": "13q13.1",
        "description": "Tumor suppressor gene involved in double-strand break repair via homologous recombination.",
        "aliases": ["FANCD1", "BROVCA2", "FACD"]
    },
    "TP53": {
        "name": "Tumor protein P53",
        "chromosome": "17p13.1",
        "description": "Regulates the cell cycle and functions as a tumor suppressor.",
        "aliases": ["LFS1", "P53", "TRP53"]
    },
    "CFTR": {
        "name": "CF transmembrane conductance regulator",
        "chromosome": "7q31.2",
        "description": "Encodes an ATP-binding cassette transporter functioning as a chloride channel.",
        "aliases": ["ABCC7", "CF", "MRP7"]
    },
    "HBB": {
        "name": "Hemoglobin subunit beta",
        "chromosome": "11p15.4",
        "description": "Encodes the beta globin chain of hemoglobin.",
        "aliases": ["beta-globin", "ECYT6", "CD113t-C"]
    },
    "APC": {
        "name": "APC regulator of WNT signaling pathway",
        "chromosome": "5q22.2",
        "description": "Tumor suppressor antagonizing the WNT signaling pathway.",
        "aliases": ["DP2", "DP2.5", "DP3", "FAP"]
    },
    "MLH1": {
        "name": "MutL homolog 1",
        "chromosome": "3p22.2",
        "description": "DNA mismatch repair protein associated with Lynch syndrome.",
        "aliases": ["COCA2", "FCC2", "hMLH1"]
    },
    "MSH2": {
        "name": "MutS homolog 2",
        "chromosome": "2p21-p16.3",
        "description": "Component of the post-replicative DNA mismatch repair system.",
        "aliases": ["COCA1", "FCC1", "hMSH2"]
    },
    "MSH6": {
        "name": "MutS homolog 6",
        "chromosome": "2p16.3",
        "description": "DNA mismatch repair protein that heterodimerizes with MSH2.",
        "aliases": ["GTBP", "HSAP", "p160"]
    },
    "PMS2": {
        "name": "PMS1 homolog 2, mismatch repair system component",
        "chromosome": "7p22.1",
        "description": "Mismatch repair endonuclease involved in DNA repair.",
        "aliases": ["HNPCC4", "MLH4", "PMS2CL"]
    },
    "PTEN": {
        "name": "Phosphatase and tensin homolog",
        "chromosome": "10q23.31",
        "description": "Tumor suppressor lipid phosphatase antagonizing PI3K-AKT signaling.",
        "aliases": ["BZS", "MHAM", "PTEN1", "10q23del"]
    },
    "LDLR": {
        "name": "Low density lipoprotein receptor",
        "chromosome": "19p13.2",
        "description": "Cell surface receptor mediating endocytosis of cholesterol-rich LDL.",
        "aliases": ["FH", "FHC", "LDLCQ1"]
    },
    "FBN1": {
        "name": "Fibrillin 1",
        "chromosome": "15q21.1",
        "description": "Extracellular matrix glycoprotein essential for microfibril formation.",
        "aliases": ["FBN", "MASS", "MFS1", "OCTD"]
    },
    "DMD": {
        "name": "Dystrophin",
        "chromosome": "Xp21.2-p21.1",
        "description": "Anchors the cytoskeleton of muscle fibers to the extracellular matrix.",
        "aliases": ["BMD", "CMD3B", "DXS142", "DXS164"]
    },
    "EGFR": {
        "name": "Epidermal growth factor receptor",
        "chromosome": "7p11.2",
        "description": "Transmembrane glycoprotein receptor tyrosine kinase implicated in cancer.",
        "aliases": ["ERBB", "ERBB1", "HER1"]
    },
    "KRAS": {
        "name": "KRAS proto-oncogene, GTPase",
        "chromosome": "12p12.1",
        "description": "GTPase early in the MAPK pathway commonly mutated in adenocarcinoma.",
        "aliases": ["KRAS2", "RASK2", "C-K-RAS"]
    },
    "APOE": {
        "name": "Apolipoprotein E",
        "chromosome": "19q13.32",
        "description": "Involved in lipid metabolism; e4 allele associated with Alzheimer's disease.",
        "aliases": ["AD2", "APO-E", "LDLCQ5"]
    }
}

CATEGORY_KEYWORDS = [
    ("Oncology", ("cancer", "tumor", "tumour", "carcinoma", "neoplasm", "sarcoma", "lymphoma", "leukemia", "polyposis", "adenoma", "melanoma", "glioma", "blastoma")),
    ("Pulmonology", ("cystic fibrosis", "lung", "pulmonary", "respiratory", "asthma", "bronchiectasis")),
    ("Neurology", ("alzheimer", "parkinson", "neuro", "dementia", "epilepsy", "ataxia", "seizure", "leukoencephalopathy", "charcot", "neuropathy", "microcephaly")),
    ("Cardiology", ("cardio", "heart", "cardiomyopathy", "arrhythmia", "aortic", "aneurysm", "hypercholesterolemia")),
    ("Hematology", ("anemia", "anaemia", "hemophilia", "haemophilia", "thalassemia", "blood", "sickle", "spherocytosis")),
    ("Metabolic", ("diabetes", "metabolic", "deficiency", "storage", "hyperglycemia", "glycogen")),
    ("Musculoskeletal", ("dystrophy", "myopathy", "osteogenesis", "skeletal", "dysplasia", "keratoderma", "skin")),
    ("Ophthalmology", ("retinitis", "macular", "optic", "cataract", "glaucoma", "blindness")),
    ("Urology", ("kidney", "renal", "polycystic", "vas deferens", "nephronophthisis"))
]

def infer_category(trait_name: str) -> str:
    if not trait_name or not isinstance(trait_name, str):
        return "Other"
    low = trait_name.lower()
    for cat, kws in CATEGORY_KEYWORDS:
        if any(kw in low for kw in kws):
            return cat
    return "Other"

def normalize_disease_name(raw_name: str) -> str:
    if pd.isna(raw_name) or not str(raw_name).strip():
        return ""
    name = str(raw_name).strip()
    name = re.sub(r"\s+", " ", name)
    name = name.rstrip(".,;")
    return name

def load_gene_condition_data(source_dir: str, raw_dir: str) -> pd.DataFrame:
    # 1. Try local tsv in raw_dir
    tsv_candidate = os.path.join(raw_dir, "gene_condition_source_id.tsv")
    if os.path.exists(tsv_candidate):
        logging.info(f"Loading gene_condition from raw cache: {tsv_candidate}")
        df = pd.read_csv(tsv_candidate, sep="\t", dtype=str)
        df.columns = [c.lstrip("#").strip() for c in df.columns]
        return df

    # 2. Try scratching/fetching from FTP or reading PDF
    tsv_scratch = r"C:\Users\HP\.gemini\antigravity-ide\brain\51eb3070-aae5-4de7-bda2-5c9bbda8f1d3\scratch\gene_condition_source_id.tsv"
    if os.path.exists(tsv_scratch):
        logging.info(f"Loading gene_condition from scratch TSV: {tsv_scratch}")
        df = pd.read_csv(tsv_scratch, sep="\t", dtype=str)
        df.columns = [c.lstrip("#").strip() for c in df.columns]
        return df

    # Fallback to direct fetch from NCBI FTP
    import urllib.request
    url = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/gene_condition_source_id"
    logging.info(f"Fetching authoritative gene_condition from NCBI FTP: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8", errors="ignore")
    import io
    df = pd.read_csv(io.StringIO(content), sep="\t", dtype=str)
    df.columns = [c.lstrip("#").strip() for c in df.columns]
    # Cache it
    with open(tsv_candidate, "w", encoding="utf-8") as f:
        f.write(content)
    return df

print("Header logic compiled.")
