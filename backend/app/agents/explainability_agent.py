from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import ExplanationItem
from app.services import explainability_service
from app.services.disease_service import DiseaseRecord
from app.services.risk_service import RiskRecord
from app.services.verification_service import VerificationRecord


class ExplainabilityAgent(BaseAgent):
    name = "Explainability Agent"
    completion_event = "Explanation Generated"
    required = False

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        # deliberately has no service of its own — it only reads what prior
        # agents already published to the context and explains it in plain
        # language, via the shared explainability_service (also used by the
        # Gemini planner's explain_findings tool) so both code paths stay
        # honest in exactly the same way: they can't introduce new claims,
        # only explain existing ones.
        disease_records = [
            DiseaseRecord(disease_id=d.disease_id, name=d.name, category=d.category, probability=0.0)
            for d in context.diseases
        ]
        risk_records = [
            RiskRecord(
                disease_name=r.disease_name,
                risk_level=r.risk_level,
                probability=r.probability,
                confidence_score=r.confidence_score,
            )
            for r in context.risk_assessment
        ]
        verification_records = [
            VerificationRecord(
                disease_name=v.disease_name,
                verified=v.verified,
                significance=v.significance,
                evidence_confidence=v.evidence_confidence,
                sources_checked=v.sources_checked,
            )
            for v in context.verification
        ]

        explanations = await explainability_service.explain(
            context.gene_symbol, disease_records, risk_records, verification_records
        )
        context.explanation = [
            ExplanationItem(subject=e.subject, reasoning=e.reasoning) for e in explanations
        ]
        return context
