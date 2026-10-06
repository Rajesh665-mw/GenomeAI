"""
The fixed, ordered pipeline of agents — this list IS the workflow diagram
from the architecture doc, expressed as code. Changing the order or
membership of the pipeline means changing this list and nothing else.
"""
from app.agents.base import BaseAgent
from app.agents.biomedical_research_agent import BiomedicalResearchAgent
from app.agents.disease_association_agent import DiseaseAssociationAgent
from app.agents.explainability_agent import ExplainabilityAgent
from app.agents.gene_validation_agent import GeneValidationAgent
from app.agents.preventive_guidance_agent import PreventiveGuidanceAgent
from app.agents.report_generation_agent import ReportGenerationAgent
from app.agents.risk_assessment_agent import RiskAssessmentAgent
from app.agents.verification_agent import VerificationAgent


def build_pipeline() -> list[BaseAgent]:
    """Returns a fresh list of agent instances for one pipeline run.
    Agents are cheap, stateless objects — a new instance per run avoids any
    chance of state leaking between concurrent analyses."""
    return [
        GeneValidationAgent(),
        DiseaseAssociationAgent(),
        RiskAssessmentAgent(),
        VerificationAgent(),
        BiomedicalResearchAgent(),
        PreventiveGuidanceAgent(),
        ExplainabilityAgent(),
        ReportGenerationAgent(),
    ]
