"""
End-to-end integration test exercising the real FastAPI app in-process
(no real network socket) against the same SQLite dev database used
elsewhere in this phase.

Note: this shares the dev DB rather than an isolated test database — fine
for this phase's scope, but worth revisiting (e.g. a dedicated test
DATABASE_URL + fixture teardown) before this suite grows much further.
"""
import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import init_db
from app.main import app


@pytest.mark.asyncio
async def test_full_analyze_pipeline_end_to_end():
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start_resp = await client.post("/api/v1/analyze", json={"gene_symbol": "TP53"})
        assert start_resp.status_code == 202
        analysis_id = start_resp.json()["analysis_id"]

        # poll for completion (background task runs on the same event loop)
        for _ in range(30):
            status_resp = await client.get(f"/api/v1/analyze/{analysis_id}")
            assert status_resp.status_code == 200
            body = status_resp.json()
            if body["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(0.3)
        else:
            pytest.fail("Analysis did not finish within the polling window")

        assert body["status"] == "completed"
        result = body["result"]
        assert result["gene_symbol"] == "TP53"
        assert result["validation"]["valid"] is True
        assert len(result["diseases"]) > 0
        assert len(result["risk_assessment"]) == len(result["diseases"])
        assert len(result["verification"]) == len(result["diseases"])
        assert result["report"]["download_url"].startswith("/api/v1/reports/")

        # download the actual PDF
        pdf_resp = await client.get(result["report"]["download_url"])
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert pdf_resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_invalid_gene_symbol_fails_pipeline():
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start_resp = await client.post("/api/v1/analyze", json={"gene_symbol": "!!!bad"})
        analysis_id = start_resp.json()["analysis_id"]

        for _ in range(20):
            status_resp = await client.get(f"/api/v1/analyze/{analysis_id}")
            body = status_resp.json()
            if body["status"] in ("completed", "failed"):
                break
            await asyncio.sleep(0.3)

        assert body["status"] == "failed"
        assert body["result"] is None
        assert "Gene Validation Agent" in body["error_message"]
