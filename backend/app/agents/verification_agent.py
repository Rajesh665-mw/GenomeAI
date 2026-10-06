from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import VerifiedAssociation
from app.services import disease_service, verification_service


class VerificationAgent(BaseAgent):
    name = "Verification Agent"
    completion_event = "Verification Complete"
    required = True

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        disease_records = await disease_service.get_associated_diseases(context.gene_symbol)
        verified_records = await verification_service.verify(disease_records)

        context.verification = [
            VerifiedAssociation(
                disease_name=v.disease_name,
                verified=v.verified,
                significance=v.significance,
                evidence_confidence=v.evidence_confidence,
                sources_checked=v.sources_checked,
            )
            for v in verified_records
        ]
        return context
