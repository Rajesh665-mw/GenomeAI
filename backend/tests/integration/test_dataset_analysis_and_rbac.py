"""
Integration tests for GenomeAI deterministic Gene Analysis, Authentication,
RBAC permissions, Consultation workflows, and Gene Relationship Graph.
"""
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import init_db
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoints():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Top-level health check (for cloud probes/ALBs)
        r_root_health = await client.get("/health")
        assert r_root_health.status_code == 200
        assert r_root_health.json()["status"] == "ok"
        assert "password" not in r_root_health.text
        assert "secret" not in r_root_health.text

        # API v1 health check
        r_v1_health = await client.get("/api/v1/health")
        assert r_v1_health.status_code == 200
        assert r_v1_health.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_deterministic_gene_analysis():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Known gene BRCA1
        r_brca1 = await client.post("/api/v1/dataset-analysis", json={"query": "BRCA1"})
        assert r_brca1.status_code == 200
        data_brca1 = r_brca1.json()
        assert data_brca1["found"] is True
        assert data_brca1["result"]["gene_symbol"] == "BRCA1"
        assert data_brca1["result"]["validation"]["valid"] is True
        assert len(data_brca1["result"]["diseases"]) > 0
        assert len(data_brca1["result"]["risk_assessment"]) > 0
        assert len(data_brca1["result"]["guidance"]) > 0
        assert data_brca1["result"]["report"]["download_url"] is not None

        # 2. Known gene TP53
        r_tp53 = await client.post("/api/v1/dataset-analysis", json={"query": "tp53"})
        assert r_tp53.status_code == 200
        assert r_tp53.json()["found"] is True
        assert r_tp53.json()["result"]["gene_symbol"] == "TP53"

        # 3. Known gene CFTR
        r_cftr = await client.post("/api/v1/dataset-analysis", json={"query": "  CFTR  "})
        assert r_cftr.status_code == 200
        assert r_cftr.json()["found"] is True
        assert r_cftr.json()["result"]["gene_symbol"] == "CFTR"

        # 4. Disease name resolution ("cystic fibrosis" -> CFTR)
        r_disease = await client.post("/api/v1/dataset-analysis", json={"query": "cystic fibrosis"})
        assert r_disease.status_code == 200
        assert r_disease.json()["found"] is True
        assert r_disease.json()["result"]["gene_symbol"] == "CFTR"

        # 5. Unknown gene handling
        r_unknown = await client.post("/api/v1/dataset-analysis", json={"query": "UNKNOWN_GENE_XYZ999"})
        assert r_unknown.status_code == 200
        assert r_unknown.json()["found"] is False
        assert "verified genetic records" in r_unknown.json()["message"]

        # 6. Empty query handling
        r_empty = await client.post("/api/v1/dataset-analysis", json={"query": "   "})
        assert r_empty.status_code == 200
        assert r_empty.json()["found"] is False


@pytest.mark.asyncio
async def test_auth_rbac_and_data_isolation():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_suffix = uuid.uuid4().hex[:8]
        patient_email = f"patient_{unique_suffix}@example.com"
        patient2_email = f"patient2_{unique_suffix}@example.com"
        doctor_email = f"doctor_{unique_suffix}@example.com"
        doctor2_email = f"doctor2_{unique_suffix}@example.com"
        pwd = "SecurePassword123!"

        # Register Patient 1
        r_p1 = await client.post("/api/v1/auth/register", json={
            "email": patient_email, "password": pwd, "full_name": "Patient One", "role": "patient"
        })
        assert r_p1.status_code == 201
        p1_token = r_p1.json()["access_token"]
        p1_id = r_p1.json()["user"]["id"]

        # Register Patient 2
        r_p2 = await client.post("/api/v1/auth/register", json={
            "email": patient2_email, "password": pwd, "full_name": "Patient Two", "role": "patient"
        })
        assert r_p2.status_code == 201
        p2_token = r_p2.json()["access_token"]

        # Register Doctor 1
        r_d1 = await client.post("/api/v1/auth/register", json={
            "email": doctor_email, "password": pwd, "full_name": "Dr. Researcher One", "role": "doctor"
        })
        assert r_d1.status_code == 201
        d1_token = r_d1.json()["access_token"]

        # Register Doctor 2
        r_d2 = await client.post("/api/v1/auth/register", json={
            "email": doctor2_email, "password": pwd, "full_name": "Dr. Researcher Two", "role": "doctor"
        })
        assert r_d2.status_code == 201
        d2_token = r_d2.json()["access_token"]

        # Duplicate email registration check
        r_dup = await client.post("/api/v1/auth/register", json={
            "email": patient_email, "password": pwd, "full_name": "Duplicate", "role": "patient"
        })
        assert r_dup.status_code == 409

        # Patient 1 runs authenticated Gene Analysis
        p1_headers = {"Authorization": f"Bearer {p1_token}"}
        r_analysis = await client.post("/api/v1/dataset-analysis", json={"query": "BRCA1"}, headers=p1_headers)
        assert r_analysis.status_code == 200
        analysis_id = r_analysis.json()["result"]["report"]["report_id"]

        # Patient 1 can access their own analysis
        r_get_p1 = await client.get(f"/api/v1/analyze/{analysis_id}", headers=p1_headers)
        assert r_get_p1.status_code == 200
        assert r_get_p1.json()["gene_symbol"] == "BRCA1"

        # Patient 1 can download report PDF
        r_pdf_p1 = await client.get(f"/api/v1/chat/reports/{analysis_id}/pdf", headers=p1_headers)
        assert r_pdf_p1.status_code == 200
        assert r_pdf_p1.headers["content-type"] == "application/pdf"
        assert r_pdf_p1.content[:4] == b"%PDF"

        # Patient 2 CANNOT access Patient 1's analysis (404 for security)
        p2_headers = {"Authorization": f"Bearer {p2_token}"}
        r_get_p2 = await client.get(f"/api/v1/analyze/{analysis_id}", headers=p2_headers)
        assert r_get_p2.status_code == 404

        # Patient 2 CANNOT download Patient 1's report PDF (409)
        r_pdf_p2 = await client.get(f"/api/v1/chat/reports/{analysis_id}/pdf", headers=p2_headers)
        assert r_pdf_p2.status_code == 409

        # --- Consultations Workflow ---
        # Patient 1 creates a consultation
        r_cons = await client.post("/api/v1/consultations", json={
            "gene_symbol": "BRCA1",
            "disease_name": "Hereditary Breast and Ovarian Cancer",
            "patient_question": "What preventive screening frequency is recommended for BRCA1?",
            "additional_notes": "Family history positive."
        }, headers=p1_headers)
        assert r_cons.status_code == 201
        cons_id = r_cons.json()["id"]

        # Patient 2 CANNOT view Patient 1's consultation
        r_cons_p2 = await client.get(f"/api/v1/consultations/{cons_id}", headers=p2_headers)
        assert r_cons_p2.status_code == 403

        # Doctor 1 views consultation list (pending pool)
        d1_headers = {"Authorization": f"Bearer {d1_token}"}
        r_doc_list = await client.get("/api/v1/consultations", headers=d1_headers)
        assert r_doc_list.status_code == 200
        assert any(c["id"] == cons_id for c in r_doc_list.json())

        # Doctor 1 responds to consultation
        r_respond = await client.post(f"/api/v1/consultations/{cons_id}/respond", json={
            "advice": "Schedule annual MRI breast screening starting at age 25 and discuss with a certified genetic counselor.",
            "appointment_recommended": True,
            "observations": "High penetrance pathogenic variant."
        }, headers=d1_headers)
        assert r_respond.status_code == 200
        assert r_respond.json()["status"] == "responded"

        # Patient 1 checks consultation and sees response
        r_check_p1 = await client.get(f"/api/v1/consultations/{cons_id}", headers=p1_headers)
        assert r_check_p1.status_code == 200
        assert r_check_p1.json()["doctor_response"] is not None

        # Doctor 2 CANNOT view consultation handled by Doctor 1
        d2_headers = {"Authorization": f"Bearer {d2_token}"}
        r_cons_d2 = await client.get(f"/api/v1/consultations/{cons_id}", headers=d2_headers)
        assert r_cons_d2.status_code == 403

        # --- Gene Relationship Graph RBAC ---
        # Patient CANNOT access relationship graph (403)
        r_graph_patient = await client.get("/api/v1/genes/relationships?symbols=BRCA1,TP53", headers=p1_headers)
        assert r_graph_patient.status_code == 403

        # Doctor CAN access relationship graph
        r_graph_doc = await client.get("/api/v1/genes/relationships?symbols=BRCA1,TP53", headers=d1_headers)
        assert r_graph_doc.status_code == 200
        graph_data = r_graph_doc.json()
        assert len(graph_data["nodes"]) == 2
        assert len(graph_data["edges"]) >= 1  # BRCA1 and TP53 share cancer associations

        # Doctor queries 3 genes with isolated node (BRCA1, TP53, CFTR)
        r_graph_3 = await client.get("/api/v1/genes/relationships?symbols=BRCA1,TP53,CFTR", headers=d1_headers)
        assert r_graph_3.status_code == 200
        g3 = r_graph_3.json()
        assert len(g3["nodes"]) == 3
        assert "CFTR" in g3["isolated_genes"]

        # Doctor queries genes with no relationship
        r_graph_none = await client.get("/api/v1/genes/relationships?symbols=CFTR,HBB", headers=d1_headers)
        assert r_graph_none.status_code == 200
        gn = r_graph_none.json()
        assert len(gn["edges"]) == 0
        assert len(gn["isolated_genes"]) == 2
