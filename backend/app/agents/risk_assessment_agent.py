from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import RiskAssessment
from app.services import disease_service, risk_service


class RiskAssessmentAgent(BaseAgent):
    name = "Risk Assessment Agent"
    completion_event = "Risk Assessment Complete"
    required = True

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        # re-resolve full disease records (with probability) for this gene —
        # keeps each agent's service calls self-contained rather than
        # threading internal service DTOs through the shared context.
        disease_records = await disease_service.get_associated_diseases(context.gene_symbol)
        risk_records = await risk_service.assess_risk(disease_records)

        context.risk_assessment = [
            RiskAssessment(
                disease_name=r.disease_name,
                risk_level=r.risk_level,
                probability=r.probability,
                confidence_score=r.confidence_score,
                evidence_confidence_score=getattr(r, "evidence_confidence_score", r.probability),
            )
            for r in risk_records
        ]
        return context
