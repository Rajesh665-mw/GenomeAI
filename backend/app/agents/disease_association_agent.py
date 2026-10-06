from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import DiseaseAssociation
from app.services import disease_service


class DiseaseAssociationAgent(BaseAgent):
    name = "Disease Association Agent"
    completion_event = "Disease Associations Found"
    required = True

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        records = await disease_service.get_associated_diseases(context.gene_symbol)
        context.diseases = [
            DiseaseAssociation(disease_id=r.disease_id, name=r.name, category=r.category)
            for r in records
        ]
        return context
