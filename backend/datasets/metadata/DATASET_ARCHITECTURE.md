# GenomeAI Dataset Architecture & Runtime Data Flow

## 1. System Overview

GenomeAI features a dual-mode clinical genomic analysis engine:
1. **Deterministic Dataset Mode (`ANALYSIS_MODE = "dataset"`)**: A zero-latency, local, verified dataset pipeline that NEVER queries external biomedical APIs, internet endpoints, or LLMs during Gene Analysis.
2. **AI / RAG Research Mode**: A live/curated literature synthesis mode (explicitly preserved for future deep research).

The deterministic Gene Analysis pipeline is 100% dataset-backed. Every result (validation, disease associations, risk stratifications, preventive guidance, downloadable PDF reports) is derived deterministically from local verified datasets.

---

## 2. End-to-End Data Flow

```
+-----------------------------------------------------------------------------------+
| RAW SOURCES (Authoritative & Curated)                                             |
| - NCBI ClinVar FTP: gene_condition_source_id.tsv (13,491 records, 5,159 genes)     |
| - ClinVar Conflicting VCF Extract: clinvar_conflicting.csv (65,188 variants)     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| NORMALIZATION & ENGINEERING LAYER                                                |
| - Deduplication (536 duplicate source rows removed)                              |
| - Case and whitespace standardization (HGNC symbol matching)                      |
| - Categorical deterministic clinical mapping (Oncology, Cardiology, etc.)         |
| - Strict isolation of synthetic data (NDCTD-45K strictly quarantined)             |
| - Shared disease graph derivation (14,702 non-trivial edges)                      |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| PRODUCTION CANONICAL DATASETS (`backend/datasets/production/`)                    |
| - genomeai_master_dataset.csv (11,286 consolidated gene-disease lookup rows)      |
| - genomeai_genes.csv (5,306 genes with cytoband, names, aliases)                 |
| - genomeai_diseases.csv (7,727 diseases with MONDO/OMIM/HPO IDs)                 |
| - genomeai_gene_disease_associations.csv (12,955 source assertions)              |
| - genomeai_variant_evidence.csv (65,172 HGVS variants from ClinVar)              |
| - genomeai_gene_relationships.csv (14,702 shared-disease edges)                  |
| - genomeai_phenotypes.csv (963 HPO & clinical symptom profiles)                  |
| - genomeai_preventive_guidance.csv (6 clinical guidance categories)               |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ (Startup In-Memory Loading)
+-----------------------------------------------------------------------------------+
| MASTER DATASET LOADER (`app.services.master_dataset_loader.MasterDatasetRegistry`)|
| - In-memory O(1) index: self.genes (5,306 entries)                               |
| - In-memory O(1) index: self.disease_to_gene (7,734 entries)                      |
| - In-memory O(1) index: self.diseases_by_gene                                     |
| - In-memory O(1) index: self.relationships (29,404 directed graph edges)          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| DATASET SERVICE (`app.services.dataset_service`)                                  |
| - search(query): Exact symbol -> Exact disease -> Substring match                |
| - run(gene_symbol): Coordinates validation, disease lookup, and pipeline services|
+-----------------------------------------------------------------------------------+
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  ▼                      ▼                      ▼
        +-------------------+  +-------------------+  +-------------------+
        | risk_service.py   |  |prevention_service |  | report_service.py |
        | Deterministic     |  | Evidence-based    |  | Generates stamped |
        | Risk Assessment   |  | Guidance Mapping  |  | PDF Clinical      |
        | & Confidence      |  | (NCCN/ACMG/CDC)   |  | Summary Report    |
        +-------------------+  +-------------------+  +-------------------+
                  │                      │                      │
                  └──────────────────────┼──────────────────────┘
                                         ▼
+-----------------------------------------------------------------------------------+
| GENE ANALYSIS API (`POST /api/v1/dataset-analysis`)                              |
| Returns structured AnalysisResult schema to frontend UI:                          |
| 1. Gene Validation & Metadata (Cytoband, Aliases, Description)                    |
| 2. Disease Associations with ClinVar review status & probabilities                |
| 3. Evidence-based Preventive Guidance                                            |
| 4. Downloadable PDF Report link (`/api/v1/chat/reports/{id}/pdf`)                 |
| 5. Persisted in SQLite DB (`AnalysisHistory` & `Report`) for dashboard retrieval  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Component Breakdown

### 3.1 Startup & In-Memory Loading (`master_dataset_loader.py`)
- **Single Source of Truth**: At application startup, `MasterDatasetRegistry` initializes once as a singleton (`registry`).
- **Load Targets**:
  1. `datasets/production/genomeai_genes.csv`: Ingests all 5,306 verified genes into `self.genes`.
  2. `datasets/production/genomeai_master_dataset.csv`: Ingests 11,286 consolidated associations into `self.diseases_by_gene` and creates reverse search indexes in `self.disease_to_gene`.
  3. `datasets/production/genomeai_gene_relationships.csv`: Ingests 14,702 shared-disease edges into `self.relationships`.
- **Zero I/O at Request Time**: All queries execute against memory structures in sub-millisecond time.

### 3.2 Query Resolution (`dataset_service.search`)
- Case-insensitive HGNC gene symbol check (e.g. `brca1` -> `BRCA1`).
- Exact condition/disease matching (e.g. `cystic fibrosis` -> `CFTR`).
- Substring disease name matching (e.g. `lynch` -> `MLH1`).
- Unknown queries return `None` cleanly, allowing the API to return HTTP 200 with `found = False` and clear educational feedback.

### 3.3 Pipeline Execution (`dataset_service.run`)
- Invoked when a gene is found. Reuses existing clinical services:
  - `risk_service`: Computes risk stratification and confidence level deterministically based on variant counts and pathogenic classifications.
  - `verification_service`: Marks ClinVar / MONDO / OMIM associations as verified.
  - `prevention_service`: Maps clinical categories (Oncology, Pulmonology, Neurology, Cardiology, Hematology, Metabolic) to evidence-based practice guidelines.
  - `report_service`: Generates a tamper-evident PDF summary saved in `generated_reports/`.
  - `_persist_history`: Asynchronously inserts records into SQLite `analysis_history` and `reports` tables so past consultations are visible in user dashboards.

---

## 4. Academic Integrity & Medical Data Isolation Rules

1. **Strict Authoritative Isolation**: `NDCTD-45K.csv` (synthetic tabular records) is quarantined in `datasets/synthetic/` and is NEVER indexed into the clinical lookup structures.
2. **No Fabricated Associations**: Every gene-disease pair traces directly to ClinVar or MONDO.
3. **No Speculative Risk Percentages**: Missing probabilities default to base empirical calibrations or null.
4. **No Hallucinated Chromosomes**: Chromosome fields without ClinVar/NCBI coordinates are left empty and documented as requiring separate NCBI Gene enrichment.
