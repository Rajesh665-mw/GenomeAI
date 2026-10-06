"""
Every agent implements this exact contract. The Orchestrator only ever
calls `agent.execute(context)` — it doesn't know or care how any individual
agent is implemented internally, whether that's mock logic today or a real
model/dataset call later.
"""
import asyncio
from abc import ABC, abstractmethod

from app.core.config import get_settings
from app.core.exceptions import AgentExecutionError
from app.core.logging import get_logger
from app.orchestrator.context import AnalysisContext
from app.orchestrator.progress import progress_store

logger = get_logger(__name__)


class BaseAgent(ABC):
    #: Human-readable name used in logs and SSE progress events.
    name: str = "BaseAgent"

    #: The SSE event label emitted on successful completion, per the
    #: project's specified event list (e.g. "Gene Validated").
    completion_event: str = "Step Completed"

    #: If True, a failure here halts the entire pipeline. If False, the
    #: orchestrator logs the failure and continues with the next agent.
    required: bool = True

    @abstractmethod
    async def run(self, context: AnalysisContext) -> AnalysisContext:
        """Do the agent's actual work and return the updated context.
        Subclasses implement this — never call it directly, use execute()."""
        raise NotImplementedError

    async def execute(self, context: AnalysisContext) -> AnalysisContext:
        """Wraps run() with progress events + uniform error handling."""
        await progress_store.emit(context.analysis_id, self.name, f"{self.name} started", "started")
        logger.info("analysis=%s agent=%s status=started", context.analysis_id, self.name)
        try:
            context = await self.run(context)
            settings = get_settings()
            if settings.MOCK_AGENT_DELAY_SECONDS > 0:
                await asyncio.sleep(settings.MOCK_AGENT_DELAY_SECONDS)
        except Exception as exc:  # noqa: BLE001 — intentionally broad, re-raised as a typed error
            logger.exception("analysis=%s agent=%s status=failed", context.analysis_id, self.name)
            context.failed_agents.append(self.name)
            await progress_store.emit(context.analysis_id, self.name, f"{self.name} failed", "failed")
            if self.required:
                raise AgentExecutionError(
                    f"{self.name} failed and is required for this pipeline.",
                    details={"agent": self.name, "reason": str(exc)},
                ) from exc
            return context
        else:
            await progress_store.emit(context.analysis_id, self.name, self.completion_event, "completed")
            logger.info("analysis=%s agent=%s status=completed", context.analysis_id, self.name)
            return context
