"""
In-memory per-analysis progress store, used to power the SSE endpoint
(GET /analyze/{id}/stream).

Tradeoff, stated plainly: this lives in process memory, keyed by
analysis_id. It works correctly for a single-process dev/staging deployment
(including this Phase 2.1 build), but a production deployment running
multiple worker processes would need a shared store instead (Redis pub/sub
is the standard choice) since a client's SSE connection could land on a
different worker than the one running the analysis. Flagging this now
rather than discovering it later — swapping the implementation behind
`ProgressStore` is a contained change; nothing above this module needs to
change when that happens.
"""
import asyncio
from datetime import datetime, timezone

from app.schemas.analyze import ProgressEvent

_DONE = object()  # sentinel pushed to a queue to signal "no more events"


class ProgressStore:
    def __init__(self) -> None:
        self._queues: dict[str, asyncio.Queue] = {}
        self._history: dict[str, list[ProgressEvent]] = {}

    def start(self, analysis_id: str) -> None:
        self._queues[analysis_id] = asyncio.Queue()
        self._history[analysis_id] = []

    async def emit(self, analysis_id: str, agent: str, event: str, status: str) -> None:
        progress_event = ProgressEvent(
            analysis_id=analysis_id,
            agent=agent,
            event=event,
            status=status,
            timestamp=datetime.now(timezone.utc),
        )
        self._history.setdefault(analysis_id, []).append(progress_event)
        queue = self._queues.get(analysis_id)
        if queue is not None:
            await queue.put(progress_event)

    async def finish(self, analysis_id: str) -> None:
        queue = self._queues.get(analysis_id)
        if queue is not None:
            await queue.put(_DONE)

    async def stream(self, analysis_id: str):
        """Async generator yielding ProgressEvents as they arrive, then stops."""
        queue = self._queues.get(analysis_id)
        if queue is None:
            return
        while True:
            item = await queue.get()
            if item is _DONE:
                break
            yield item

    def history(self, analysis_id: str) -> list[ProgressEvent]:
        return self._history.get(analysis_id, [])


# module-level singleton — imported wherever progress needs to be read/written
progress_store = ProgressStore()
