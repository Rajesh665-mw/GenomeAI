from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import GuidanceItem
from app.services import disease_service, prevention_service


class PreventiveGuidanceAgent(BaseAgent):
    name = "Preventive Guidance Agent"
    completion_event = "Preventive Guidance Generated"
    required = True

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        disease_records = await disease_service.get_associated_diseases(context.gene_symbol)
        guidance_records = await prevention_service.get_guidance(disease_records)

        context.guidance = [
            GuidanceItem(category=g.category, text=g.text) for g in guidance_records
        ]
        return context
