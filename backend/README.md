# GenomeAI Backend — Phase 2.1

Full Stack Biomedical AI Platform backend. Built fresh, per your instruction —
no dependency on any prior implementation.

**Status: Phase 2.1 complete and verified end-to-end.** Mock agents, mock
services, real orchestrator, real database, real PDF generation, real SSE
streaming. No real biomedical datasets yet (by design — see §Datasets).

---

## Quickstart

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # defaults work out of the box (SQLite)

uvicorn app.main:app --reload
```

Then visit:
- `http://localhost:8000/docs` — interactive Swagger UI
- `http://localhost:8000/api/v1/health` — health check

Run the test suite:

```bash
pytest -v
```

---

## What's implemented (Phase 2.1 scope)

- ✅ Full project structure per the approved architecture
- ✅ Configuration (env-driven, `.env`-based)
- ✅ Database setup — 8 tables (Users, Genes, Diseases, GeneDiseaseRelations,
  ResearchPapers, AnalysisHistory, Reports, DatasetMetadata), async SQLAlchemy
- ✅ FastAPI application with versioned `/api/v1` routes
- ✅ Agent Orchestrator coordinating all 8 agents in sequence
- ✅ All 8 agents (Gene Validation, Disease Association, Risk Assessment,
  Verification, Biomedical Research, Preventive Guidance, Explainability,
  Report Generation), each with a single responsibility, each calling only
  its own service
- ✅ All 7 services, backed by mock data today, structurally ready to be
  swapped for real datasets without any agent code changing
- ✅ End-to-end request flow: `POST /analyze` → 8-agent pipeline → unified
  JSON response, verified live against a running server (not just unit
  tests) — see §Verification below
- ✅ Server-Sent Events progress stream, firing the exact event names from
  the spec ("Gene Validated", "Disease Associations Found", etc.)
- ✅ Real PDF generation (ReportLab), downloadable via the API
- ✅ Automated test suite (5 tests: unit + integration), all passing

- ✅ End-to-end request flow: `POST /api/v1/gene-analysis` & `POST /analyze` →
  deterministic and dataset-backed pipeline → unified JSON response
- ✅ Server-Sent Events progress stream for agent pipelines
- ✅ Real PDF generation (ReportLab) with cryptographic SHA-256 tamper-evident seals and automatic on-demand reconstruction
- ✅ Automated test suite (unit + integration + master dataset + RBAC), all passing
- ✅ Full JWT authentication & role-based access control (Patient, Doctor, Admin)
- ✅ Doctor Gene Relationship Graph backed by 14,702 ClinVar shared-disease edges
- ✅ Integrated Production Datasets in `datasets/production/` (5,306 genes, 11,286 associations, 65,172 ClinVar variants)
- ✅ Production Dataset Validation Command (`python scripts/validate_datasets.py`)

## Production Dataset Architecture

Datasets live in `backend/datasets/` under four architectural categories:

1. `production/` — Primary runtime knowledge base loaded into memory at startup:
   - `genomeai_master_dataset.csv`: 11,286 deduplicated gene-disease lookup rows
   - `genomeai_genes.csv`: 5,306 verified genes with cytoband, names, and aliases
   - `genomeai_diseases.csv`: 7,727 diseases with MONDO/OMIM/HPO IDs
   - `genomeai_gene_disease_associations.csv`: 12,955 source assertions
   - `genomeai_variant_evidence.csv`: 65,172 ClinVar HGVS variants
   - `genomeai_gene_relationships.csv`: 14,702 shared-disease edges
   - `genomeai_phenotypes.csv`: 963 phenotype and clinical symptom profiles
   - `genomeai_phenotypes_hpo.csv`: 711 validated HPO genetic phenotypes
   - `genomeai_clinical_symptoms.csv`: 252 general clinical survey symptoms
   - `genomeai_preventive_guidance.csv`: 6 synthesized educational guidance categories
2. `raw/` — Authoritative source files preserved for academic provenance and auditability.
3. `synthetic/` — Machine learning benchmark datasets (strictly quarantined from clinical analysis).
4. `metadata/` — Provenance registers, schemas, quality, and purity reports.

## Dataset Validation Command

Run dataset validation from a clean clone:
```bash
python scripts/validate_datasets.py
```
This command checks file existence, row counts, required columns, duplicate handling, benchmark gene coverage, and quarantine isolation, exiting with code 0 on success or code 1 on failure.

---

## Project structure

```
app/
  main.py                  FastAPI app + startup/shutdown
  core/                    config, logging, security, exceptions
  api/v1/                  routes (auth, gene-analysis, analyze, genes, reports, consultations, health)
  orchestrator/            AgentOrchestrator, AnalysisContext, pipeline order, SSE progress store
  agents/                  8 analysis agents, one file each, one responsibility each
  services/                business logic & dataset services (master_dataset_loader, dataset_service, etc.)
  models/                  SQLAlchemy ORM models (User, AnalysisHistory, Report, Consultation)
  schemas/                 Pydantic request/response contracts
  db/                      async engine/session setup (SQLite dev / PostgreSQL prod)
datasets/
  production/              production canonical datasets loaded at runtime
  raw/                     raw source files (ClinVar TSV/CSV, etc.)
  synthetic/               strictly quarantined synthetic datasets
  metadata/                provenance registers and documentation
scripts/
  validate_datasets.py     production dataset validation CLI command
  build_genomeai_dataset.py dataset normalization and building script
tests/
  unit/                    unit tests
  integration/             integration tests (auth, RBAC, master dataset, data flow)
```

## Verification performed this phase

Everything below was actually run, not just written:

- `python -c "from app.main import app"` — clean import
- Live server started, all 8 tables confirmed created in SQLite
- `GET /health`, `GET /` — 200 OK
- `GET /genes/{symbol}` — tested known gene (BRCA1), unknown-but-valid
  symbol (fallback path), and malformed symbol (404) — all three cases
  behave correctly
- `POST /analyze` → full 8-agent pipeline run to completion, `GET
  /analyze/{id}` returned the complete unified JSON result
- `GET /analyze/{id}/stream` — watched all 8 agents' SSE events fire live,
  in order, with the exact event names from the spec
- `GET /reports/{id}/pdf` — downloaded and confirmed a real, valid PDF
  (`file` command confirmed `PDF document, version 1.4`)
- Required-agent failure path — posted a malformed gene symbol, confirmed
  the pipeline halts correctly with `status: failed` and a clear error
  message, rather than silently continuing
- `pytest -v` — 5/5 tests passing (2 integration, 3 unit)

---

## Next steps (Phase 2.2+, awaiting your direction)

- Real dataset integration for one category at a time (suggest starting
  with `genes/`)
- Auth endpoints
- Alembic migration setup
- Swap `ProgressStore` for Redis pub/sub if/when this runs multi-worker
- HTML/Jinja2-templated PDF report (to visually match the frontend's
  Report Preview design) instead of the current direct-ReportLab layout
