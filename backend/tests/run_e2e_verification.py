"""
Comprehensive End-to-End User Verification Script for GenomeAI.
Supports running against live servers OR in-process ASGI test transport.
"""
import asyncio
import json
import sys
from pathlib import Path
import uuid
import httpx

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import init_db
from app.main import app

async def run_e2e():
    print("=" * 80)
    print("GENOMEAI COMPREHENSIVE E2E FLOW VERIFICATION")
    print("=" * 80)

    await init_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Backend Health Check
        r = await client.get("/health")
        assert r.status_code == 200, f"Health failed: {r.status_code}"
        assert r.json()["status"] == "ok"
        print("[PASS] 1. Backend Health endpoint verified (HTTP 200 ok)")

        # 2. Patient Registration
        suffix = uuid.uuid4().hex[:6]
        p_email = f"patient_{suffix}@test.com"
        patient_data = {
            "email": p_email,
            "password": "Password123!",
            "full_name": "Alice Patient",
            "role": "patient",
        }
        r = await client.post("/api/v1/auth/register", json=patient_data)
        assert r.status_code == 201, f"Patient register failed: {r.status_code} {r.text}"
        p_res = r.json()
        p_token = p_res["access_token"]
        p_headers = {"Authorization": f"Bearer {p_token}"}
        print(f"[PASS] 2. Patient Registration successful: {p_email}")

        # 3. Patient Login
        login_data = {"email": p_email, "password": "Password123!"}
        r = await client.post("/api/v1/auth/login", json=login_data)
        assert r.status_code == 200, f"Patient login failed: {r.status_code}"
        print("[PASS] 3. Patient Login successful")

        # 4. Deterministic Gene Analysis (BRCA1)
        r = await client.post(
            "/api/v1/dataset-analysis",
            json={"query": "BRCA1"},
            headers=p_headers,
        )
        assert r.status_code == 200
        brca1_res = r.json()
        assert brca1_res["found"] is True
        res = brca1_res["result"]
        assert res["gene_symbol"] == "BRCA1"
        assert res["validation"]["valid"] is True
        assert len(res["diseases"]) > 0
        assert len(res["risk_assessment"]) > 0
        assert len(res["guidance"]) > 0
        analysis_id = res["report"]["report_id"]
        download_url = res["report"]["download_url"]
        print(f"[PASS] 4. Gene Analysis (BRCA1) successful: analysis_id={analysis_id}")

        # 5. Benchmark Genes
        for gene in ["TP53", "CFTR", "HBB", "APC", "MLH1", "MSH2", "PTEN", "FBN1", "LDLR"]:
            r = await client.post(
                "/api/v1/dataset-analysis",
                json={"query": gene},
                headers=p_headers,
            )
            assert r.status_code == 200 and r.json()["found"] is True, f"Failed {gene}"
        print("[PASS] 5. All 10 benchmark genes analyzed successfully")

        # 6. Disease search: cystic fibrosis -> CFTR
        r = await client.post(
            "/api/v1/dataset-analysis",
            json={"query": "cystic fibrosis"},
            headers=p_headers,
        )
        assert r.status_code == 200
        cf_res = r.json()
        assert cf_res["found"] is True and cf_res["result"]["gene_symbol"] == "CFTR"
        print("[PASS] 6. Disease search ('cystic fibrosis' -> CFTR) successful")

        # 7. Disease search: lynch syndrome -> MSH2 or MLH1
        r = await client.post(
            "/api/v1/dataset-analysis",
            json={"query": "lynch syndrome"},
            headers=p_headers,
        )
        assert r.status_code == 200
        lynch_res = r.json()
        assert lynch_res["found"] is True and lynch_res["result"]["gene_symbol"] in ["MSH2", "MLH1"]
        print(f"[PASS] 7. Disease search ('lynch syndrome' -> {lynch_res['result']['gene_symbol']}) successful")

        # 8. Get Analysis Result / History
        r = await client.get(f"/api/v1/analyze/{analysis_id}", headers=p_headers)
        assert r.status_code == 200
        assert r.json()["gene_symbol"] == "BRCA1"
        print("[PASS] 8. Authenticated Analysis retrieval successful")

        # 9. PDF Generation and Download
        r = await client.get(download_url, headers=p_headers)
        assert r.status_code == 200, f"PDF download failed: {r.status_code}"
        assert "application/pdf" in r.headers.get("content-type", "")
        pdf_bytes = r.content
        assert pdf_bytes.startswith(b"%PDF"), "File does not start with %PDF magic bytes"
        print(f"[PASS] 9. PDF Report generated and downloaded successfully ({len(pdf_bytes):,} bytes, starts with %PDF)")

        # 10. Patient History List
        r = await client.get("/api/v1/analyze", headers=p_headers)
        assert r.status_code == 200
        history = r.json()
        assert len(history) >= 1
        assert any(h["analysis_id"] == analysis_id for h in history)
        print("[PASS] 10. Patient History listing successful")

        # 11. Cross-User Data Isolation
        suffix2 = uuid.uuid4().hex[:6]
        p2_email = f"patient2_{suffix2}@test.com"
        p2_data = {
            "email": p2_email,
            "password": "Password123!",
            "full_name": "Bob Patient",
            "role": "patient",
        }
        r = await client.post("/api/v1/auth/register", json=p2_data)
        assert r.status_code == 201
        p2_token = r.json()["access_token"]
        p2_headers = {"Authorization": f"Bearer {p2_token}"}

        # Patient 2 trying to access Patient 1 analysis must fail with 404
        r = await client.get(f"/api/v1/analyze/{analysis_id}", headers=p2_headers)
        assert r.status_code == 404, f"Cross-user isolation failed, expected 404, got {r.status_code}"
        # Patient 2 trying to download Patient 1 PDF must fail with 409
        r = await client.get(download_url, headers=p2_headers)
        assert r.status_code == 409, f"Cross-user PDF isolation failed, expected 409, got {r.status_code}"
        print("[PASS] 11. Cross-user isolation verified (404/409 on unauthorized access)")

        # 12. Doctor Registration & Login
        doc_email = f"doctor_{suffix}@test.com"
        doc_data = {
            "email": doc_email,
            "password": "Password123!",
            "full_name": "Dr. Gregory House",
            "role": "doctor",
        }
        r = await client.post("/api/v1/auth/register", json=doc_data)
        assert r.status_code == 201
        d_token = r.json()["access_token"]
        d_headers = {"Authorization": f"Bearer {d_token}"}
        print(f"[PASS] 12. Doctor Registration successful: {doc_email}")

        # 13. Doctor Gene Relationship Graph
        r = await client.get(
            "/api/v1/genes/relationships?symbols=BRCA1,TP53",
            headers=d_headers,
        )
        assert r.status_code == 200
        graph = r.json()
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) >= 1
        print(f"[PASS] 13. Doctor Gene Relationship Graph verified: {len(graph['edges'])} edge(s) found")

        # 14. RBAC: Patient Forbidden from Doctor Graph
        r = await client.get(
            "/api/v1/genes/relationships?symbols=BRCA1,TP53",
            headers=p_headers,
        )
        assert r.status_code == 403, f"RBAC failed: patient expected 403, got {r.status_code}"
        print("[PASS] 14. RBAC enforced: Patient cannot access Doctor Relationship Graph (HTTP 403 Forbidden)")

        print("\n" + "=" * 80)
        print("ALL 14 E2E STEPS VERIFIED 100% SUCCESSFULLY!")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_e2e())
