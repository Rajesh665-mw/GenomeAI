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

## What's explicitly NOT implemented yet (by design, per your instructions)

- ❌ Real biomedical datasets — `app/datasets/*/` are empty placeholder
  folders, as instructed
- ❌ Auth endpoints (register/login/refresh) — the JWT/password-hashing
  *infrastructure* exists in `core/security.py` and the `users` table
  exists, but no auth routes are wired up. This wasn't in the Phase 2.1
  scope list; flagging it explicitly rather than silently including or
  excluding it
- ❌ Alembic migration files — `init_db()` uses `create_all()` for local
  dev convenience; production schema changes should go through Alembic,
  which isn't set up yet
- ❌ Multi-worker-safe progress streaming — the current `ProgressStore` is
  in-process memory, documented with its production caveat directly in
  `app/orchestrator/progress.py`

---

## Project structure

```
app/
  main.py                  FastAPI app + startup/shutdown
  core/                    config, logging, security, exceptions
  api/v1/                  routes (analyze, genes, reports, health)
  orchestrator/            AgentOrchestrator, AnalysisContext, pipeline order, SSE progress store
  agents/                  all 8 agents, one file each, one responsibility each
  services/                all 7 services — the ONLY thing agents call for data
  models/                  SQLAlchemy ORM (the 8 tables)
  schemas/                 Pydantic request/response contracts
  db/                      async engine/session setup
  datasets/                empty placeholder folders for future real data
tests/
  unit/                    per-service tests
  integration/             full pipeline test via in-process ASGI client
```

## How the "swap in real data later" promise actually works

Every agent calls exactly one service (e.g. `RiskAssessmentAgent` →
`risk_service.assess_risk()`). Every service's public function signature is
already what a real implementation would look like — only the *body*
changes. Today `app/services/_mock_data.py` backs everything. When real
data is ready:

1. Drop files into `app/datasets/<category>/`.
2. Replace the relevant service's internals to read from there / a seeded
   DB table instead of `_mock_data.py`.
3. Delete `_mock_data.py` once nothing references it.

No agent, no route, no orchestrator code changes in that process.

---

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
