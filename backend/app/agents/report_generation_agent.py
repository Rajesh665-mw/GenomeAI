from datetime import datetime, timezone

from app.agents.base import BaseAgent
from app.orchestrator.context import AnalysisContext
from app.schemas.analyze import ReportSummary
from app.services import report_service


class ReportGenerationAgent(BaseAgent):
    name = "Report Generation Agent"
    completion_event = "Report Generated"
    required = True

    async def run(self, context: AnalysisContext) -> AnalysisContext:
        pdf_path = await report_service.generate_pdf(context)

        context.report = ReportSummary(
            report_id=context.analysis_id,
            generated_at=datetime.now(timezone.utc),
            # relative API path — the frontend prefixes this with its API base URL
            download_url=f"/api/v1/reports/{context.analysis_id}/pdf",
        )
        # actual filesystem path, for the reports endpoint to serve — kept
        # separate from the public ReportSummary schema above.
        context.report_pdf_path = pdf_path
        return context
