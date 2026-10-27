"""
Dataset Analysis — the deterministic master dataset analysis mode for GenomeAI.

This module NEVER calls Gemini, the internet, or any biomedical API,
regardless of the GENOMEAI_DATA_SOURCE setting. It operates directly
against the verified local master dataset collection assembled from
authoritative NCBI ClinVar gene-condition records, curated ClinVar
variant evidence, and supplementary clinical profiles.

risk_service, verification_service, explainability_service, prevention_service,
and report_service are reused as-is.
"""
import uuid
from datetime import datetime, timezone

from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import (
    AnalysisResult,
    DiseaseAssociation,
    ExplanationItem,
    GeneValidation,
    GuidanceItem,
    ResearchReference,
    RiskAssessment,
    ReportSummary,
    VerifiedAssociation,
    VariantEvidence,
    PhenotypeAssociation,
)
from app.services import explainability_service, prevention_service, report_service, risk_service, verification_service
from app.services.master_dataset_loader import registry

DATA_SOURCE_LABEL = "Verified Biomedical Records"
ANALYSIS_MODE = "dataset"


def search(query: str) -> str | None:
    """
    Looks up `query` against the local master dataset collection. Returns
    the matching gene symbol, or None if nothing in the dataset matches.

    Resolves exact gene symbol matches first (e.g. "BRCA1", "TP53", "HBB",
    case-insensitive), then resolves disease name matches (e.g. "cystic
    fibrosis" -> CFTR, "lynch syndrome" -> MLH1/MSH2).
    """
    return registry.search(query)


async def run(gene_symbol: str, user_id: str | None = None) -> AnalysisResult:
    """
    Runs the full dataset-only pipeline for a gene already confirmed present
    via `search()`, and returns the complete AnalysisResult shape required by
    the platform (Gene Analysis Results, Preventive Guidance, Report, PDF).
    """
    gene_record = registry.get_gene_record(gene_symbol)
    disease_records = registry.get_disease_records(gene_symbol)
    research_records = registry.get_research_records(gene_symbol)

    risk_records = await risk_service.assess_risk(disease_records)
    verification_records = await verification_service.verify(disease_records)
    guidance_records = await prevention_service.get_guidance(disease_records)
    explanation_records = await explainability_service.explain(
        gene_symbol, disease_records, risk_records, verification_records
    )

    analysis_id = str(uuid.uuid4())
    context = AnalysisContext(analysis_id=analysis_id, gene_symbol=gene_record.symbol)
    context.validation = GeneValidation(
        valid=True,
        symbol=gene_record.symbol,
        normalized_symbol=gene_record.symbol,
        name=gene_record.name,
        aliases=gene_record.aliases,
        chromosome=gene_record.chromosome,
    )
    context.diseases = [
        DiseaseAssociation(disease_id=d.disease_id, name=d.name, category=d.category) for d in disease_records
    ]
    context.risk_assessment = [
        RiskAssessment(
            disease_name=r.disease_name,
            risk_level=r.risk_level,
            probability=r.probability,
            evidence_confidence_score=getattr(r, "evidence_confidence_score", r.probability),
            confidence_score=r.confidence_score,
        )
        for r in risk_records
    ]
    context.verification = [
        VerifiedAssociation(
            disease_name=v.disease_name,
            verified=v.verified,
            significance=v.significance,
            evidence_confidence=v.evidence_confidence,
            sources_checked=v.sources_checked,
        )
        for v in verification_records
    ]
    context.research = [
        ResearchReference(
            title=r.title,
            journal=r.journal,
            year=r.year,
            url=r.url,
            summary=r.summary,
        )
        for r in research_records
    ]
    context.guidance = [GuidanceItem(category=g.category, text=g.text) for g in guidance_records]
    context.explanation = [ExplanationItem(subject=e.subject, reasoning=e.reasoning) for e in explanation_records]

    pdf_path = await report_service.generate_pdf(context)
    context.report = ReportSummary(
        report_id=analysis_id,
        generated_at=datetime.now(timezone.utc),
        download_url=f"/api/v1/chat/reports/{analysis_id}/pdf",
    )
    context.report_pdf_path = pdf_path

    variant_raw = registry.get_variant_evidence(gene_symbol)
    variant_records = [
        VariantEvidence(
            variant_identifier=v["variant_identifier"],
            chromosome=v.get("chromosome"),
            position=v.get("position"),
            reference_allele=v.get("reference_allele"),
            alternate_allele=v.get("alternate_allele"),
            clinical_significance=v.get("clinical_significance"),
            review_status=v.get("review_status"),
            condition=v.get("condition"),
            source=v.get("source", "ClinVar"),
        )
        for v in variant_raw
    ]

    phenotype_raw = registry.get_phenotypes(gene_symbol)
    phenotype_records = [
        PhenotypeAssociation(
            phenotype=p["phenotype"],
            phenotype_id=p.get("phenotype_id"),
            disease_name=p.get("disease_name"),
            source=p.get("source", "Human Phenotype Ontology"),
            record_type=p.get("record_type", "hpo_genetic"),
        )
        for p in phenotype_raw
    ]

    result = AnalysisResult(
        gene_symbol=context.gene_symbol,
        validation=context.validation,
        diseases=context.diseases,
        risk_assessment=context.risk_assessment,
        verification=context.verification,
        research=context.research,
        guidance=context.guidance,
        explanation=context.explanation,
        variant_evidence=variant_records,
        phenotypes=phenotype_records,
        report=context.report,
        analysis_mode=ANALYSIS_MODE,
        data_source=DATA_SOURCE_LABEL,
    )

    if user_id:
        await _persist_history(analysis_id, user_id, gene_record.symbol, result, pdf_path)

    return result


async def _persist_history(analysis_id: str, user_id: str, gene_symbol: str, result: AnalysisResult, pdf_path: str) -> None:
    """Best-effort persistence so Dataset Analysis results appear in
    Previous Analyses / Report Access dashboards."""
    from app.db.session import AsyncSessionLocal
    from app.models.analysis_history import AnalysisHistory
    from app.models.report import Report

    try:
        async with AsyncSessionLocal() as db:
            db.add(AnalysisHistory(
                id=analysis_id,
                user_id=user_id,
                gene_symbol=gene_symbol,
                status="completed",
                result_json=result.model_dump(mode="json"),
                completed_at=datetime.now(timezone.utc),
            ))
            db.add(Report(analysis_id=analysis_id, pdf_path=pdf_path))
            await db.commit()
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to persist Dataset Analysis result as AnalysisHistory")
