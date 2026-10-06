"""
AnalysisContext is the single mutable object passed from agent to agent.
Each agent reads what it needs and writes its own namespaced output —
agents never read another agent's *internal* working state, only the
published fields below, which keeps them independently testable.
"""
from dataclasses import dataclass, field

from app.schemas.analyze import (
    DiseaseAssociation,
    ExplanationItem,
    GeneValidation,
    GuidanceItem,
    ResearchReference,
    RiskAssessment,
    ReportSummary,
    VerifiedAssociation,
)


@dataclass
class AnalysisContext:
    analysis_id: str
    gene_symbol: str

    # populated incrementally as agents run, in this order:
    validation: GeneValidation | None = None
    diseases: list[DiseaseAssociation] = field(default_factory=list)
    risk_assessment: list[RiskAssessment] = field(default_factory=list)
    verification: list[VerifiedAssociation] = field(default_factory=list)
    research: list[ResearchReference] = field(default_factory=list)
    guidance: list[GuidanceItem] = field(default_factory=list)
    explanation: list[ExplanationItem] = field(default_factory=list)
    report: ReportSummary | None = None
    report_pdf_path: str | None = None  # filesystem path, not exposed in the public schema

    # bookkeeping
    failed_agents: list[str] = field(default_factory=list)
