"""
Request/response contracts for the analysis pipeline.

These schemas are the single source of truth for what the API returns —
every agent's output eventually gets assembled into `AnalysisResult` below.
"""
from datetime import datetime

from pydantic import BaseModel, Field


# ---------- Request ----------

class AnalyzeRequest(BaseModel):
    gene_symbol: str = Field(..., min_length=1, max_length=32, examples=["BRCA1"])


# ---------- Started / status ----------

class AnalyzeStartedResponse(BaseModel):
    analysis_id: str
    status: str  # pending | running
    gene_symbol: str


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str  # pending | running | completed | failed
    gene_symbol: str
    created_at: datetime
    completed_at: datetime | None = None
    result: "AnalysisResult | None" = None
    error_message: str | None = None


# ---------- Per-agent output shapes ----------

class GeneValidation(BaseModel):
    valid: bool
    symbol: str
    normalized_symbol: str
    name: str | None = None
    aliases: list[str] = []
    chromosome: str | None = None


class DiseaseAssociation(BaseModel):
    disease_id: str
    name: str
    category: str | None = None
    description: str | None = None


class RiskAssessment(BaseModel):
    disease_name: str
    risk_level: str  # low | moderate | high
    probability: float = Field(..., description="Project-derived evidence confidence indicator (0-100), not a clinical probability")
    evidence_confidence_score: float | None = Field(default=None, description="Project-derived evidence confidence indicator (0-100), not a clinical probability")
    confidence_score: float  # 0-100


class VerifiedAssociation(BaseModel):
    disease_name: str
    verified: bool
    significance: str  # e.g. Pathogenic, Likely Pathogenic, Benign
    evidence_confidence: float  # 0-100
    sources_checked: list[str] = []


class ResearchReference(BaseModel):
    title: str
    journal: str | None = None
    year: int | None = None
    url: str | None = None
    summary: str | None = None


class GuidanceItem(BaseModel):
    category: str  # screening | lifestyle | management
    text: str


class ExplanationItem(BaseModel):
    subject: str  # what this explanation is about, e.g. a disease name
    reasoning: str


class ReportSummary(BaseModel):
    report_id: str
    generated_at: datetime
    download_url: str


class VariantEvidence(BaseModel):
    variant_identifier: str
    chromosome: str | None = None
    position: str | None = None
    reference_allele: str | None = None
    alternate_allele: str | None = None
    clinical_significance: str | None = None
    review_status: str | None = None
    condition: str | None = None
    source: str = "ClinVar"


class PhenotypeAssociation(BaseModel):
    phenotype: str
    phenotype_id: str | None = None
    disease_name: str | None = None
    source: str = "Human Phenotype Ontology"
    record_type: str = "hpo_genetic"


# ---------- Unified response ----------

class AnalysisResult(BaseModel):
    gene_symbol: str
    validation: GeneValidation
    diseases: list[DiseaseAssociation] = []
    risk_assessment: list[RiskAssessment] = []
    verification: list[VerifiedAssociation] = []
    research: list[ResearchReference] = []
    guidance: list[GuidanceItem] = []
    explanation: list[ExplanationItem] = []
    variant_evidence: list[VariantEvidence] = []
    phenotypes: list[PhenotypeAssociation] = []
    report: ReportSummary | None = None
    # Which analysis mode produced this result, and where its data came
    # from. Nullable for backward compatibility with results generated
    # before these fields existed. Populated by dataset_service for
    # Dataset Analysis; the AI Research Agent will populate these when
    # that mode is built (Phase 7) — untouched here.
    analysis_mode: str | None = None
    data_source: str | None = None


# ---------- SSE progress event ----------

class ProgressEvent(BaseModel):
    analysis_id: str
    agent: str
    event: str  # human-readable event name, e.g. "Gene Validated"
    status: str  # started | completed | failed
    timestamp: datetime
