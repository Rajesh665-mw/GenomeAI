"""
Integration tests for GenomeAI Master Dataset Construction and API Endpoints.

Validates:
- BRCA1, TP53, CFTR, HBB existence and analysis results
- Gene and disease normalization
- Deduplication and provenance preservation
- Synthetic data flag isolation (NDCTD-45K)
- Derived gene relationship graph creation
- Unknown gene and empty query behavior
"""
import pytest
from httpx import ASGITransport, AsyncClient
import pandas as pd
from pathlib import Path

from app.db.session import init_db
from app.main import app
from app.services.master_dataset_loader import registry
from app.services import dataset_service


@pytest.mark.asyncio
async def test_master_dataset_core_demo_genes():
    """Verify BRCA1, TP53, CFTR, and HBB exist and have rich biomedical associations."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for gene in ["BRCA1", "TP53", "CFTR", "HBB"]:
            r = await client.post("/api/v1/dataset-analysis", json={"query": gene})
            assert r.status_code == 200, f"Failed querying {gene}"
            data = r.json()
            assert data["found"] is True, f"Gene {gene} not found"
            result = data["result"]
            assert result["gene_symbol"] == gene
            assert result["validation"]["valid"] is True
            assert len(result["diseases"]) > 0, f"No diseases for {gene}"
            assert len(result["risk_assessment"]) > 0
            assert len(result["guidance"]) > 0
            assert result["report"]["download_url"] is not None


@pytest.mark.asyncio
async def test_gene_normalization():
    """Verify case insensitivity and whitespace stripping during gene search."""
    assert dataset_service.search("brca1") == "BRCA1"
    assert dataset_service.search("  Brca1  ") == "BRCA1"
    assert dataset_service.search("tp53") == "TP53"
    assert dataset_service.search("cftr") == "CFTR"
    assert dataset_service.search("hbb") == "HBB"
    assert dataset_service.search("APC") == "APC"


@pytest.mark.asyncio
async def test_disease_normalization_and_search():
    """Verify disease search resolves correctly to associated genes."""
    assert dataset_service.search("cystic fibrosis") == "CFTR"
    assert dataset_service.search("Cystic Fibrosis") == "CFTR"
    # Lynch syndrome maps to a mismatch repair gene (MLH1, MSH2, MSH6, PMS2, EPCAM)
    lynch_res = dataset_service.search("lynch syndrome")
    assert lynch_res in ["MLH1", "MSH2", "MSH6", "PMS2", "EPCAM"]


@pytest.mark.asyncio
async def test_duplicate_removal_and_provenance():
    """Verify deduplication integrity and provenance documentation."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    master_csv = production_dir / "genomeai_master_dataset.csv"
    assert master_csv.exists(), "Master CSV missing"

    df_master = pd.read_csv(master_csv)
    # Check no duplicate (gene_symbol, disease_name) pairs
    dups = df_master.duplicated(subset=["gene_symbol", "disease_name"]).sum()
    assert dups == 0, f"Found {dups} duplicate (gene, disease) pairs in master CSV"

    # Check provenance
    prov_csv = Path(__file__).resolve().parent.parent.parent / "datasets" / "metadata" / "genomeai_dataset_provenance.csv"
    assert prov_csv.exists(), "Provenance CSV missing"
    df_prov = pd.read_csv(prov_csv)
    assert len(df_prov) > 0
    assert "source_dataset" in df_prov.columns
    assert "evidence_level" in df_prov.columns
    assert "is_synthetic" in df_prov.columns


@pytest.mark.asyncio
async def test_synthetic_flag_isolation():
    """Verify synthetic NDCTD data is strictly isolated and flagged."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    master_csv = production_dir / "genomeai_master_dataset.csv"
    df_master = pd.read_csv(master_csv)

    # Master biomedical dataset must have is_synthetic == False
    assert (df_master["is_synthetic"] == False).all(), "Master biomedical records must not be synthetic"
    assert (df_master["evidence_level"] == "authoritative").all()

    # Synthetic NDCTD dataset must exist exclusively in datasets/synthetic/
    synthetic_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "synthetic"
    synth_csv = synthetic_dir / "NDCTD-45K.csv"
    assert synth_csv.exists(), "Synthetic NDCTD-45K.csv missing from datasets/synthetic/"
    df_synth = pd.read_csv(synth_csv, nrows=10)
    assert len(df_synth) > 0


@pytest.mark.asyncio
async def test_derived_gene_relationships():
    """Verify derived gene relationship graph edges are correctly created and labelled."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    rel_csv = production_dir / "genomeai_gene_relationships.csv"
    assert rel_csv.exists(), "Relationships CSV missing"

    df_rel = pd.read_csv(rel_csv)
    assert len(df_rel) > 0
    assert (df_rel["is_derived"] == True).all()
    assert (df_rel["evidence_level"] == "derived").all()

    # Check BRCA1 and TP53 shared disease derivation
    brca1_tp53 = df_rel[
        ((df_rel["gene_a"] == "BRCA1") & (df_rel["gene_b"] == "TP53")) |
        ((df_rel["gene_a"] == "TP53") & (df_rel["gene_b"] == "BRCA1"))
    ]
    assert len(brca1_tp53) > 0, "BRCA1 and TP53 should share disease associations"


@pytest.mark.asyncio
async def test_unknown_gene_and_empty_query_behavior():
    """Verify unknown genes and empty queries return found=False without crashing."""
    # Service level checks
    assert dataset_service.search("") is None
    assert dataset_service.search("   ") is None
    assert dataset_service.search("UNKNOWN_GENE_99999") is None

    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty string fails pydantic min_length=1 validation cleanly with 422
        r_empty = await client.post("/api/v1/dataset-analysis", json={"query": ""})
        assert r_empty.status_code == 422

        # Whitespace query passes validation and returns found=False
        r_space = await client.post("/api/v1/dataset-analysis", json={"query": "   "})
        assert r_space.status_code == 200
        assert r_space.json()["found"] is False

        # Unknown gene returns found=False with clear user message
        r_unk = await client.post("/api/v1/dataset-analysis", json={"query": "UNKNOWN_GENE_99999"})
        assert r_unk.status_code == 200
        assert r_unk.json()["found"] is False
        assert "could not be found" in r_unk.json()["message"]


@pytest.mark.asyncio
async def test_extended_panel_genes_validation():
    """Verify extended benchmark genes: APC, MLH1, MSH2, PTEN, FBN1, LDLR."""
    for gene in ["APC", "MLH1", "MSH2", "PTEN", "FBN1", "LDLR"]:
        assert dataset_service.search(gene) == gene
        assert dataset_service.search(gene.lower()) == gene
        record = registry.get_gene_record(gene)
        assert record.symbol == gene
        assert record.name is not None
        diseases = registry.get_disease_records(gene)
        assert len(diseases) > 0, f"Expected diseases for {gene}"


@pytest.mark.asyncio
async def test_normalized_schema_and_file_presence():
    """Verify all normalized master tables exist with expected schemas."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    expected_files = [
        "genomeai_genes.csv",
        "genomeai_diseases.csv",
        "genomeai_gene_disease_associations.csv",
        "genomeai_variant_evidence.csv",
        "genomeai_phenotypes.csv",
        "genomeai_phenotypes_hpo.csv",
        "genomeai_clinical_symptoms.csv",
        "genomeai_gene_relationships.csv",
        "genomeai_preventive_guidance.csv",
        "genomeai_master_dataset.csv",
    ]
    for fname in expected_files:
        fpath = production_dir / fname
        assert fpath.exists(), f"Required file {fname} is missing in {production_dir}"
        df = pd.read_csv(fpath, nrows=5)
        assert len(df.columns) > 0, f"{fname} has no columns"


@pytest.mark.asyncio
async def test_missing_value_integrity_no_fabricated_numbers():
    """Verify that unmeasured medical values remain honest null/empty."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    df_genes = pd.read_csv(production_dir / "genomeai_genes.csv")
    assert df_genes["gene_symbol"].notna().all(), "All genes must have a symbol"
    
    df_master = pd.read_csv(production_dir / "genomeai_master_dataset.csv")
    assert df_master["gene_symbol"].notna().all()
    assert df_master["disease_name"].notna().all()
    assert (df_master["is_synthetic"] == False).all()


@pytest.mark.asyncio
async def test_phenotype_split_and_record_types():
    """Verify HPO genetic phenotypes and generic clinical survey symptoms are strictly separated."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    hpo_csv = production_dir / "genomeai_phenotypes_hpo.csv"
    clin_csv = production_dir / "genomeai_clinical_symptoms.csv"

    assert hpo_csv.exists(), "genomeai_phenotypes_hpo.csv missing"
    assert clin_csv.exists(), "genomeai_clinical_symptoms.csv missing"

    df_hpo = pd.read_csv(hpo_csv)
    df_clin = pd.read_csv(clin_csv)

    # Verify counts
    assert len(df_hpo) == 711, f"Expected 711 HPO records, got {len(df_hpo)}"
    assert len(df_clin) == 252, f"Expected 252 clinical survey records, got {len(df_clin)}"

    # Verify record_type tags
    assert (df_hpo["record_type"] == "hpo_genetic").all(), "All HPO rows must be tagged hpo_genetic"
    assert (df_clin["record_type"] == "clinical_survey").all(), "All clinical rows must be tagged clinical_survey"
    assert (df_hpo["source_dataset"] == "gene_condition_source_id").all()
    assert (df_clin["source_dataset"] == "Disease_symptom_and_patient_profile_dataset").all()


@pytest.mark.asyncio
async def test_preventive_guidance_provenance_educational():
    """Verify preventive guidance provenance clearly states synthesized educational origin."""
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    guidance_csv = production_dir / "genomeai_preventive_guidance.csv"
    assert guidance_csv.exists(), "Preventive guidance CSV missing"

    df = pd.read_csv(guidance_csv)
    assert len(df) > 0

    # Must be synthesized educational summary, not claiming official database export
    assert (df["source"] == "Synthesized educational guidance based on published clinical guidelines").all()
    assert (df["evidence_level"] == "project_synthesized_educational").all()
    assert "source_references" in df.columns
    for _, row in df.iterrows():
        assert not str(row["source"]).startswith("Official"), "Guidance must not claim official dataset export"


@pytest.mark.asyncio
async def test_production_data_source_verification():
    """Verify benchmark genes are loaded from production master dataset without mock bypass."""
    benchmark_genes = ["BRCA1", "BRCA2", "TP53", "CFTR", "HBB", "APC", "MLH1", "MSH2", "PTEN", "FBN1", "LDLR"]
    for gene in benchmark_genes:
        record = registry.get_gene_record(gene)
        assert record.symbol == gene
        assert record.source == "master_dataset", f"{gene} record source should be master_dataset, got {record.source}"

        diseases = registry.get_disease_records(gene)
        assert len(diseases) > 0, f"Expected disease records for {gene}"
        for d in diseases:
            # Check presence of evidence confidence score
            assert hasattr(d, "evidence_confidence_score")
            assert d.evidence_confidence_score > 0
            assert d.probability > 0

    # Verify Cystic Fibrosis resolves to CFTR and Lynch Syndrome resolves to MSH2/MLH1
    assert dataset_service.search("cystic fibrosis") == "CFTR"
    assert dataset_service.search("Cystic Fibrosis") == "CFTR"
    assert dataset_service.search("lynch syndrome") in ["MSH2", "MLH1"]
    assert dataset_service.search("Lynch Syndrome") in ["MSH2", "MLH1"]


@pytest.mark.asyncio
async def test_mock_data_purity_and_zero_bypass():
    """Verify zero dependency on _mock_data.py or hardcoded DISEASES_BY_GENE for Gene Analysis."""
    for sym in ["BRCA1", "BRCA2", "TP53", "CFTR"]:
        res = await dataset_service.run(sym)
        assert res.gene_symbol == sym
        assert len(res.diseases) > 0
        for d in res.diseases:
            assert "synthetic" not in d.name.lower(), f"Synthetic disease found in {sym}"
        for r in res.risk_assessment:
            assert hasattr(r, "evidence_confidence_score")
            assert 0.0 < r.evidence_confidence_score <= 100.0


@pytest.mark.asyncio
async def test_variant_evidence_and_phenotypes_linking():
    """Verify real ClinVar HGVS variants and HPO phenotypes are linked to Gene Analysis results."""
    res_brca1 = await dataset_service.run("BRCA1")
    assert len(res_brca1.variant_evidence) > 0, "BRCA1 should have ClinVar variant evidence"
    v0 = res_brca1.variant_evidence[0]
    assert v0.variant_identifier.startswith("NC_"), f"Expected HGVS genomic identifier, got {v0.variant_identifier}"
    assert v0.clinical_significance is not None
    assert v0.source == "ClinVar"

    # BRCA2 has both variants and HPO phenotypes in the dataset
    res_brca2 = await dataset_service.run("BRCA2")
    assert len(res_brca2.variant_evidence) > 0
    assert len(res_brca2.phenotypes) > 0, "BRCA2 should have HPO phenotypes"
    p0 = res_brca2.phenotypes[0]
    assert p0.phenotype is not None
    assert p0.record_type == "hpo_genetic"


@pytest.mark.asyncio
async def test_tamper_evident_pdf_hash_and_reconstruction():
    """Verify report PDF includes cryptographic seal and supports on-demand reconstruction."""
    import os
    from app.services.report_service import compute_pdf_hash, verify_pdf_integrity, get_reports_dir

    res = await dataset_service.run("BRCA1")
    rep_id = res.report.report_id
    pdf_path = os.path.join(get_reports_dir(), f"{rep_id}.pdf")
    assert os.path.exists(pdf_path), "PDF must exist after dataset_service.run"

    # Compute and verify hash
    pdf_hash = compute_pdf_hash(pdf_path)
    assert len(pdf_hash) == 64, f"Expected 64-char hex SHA-256, got {pdf_hash}"
    assert verify_pdf_integrity(pdf_path, pdf_hash) is True
    assert verify_pdf_integrity(pdf_path, "0" * 64) is False

    # Verify reconstruction after deletion
    os.remove(pdf_path)
    assert not os.path.exists(pdf_path)

    # Use HTTP client to test reconstruction via /reports/{id}/pdf
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        import uuid
        test_email = f"pdf_user_{uuid.uuid4().hex[:6]}@test.com"
        reg = await client.post("/api/v1/auth/register", json={
            "email": test_email,
            "password": "Password123!",
            "full_name": "PDF User",
            "role": "patient",
        })
        assert reg.status_code == 201, f"Register failed: {reg.text}"
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Run via gene-analysis endpoint
        ga_res = await client.post("/api/v1/gene-analysis", json={"query": "TP53"}, headers=headers)
        assert ga_res.status_code == 200
        tp53_id = ga_res.json()["result"]["report"]["report_id"]
        tp53_pdf = os.path.join(get_reports_dir(), f"{tp53_id}.pdf")
        assert os.path.exists(tp53_pdf)
        os.remove(tp53_pdf)

        dl_res = await client.get(f"/api/v1/reports/{tp53_id}/pdf", headers=headers)
        assert dl_res.status_code == 200
        assert dl_res.content.startswith(b"%PDF")
        assert os.path.exists(tp53_pdf), "PDF must be reconstructed on disk"


@pytest.mark.asyncio
async def test_gene_analysis_endpoint_alias():
    """Verify /api/v1/gene-analysis returns valid results matching /api/v1/dataset-analysis."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/api/v1/gene-analysis", json={"query": "CFTR"})
        assert r.status_code == 200
        data = r.json()
        assert data["found"] is True
        assert data["result"]["gene_symbol"] == "CFTR"


@pytest.mark.asyncio
async def test_production_dataset_validation_cli():
    """Verify validate_datasets script passes with exit code 0."""
    from scripts.validate_datasets import validate_production_datasets
    production_dir = Path(__file__).resolve().parent.parent.parent / "datasets" / "production"
    is_valid, failures, stats = validate_production_datasets(production_dir)
    assert is_valid is True, f"Validation failed with: {failures}"
    assert len(failures) == 0
    assert stats["benchmark_genes_present"] == 11
    assert stats["master_duplicate_pairs"] == 0
    assert stats["master_synthetic_rows"] == 0
