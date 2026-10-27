# GenomeAI — Clinical Genomic Disease Analysis & Prevention Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

GenomeAI is a web-based clinical genomics intelligence platform that translates genetic variants and hereditary markers into evidence-grounded risk assessments, categorized preventive guidance, physician consultations, and clinical PDF reports.

---

## 1. What GenomeAI Is

GenomeAI bridges the gap between raw genomic data and actionable healthcare insights. It provides distinct, secure portals for both **Patients** and **Physicians/Researchers**:
- Patients gain clarity on genetic risks (e.g. *BRCA1*, *TP53*, *CFTR*), access lifestyle and screening protocols, generate verified clinical PDF reports, and submit direct consultation inquiries to medical specialists.
- Physicians and researchers can review pending patient consultations, furnish professional advice, and explore multi-gene disease co-occurrences via the **Gene Relationship Graph**.

---

## 2. Main Features

- **Deterministic Gene Analysis**: Instant, offline-capable analysis of gene symbols (*BRCA1*, *TP53*, *CFTR*, *EGFR*, *KRAS*, *APOE*) and disease phenotypes (*cystic fibrosis*, *breast cancer*).
- **Multi-Category Risk Assessment**: Disease probability, penetrance scores, and validation status derived from verified biomedical records.
- **Actionable Preventive Guidance**: Divided into distinct clinical categories:
  - Clinical Screening & Surveillance Schedules
  - Evidence-Based Lifestyle & Nutrition Interventions
  - Long-Term Management & Genetic Counseling
- **Tamper-Evident Clinical PDF Reports**: Generated on-demand using ReportLab, strictly isolated per patient with owner-only download authorization.
- **Physician Consultation Workflow**: Structured request-and-response channel allowing patients to ask questions and doctors to provide clinical recommendations.
- **Gene Relationship Graph**: Doctor-exclusive interactive network computing shared clinical phenotypes and disease associations across 2+ genes, with dedicated isolated-node handling.
- **Strict Role-Based Access Control (RBAC)**: Enforced at both API and UI levels with cryptographic JWT authentication and complete cross-tenant data isolation.

---

## 3. Analysis Architecture & Concept Boundaries

GenomeAI establishes two distinct analysis concepts:

### A) Gene Analysis (Core Production Workflow — Available Now)
- **Status**: Production-ready, fully functional.
- **Execution**: Deterministic and local dataset-backed.
- **Network Dependency**: **Zero**. Does NOT depend on Gemini, OpenAI, or external internet connectivity to function.
- **Flow**:
  $$\text{Gene Analysis} \longrightarrow \text{Analysis Results} \longrightarrow \text{Preventive Guidance} \longrightarrow \text{Report} \longrightarrow \text{Download PDF}$$
- **UI Presentation**: Labeled simply and cleanly as **"Gene Analysis"** (no internal developer jargon like "dataset search" or "mock data").

### B) AI Research Analysis (Under Active Clinical Development)
- **Status**: Intentionally gated / Coming Soon.
- **Backend**: Preserved in full (`app/orchestrator/gemini_planner.py`, multi-agent tool pipeline).
- **Public Safety**: No functional AI chat or unauthenticated prompt box is exposed on the landing page.
- **Dashboard UI**: Displays a clinical disclaimer: *"AI Research Analysis — Coming Soon / Under Development"*.
- Normal users cannot trigger unfinished or unvalidated AI workflows.

---

## 3.1 Dataset Roles & Architectural Organization

GenomeAI strictly segregates datasets by functional role and isolation boundary:

```
backend/datasets/
├── production/        # ACTIVE: Primary deterministic runtime knowledge base
├── raw/               # REFERENCE: Original source exports for reproducibility
├── synthetic/         # ISOLATED: Machine learning benchmarks (strictly isolated from Gene Analysis)
└── metadata/          # AUDIT: Provenance registers, schemas, quality & purity reports
```

### 1. Production Datasets (`backend/datasets/production/`)
- `genomeai_master_dataset.csv`: Primary knowledge base providing 5,306 genes, 11,286 associations, variant evidence, and evidence scores.
- `genomeai_genes.csv`: Authoritative gene catalog with Entrez IDs, chromosomal locations, and aliases.
- `genomeai_diseases.csv`: Standardized disease entities with ontology mappings (MONDO, OMIM, Orphanet).
- `genomeai_gene_disease_associations.csv`: Source-traceable gene-disease records with provenance IDs.
- `genomeai_variant_evidence.csv`: 65,172 deduplicated ClinVar variant evidence rows with HGVS notations.
- `genomeai_gene_relationships.csv`: 14,702 shared-disease edges powering the Doctor Gene Relationship Graph.
- `genomeai_phenotypes_hpo.csv`: 711 authoritative HPO genetic phenotypes (`hpo_genetic`).
- `genomeai_clinical_symptoms.csv`: 252 clinical survey symptoms (`clinical_survey`).
- `genomeai_preventive_guidance.csv`: Synthesized educational guidance based on published clinical guidelines.
- `genomeai_phenotypes.csv`: Preserved for backward compatibility.

### 2. Raw Datasets (`backend/datasets/raw/`)
Retained for auditability and academic reproducibility; **never** queried by runtime Gene Analysis:
- `gene_condition_source_id.tsv`: Raw NCBI ClinVar gene-condition associations.
- `clinvar_conflicting.csv`: Raw ClinVar variant classifications.
- `Disease_symptom_and_patient_profile_dataset.csv`: Raw survey symptom dataset.

### 3. Synthetic Datasets (`backend/datasets/synthetic/`)
- `NDCTD-45K.csv` and `data_dictionary.csv`: Quarantined synthetic clinical datasets for ML benchmarks. Completely isolated from production Gene Analysis.

---

## 3.2 Medical Provenance, Evidence Scores & Limitations

- **Variant Evidence Score**: The scores presented in Gene Analysis reflect project-derived variant evidence confidence based on available ClinVar submissions; they are **not** epidemiological disease probabilities or clinical diagnostic predictions.
- **Preventive Guidance**: Synthesized educational summaries based on published guidelines (NCCN, ACMG, CFF, AHA, ASH, Endocrine Society). GenomeAI does not fabricate patient-specific clinical advice, dosages, or treatments.
- **Educational Scope**: GenomeAI is an educational and clinical research translation platform. It is not an automated diagnostic device and does not replace evaluation by a qualified medical geneticist or physician.

---

## 4. User Roles & Permissions

| Role | Access Permissions & Responsibilities |
|---|---|
| **Patient** | Register, Login, Gene Analysis, Analysis Results, Preventive Guidance, Report generation & PDF download, Analysis History, Create consultation requests, View doctor responses. *Restricted from Doctor Dashboard, Physician tools, and Gene Relationship Graph.* |
| **Doctor / Researcher** | Login, Doctor Dashboard, Review pending patient consultation pool, Submit consultation responses, Access Gene Relationship Graph (compare 2+ genes), Inspect clinical summaries. *Strictly prevented from accessing unrelated patient private records outside permitted consultation workflows.* |

---

## 5. Technical Stack

- **Frontend**: React 18, React Router v7, Vanilla CSS design system (Medical Genomics aesthetic, zero Tailwind/Bootstrap dependencies), Three.js genomic visualization, Vite 5.
- **Backend**: FastAPI (Python 3.11+ / 3.14 compatible), SQLAlchemy 2.0 (asyncio), Pydantic v2 Settings, ReportLab (PDF compilation), Passlib (bcrypt), Python-JOSE (JWT tokens).
- **Database / Persistence**:
  - Development: SQLite via `aiosqlite`.
  - Production Target: PostgreSQL via `asyncpg`.

---

## 6. Project Directory Structure

```
genomeai-platform/
├── .env.example              # Global environment variable reference
├── .gitignore                # Root Git safety rules (protects DB, secrets, caches)
├── README.md                 # Primary system documentation (this file)
├── backend/
│   ├── .env.example          # Backend environment template
│   ├── .gitignore            # Backend-specific ignore rules
│   ├── pytest.ini            # Pytest configuration
│   ├── requirements.txt      # Python dependencies (FastAPI, SQLAlchemy, etc.)
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint, lifespan, CORS, and /health
│   │   ├── api/v1/           # API router and endpoints (auth, analyze, genes, etc.)
│   │   ├── core/             # Configuration, security, logging, exceptions
│   │   ├── db/               # Async database engine and session management
│   │   ├── models/           # SQLAlchemy ORM models (User, AnalysisHistory, etc.)
│   │   ├── schemas/          # Pydantic request and response schemas
│   │   ├── services/         # Core biomedical business logic and dataset service
│   │   └── orchestrator/     # AI multi-agent planner & pipeline (preserved)
│   ├── generated_reports/    # Storage directory for compiled PDF reports
│   └── tests/
│       ├── unit/             # Unit test suites (gene validation, formatting)
│       └── integration/      # End-to-end integration tests (Auth, RBAC, Graph)
└── frontend/
    ├── .env.example          # Frontend environment template
    ├── package.json          # Node scripts and dependencies
    ├── vercel.json           # Vercel deployment and SPA routing configuration
    ├── vite.config.js        # Vite build configuration
    ├── public/               # Static assets & verified sample PDF report
    └── src/
        ├── App.jsx           # App routes, RBAC guards, and 404 wildcard
        ├── index.css         # Clinical dark mode design system
        ├── components/       # Reusable components (AuthLayout, ProtectedRoute, etc.)
        ├── context/          # AuthContext (JWT management & session state)
        ├── lib/              # API clients and dynamic API_BASE_URL resolver
        ├── pages/            # View pages (Landing, Login, Patient, Doctor, etc.)
        └── sections/         # Landing page sections (Workflow, Research, etc.)
```

---

## 7. Installation & Local Development

### Prerequisites
- Node.js 18+ and npm 9+
- Python 3.11, 3.12, 3.13, or 3.14

### Step 1: Backend Setup
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
```

Run the backend development server:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/health`

### Step 2: Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
- Application Web UI: `http://localhost:5173`

---

## 8. Automated Testing & Verification

### Running Dataset Validation CLI
Validate all production datasets, schemas, benchmark gene coverage, and quarantine isolation:
```bash
cd backend
python scripts/validate_datasets.py
```
*Expected: [PASS] ALL PRODUCTION DATASETS VERIFIED 100% VALID & INTEGRATED! (Exit code 0).*

### Running Native Pytest Suite
Run the full backend test suite covering gene validation, full analyze pipeline, deterministic gene analysis, RBAC data isolation, consultations, and gene graph calculations:
```bash
cd backend
python -m pytest --show-capture=no
```
*Expected: 8 passed (unit + integration).*

### Running Full API Regression Suite
Execute the end-to-end regression script against a running backend:
```bash
python scratch/qa_api_audit.py
```
*Expected: 39 passed, 0 failed.*

### Building Frontend for Production
```bash
cd frontend
npm run build
```
*Output: Production bundle compiled into `frontend/dist/`.*

---

## 9. Production Deployment Guide

### A) Frontend Deployment (Vercel)
The frontend is pre-configured for instant zero-configuration deployment on **Vercel**:

1. **Import Repository**: In your Vercel Dashboard, import the Git repository.
2. **Set Root Directory**: Select `frontend` (or leave as root if deploying frontend repo directly).
3. **Build Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: `https://your-backend-api.domain.com` (Your deployed backend URL, without trailing slash).
5. **SPA Rewrites**: Handled automatically via `frontend/vercel.json`:
   ```json
   {
     "framework": "vite",
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

### B) Backend Deployment (Render, Railway, Fly.io, or VPS)
> [!IMPORTANT]
> Vercel hosts static frontend SPAs and serverless functions; it does **not** host stateful long-running FastAPI backend processes with ReportLab PDF compilation and persistent SQLite databases. Deploy the FastAPI backend to a compatible container or application host:

1. **Recommended Platforms**: **Render (Web Service)**, **Railway**, **Fly.io**, **AWS App Runner**, or a dedicated Linux VPS.
2. **Startup Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Database in Production**:
   - Set `DATABASE_URL` to a persistent PostgreSQL instance:
     ```env
     DATABASE_URL=postgresql+asyncpg://user:password@host:5432/genomeai
     ```
   - The platform includes async SQLAlchemy drivers for both SQLite (`aiosqlite`) and PostgreSQL (`asyncpg`).
4. **CORS Configuration**:
   - Set `CORS_ORIGINS` to your Vercel domain:
     ```env
     CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
     ```
5. **Report Storage in Production**:
   - Generated PDFs are stored in `REPORTS_DIR` (defaults to `./generated_reports`).
   - For ephemeral container environments (e.g. Render/Railway free tiers), configure a persistent volume mount for `./generated_reports` or an S3 object store.

---

## 10. Project Expo & Reviewer Demonstration Sequence (5–10 Minutes)

1. **Landing Page Overview (1 min)**:
   - Walk through the interactive medical genomics interface and DNA ambient helix.
   - Click **Sample Report** in the hero to demonstrate real, on-demand PDF report inspection.
   - Highlight the **Research Capabilities** section demonstrating the clinical boundary of the platform.
2. **Patient Registration & Gene Analysis (2 mins)**:
   - Click **Register** and create a Patient account.
   - Navigate to **Gene Analysis**, search for **BRCA1**, and click **Analyze Gene**.
   - Review the **Analysis Results** page: Gene Overview, Chromosome, and Risk Insights.
   - Click **Continue to Preventive Guidance** to review categorized clinical screening protocols.
   - Click **Continue to Report** and click **Download PDF** to inspect the compiled report.
3. **Patient History & Doctor Consultation (2 mins)**:
   - In the sidebar, click **History** to show that previous analyses persist securely.
   - Navigate to **Doctor Consultation** and submit a question regarding screening frequency.
4. **Physician Portal & Consultation Response (2 mins)**:
   - Log out, and log in as a **Doctor**.
   - Open **Consultation Requests** to view the pending patient query.
   - Click **Respond**, submit clinical guidance, and verify status changes to *Responded*.
5. **Gene Relationship Graph (2 mins)**:
   - In the Doctor sidebar, open **Gene Relationship Graph**.
   - Compare `BRCA1, TP53` to reveal the shared clinical oncological phenotype (*Hereditary Breast Cancer*).
   - Compare `CFTR, HBB` to demonstrate the graceful isolated/no-relationship state.
   - Demonstrate that patient accounts cannot access this route (strict RBAC).
