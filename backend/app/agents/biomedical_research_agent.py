from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import ResearchReference
from app.services import research_service


class BiomedicalResearchAgent(BaseAgent):
    name = "Biomedical Research Agent"
    completion_event = "Research Retrieved"
    # Not required: a slow/unavailable literature source shouldn't block
    # the rest of the pipeline from producing a result.
    required = False

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        records = await research_service.get_literature(context.gene_symbol)
        context.research = [
            ResearchReference(title=r.title, journal=r.journal, year=r.year, url=r.url, summary=r.summary)
            for r in records
        ]
        return context
