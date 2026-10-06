"""
AgentOrchestrator — coordinates the full agent pipeline for one analysis
run and persists the result. This is the ONLY entry point the API layer
calls; nothing outside this module ever talks to an individual agent.
"""
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AgentExecutionError
from app.core.logging import get_logger
from app.models.analysis_history import AnalysisHistory
from app.models.report import Report
from app.orchestrator.context import AnalysisContext
from app.orchestrator.pipeline import build_pipeline
from app.orchestrator.progress import progress_store
from app.schemas.analyze import AnalysisResult

logger = get_logger(__name__)


class AgentOrchestrator:
    async def run_pipeline(self, analysis_id: str, gene_symbol: str, db: AsyncSession) -> AnalysisContext:
        context = AnalysisContext(analysis_id=analysis_id, gene_symbol=gene_symbol)
        progress_store.start(analysis_id)

        history = await db.get(AnalysisHistory, analysis_id)
        history.status = "running"
        await db.commit()

        try:
            for agent in build_pipeline():
                context = await agent.execute(context)
        except AgentExecutionError as exc:
            logger.error("analysis=%s pipeline halted: %s", analysis_id, exc.message)
            history.status = "failed"
            history.error_message = exc.message
            history.completed_at = datetime.now(timezone.utc)
            await db.commit()
            await progress_store.finish(analysis_id)
            raise

        result = AnalysisResult(
            gene_symbol=context.gene_symbol,
            validation=context.validation,
            diseases=context.diseases,
            risk_assessment=context.risk_assessment,
            verification=context.verification,
            research=context.research,
            guidance=context.guidance,
            explanation=context.explanation,
            report=context.report,
        )

        history.status = "completed"
        history.result_json = result.model_dump(mode="json")
        history.completed_at = datetime.now(timezone.utc)
        db.add(history)

        if context.report and context.report_pdf_path:
            db.add(Report(
                analysis_id=analysis_id,
                pdf_path=context.report_pdf_path,
            ))

        await db.commit()
        await progress_store.finish(analysis_id)
        return context


orchestrator = AgentOrchestrator()
