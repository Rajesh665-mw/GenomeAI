"""
The Planner's toolbox.

Each function below is a "specialist" the Gemini Planner Agent can invoke
via native function calling. Every tool:

  1. Takes plain arguments (Gemini fills these in from the user's request).
  2. Calls into the SAME service layer the fixed pipeline (app/agents/*)
     already uses — no parallel data path, no risk of the two diverging.
  3. Returns a plain JSON-serializable dict. Gemini only ever sees this
     structured data; it is never allowed to invent fields that aren't
     here (enforced by the planner's system instruction, not by this file
     alone — defense in depth).

Tools are intentionally self-contained (each re-fetches what it needs)
rather than threading a shared mutable context between them, since Gemini
may call them in any order, any subset, or not at all, depending on what
the user actually asked for. This mirrors the "any subset, any order"
requirement of an agentic planner far better than the fixed
`AnalysisContext` pipeline (which still exists, unchanged, for the
existing /analyze dashboard flow).
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from google.genai import types

from app.core.exceptions import InvalidGeneSymbolError
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
)
from app.services import (
    disease_service,
    explainability_service,
    gene_service,
    prevention_service,
    report_service,
    research_service,
    risk_service,
    verification_service,
)


async def _resolve_gene(gene_symbol: str) -> gene_service.GeneRecord:
    record = await gene_service.validate_gene(gene_symbol)
    if record is None:
        raise InvalidGeneSymbolError(f"'{gene_symbol}' is not a syntactically valid gene symbol.")
    return record


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

async def validate_gene(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    return GeneValidation(
        valid=True,
        symbol=gene_symbol.strip().upper(),
        normalized_symbol=record.symbol,
        name=record.name,
        aliases=record.aliases,
        chromosome=record.chromosome,
    ).model_dump(mode="json") | {"description": record.description}


async def get_disease_associations(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    diseases = await disease_service.get_associated_diseases(record.symbol)
    return {
        "gene_symbol": record.symbol,
        "diseases": [
            DiseaseAssociation(disease_id=d.disease_id, name=d.name, category=d.category).model_dump(mode="json")
            | {"probability": d.probability}
            for d in diseases
        ],
    }


async def assess_genetic_risk(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    diseases = await disease_service.get_associated_diseases(record.symbol)
    risk_records = await risk_service.assess_risk(diseases)
    return {
        "gene_symbol": record.symbol,
        "risk_assessment": [
            RiskAssessment(
                disease_name=r.disease_name,
                risk_level=r.risk_level,
                probability=r.probability,
                confidence_score=r.confidence_score,
            ).model_dump(mode="json")
            for r in risk_records
        ],
    }


async def verify_disease_associations(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    diseases = await disease_service.get_associated_diseases(record.symbol)
    verified = await verification_service.verify(diseases)
    return {
        "gene_symbol": record.symbol,
        "verification": [
            VerifiedAssociation(
                disease_name=v.disease_name,
                verified=v.verified,
                significance=v.significance,
                evidence_confidence=v.evidence_confidence,
                sources_checked=v.sources_checked,
            ).model_dump(mode="json")
            for v in verified
        ],
    }


async def get_research_literature(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    literature = await research_service.get_literature(record.symbol)
    return {
        "gene_symbol": record.symbol,
        "research": [
            ResearchReference(
                title=r.title, journal=r.journal, year=r.year, url=r.url, summary=r.summary
            ).model_dump(mode="json")
            for r in literature
        ],
    }


async def get_preventive_guidance(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    diseases = await disease_service.get_associated_diseases(record.symbol)
    guidance = await prevention_service.get_guidance(diseases)
    return {
        "gene_symbol": record.symbol,
        "guidance": [GuidanceItem(category=g.category, text=g.text).model_dump(mode="json") for g in guidance],
    }


async def explain_findings(gene_symbol: str) -> dict[str, Any]:
    record = await _resolve_gene(gene_symbol)
    diseases = await disease_service.get_associated_diseases(record.symbol)
    risk_records = await risk_service.assess_risk(diseases)
    verification_records = await verification_service.verify(diseases)
    explanations = await explainability_service.explain(record.symbol, diseases, risk_records, verification_records)
    return {
        "gene_symbol": record.symbol,
        "explanation": [
            ExplanationItem(subject=e.subject, reasoning=e.reasoning).model_dump(mode="json") for e in explanations
        ],
    }


async def generate_report(gene_symbol: str) -> dict[str, Any]:
    """Builds a full AnalysisContext (same shape the fixed pipeline
    produces) purely so report_service.generate_pdf — which already knows
    how to render one — can be reused without a parallel PDF layout."""
    record = await _resolve_gene(gene_symbol)
    diseases = await disease_service.get_associated_diseases(record.symbol)
    risk_records = await risk_service.assess_risk(diseases)
    verification_records = await verification_service.verify(diseases)
    literature = await research_service.get_literature(record.symbol)
    guidance = await prevention_service.get_guidance(diseases)
    explanations = await explainability_service.explain(record.symbol, diseases, risk_records, verification_records)

    analysis_id = str(uuid.uuid4())
    context = AnalysisContext(analysis_id=analysis_id, gene_symbol=record.symbol)
    context.validation = GeneValidation(
        valid=True, symbol=record.symbol, normalized_symbol=record.symbol,
        name=record.name, aliases=record.aliases, chromosome=record.chromosome,
    )
    context.diseases = [DiseaseAssociation(disease_id=d.disease_id, name=d.name, category=d.category) for d in diseases]
    context.risk_assessment = [
        RiskAssessment(disease_name=r.disease_name, risk_level=r.risk_level, probability=r.probability, confidence_score=r.confidence_score)
        for r in risk_records
    ]
    context.verification = [
        VerifiedAssociation(disease_name=v.disease_name, verified=v.verified, significance=v.significance, evidence_confidence=v.evidence_confidence, sources_checked=v.sources_checked)
        for v in verification_records
    ]
    context.research = [ResearchReference(title=r.title, journal=r.journal, year=r.year, url=r.url, summary=r.summary) for r in literature]
    context.guidance = [GuidanceItem(category=g.category, text=g.text) for g in guidance]
    context.explanation = [ExplanationItem(subject=e.subject, reasoning=e.reasoning) for e in explanations]

    pdf_path = await report_service.generate_pdf(context)
    report = ReportSummary(
        report_id=analysis_id,
        generated_at=datetime.now(timezone.utc),
        download_url=f"/api/v1/chat/reports/{analysis_id}/pdf",
    )
    context.report = report
    context.report_pdf_path = pdf_path

    # Same shape app/orchestrator/orchestrator.py persists into
    # AnalysisHistory.result_json for the fixed-pipeline flow — building it
    # here too means a chat-generated report is a first-class AnalysisHistory
    # row (see gemini_planner.py), not a second, divergent record shape.
    full_result = AnalysisResult(
        gene_symbol=context.gene_symbol,
        validation=context.validation,
        diseases=context.diseases,
        risk_assessment=context.risk_assessment,
        verification=context.verification,
        research=context.research,
        guidance=context.guidance,
        explanation=context.explanation,
        report=context.report,
        analysis_mode="ai_research",
        data_source="AI Research Analysis — Gemini + Verified Biomedical Sources",
    )

    return {
        "gene_symbol": record.symbol,
        "report": report.model_dump(mode="json"),
        "_report_pdf_path": pdf_path,  # internal bookkeeping, stripped before it ever reaches Gemini
        "_full_result": full_result.model_dump(mode="json"),  # internal — used to persist AnalysisHistory
    }


# ---------------------------------------------------------------------------
# Registry consumed by the planner
# ---------------------------------------------------------------------------

TOOL_HANDLERS: dict[str, Callable[..., Awaitable[dict[str, Any]]]] = {
    "validate_gene": validate_gene,
    "get_disease_associations": get_disease_associations,
    "assess_genetic_risk": assess_genetic_risk,
    "verify_disease_associations": verify_disease_associations,
    "get_research_literature": get_research_literature,
    "get_preventive_guidance": get_preventive_guidance,
    "explain_findings": explain_findings,
    "generate_report": generate_report,
}

_GENE_SYMBOL_PARAM = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "gene_symbol": types.Schema(
            type=types.Type.STRING,
            description="An HGNC-style gene symbol, e.g. 'BRCA1', 'TP53', 'CFTR'.",
        )
    },
    required=["gene_symbol"],
)

TOOL_DECLARATIONS = types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name="validate_gene",
        description=(
            "Validate a gene symbol and retrieve its official name, aliases, "
            "chromosome location, and description. Call this first for any "
            "gene the user mentions that hasn't already been validated this "
            "conversation."
        ),
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="get_disease_associations",
        description="Retrieve diseases associated with a gene, with association probability and category.",
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="assess_genetic_risk",
        description="Assess risk level (low/moderate/high) and confidence score for each disease associated with a gene.",
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="verify_disease_associations",
        description=(
            "Cross-check a gene's disease associations against trusted biomedical "
            "sources (NCBI, ClinVar, OMIM) and return clinical significance "
            "(e.g. Pathogenic, Likely Pathogenic, Uncertain Significance) with an "
            "evidence confidence score. Call this before presenting any clinical "
            "significance claim."
        ),
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="get_research_literature",
        description="Retrieve supporting biomedical publications (title, journal, year, summary, URL) for a gene.",
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="get_preventive_guidance",
        description="Retrieve preventive/screening/lifestyle guidance relevant to a gene's associated diseases.",
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="explain_findings",
        description=(
            "Get a plain-language explanation connecting a gene to each of its "
            "associated diseases, including risk and verification context. Use "
            "this to ground the 'why' section of an answer — never write your "
            "own biological mechanism explanation from general knowledge."
        ),
        parameters=_GENE_SYMBOL_PARAM,
    ),
    types.FunctionDeclaration(
        name="generate_report",
        description=(
            "Generate a downloadable PDF report for a gene, combining "
            "validation, disease associations, risk, verification, research, "
            "guidance, and explanation. Only call this when the user explicitly "
            "asks for a report or a download."
        ),
        parameters=_GENE_SYMBOL_PARAM,
    ),
])
