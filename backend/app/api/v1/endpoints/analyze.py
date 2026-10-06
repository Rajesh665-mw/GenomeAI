"""
POST /analyze, GET /analyze/{id}, GET /analyze/{id}/stream.

This module is intentionally thin — it validates the request, creates the
AnalysisHistory row, hands off to the Orchestrator, and shapes responses.
All actual pipeline logic lives in app/orchestrator + app/agents.
"""
import json
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth_deps import get_current_user, get_current_user_optional
from app.api.v1.deps import get_db
from app.core.exceptions import AnalysisNotFoundError
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.models.analysis_history import AnalysisHistory
from app.models.user import User
from app.orchestrator.orchestrator import orchestrator
from app.orchestrator.progress import progress_store
from app.schemas.analyze import (
    AnalysisResult,
    AnalysisStatusResponse,
    AnalyzeRequest,
    AnalyzeStartedResponse,
)

router = APIRouter()
logger = get_logger(__name__)


async def _run_analysis_background(analysis_id: str, gene_symbol: str) -> None:
    """
    Runs in a background task, so it needs its own DB session — the one
    from the original request's `Depends(get_db)` is closed by the time
    this executes, since that dependency is scoped to the request/response
    cycle and BackgroundTasks run after the response is sent.
    """
    async with AsyncSessionLocal() as db:
        try:
            await orchestrator.run_pipeline(analysis_id, gene_symbol, db)
        except Exception:
            logger.exception("analysis=%s background pipeline crashed", analysis_id)


@router.post("/analyze", response_model=AnalyzeStartedResponse, status_code=202)
async def start_analysis(
    payload: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> AnalyzeStartedResponse:
    analysis_id = str(uuid.uuid4())
    gene_symbol = payload.gene_symbol.strip().upper()

    history = AnalysisHistory(
        id=analysis_id,
        user_id=current_user.id if current_user else None,
        gene_symbol=gene_symbol,
        status="pending",
    )
    db.add(history)
    await db.commit()

    background_tasks.add_task(_run_analysis_background, analysis_id, gene_symbol)

    return AnalyzeStartedResponse(analysis_id=analysis_id, status="pending", gene_symbol=gene_symbol)


@router.get("/analyze", response_model=list[AnalysisStatusResponse])
async def list_my_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AnalysisStatusResponse]:
    """A logged-in patient's/doctor's own analysis history — powers the
    'Previous analyses' section of the dashboards. Includes both /analyze
    pipeline runs and chat-generated reports (see gemini_planner.py), since
    both write to the same AnalysisHistory table."""
    stmt = (
        select(AnalysisHistory)
        .where(AnalysisHistory.user_id == current_user.id)
        .order_by(AnalysisHistory.created_at.desc())
        .limit(50)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        AnalysisStatusResponse(
            analysis_id=h.id,
            status=h.status,
            gene_symbol=h.gene_symbol,
            created_at=h.created_at,
            completed_at=h.completed_at,
            result=AnalysisResult.model_validate(h.result_json) if h.result_json else None,
            error_message=h.error_message,
        )
        for h in rows
    ]


@router.get("/analyze/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> AnalysisStatusResponse:
    history = await db.get(AnalysisHistory, analysis_id)
    if history is None:
        raise AnalysisNotFoundError(f"No analysis found with id '{analysis_id}'.")

    # Ownership check: this endpoint is now reachable via a real page
    # (Analysis Results / Preventive Guidance), not just internal polling,
    # so a result tied to a user must only be visible to that user.
    # Ownerless (anonymous) results stay visible, matching prior behavior
    # for that case. 404 rather than 403 so a non-owner can't even confirm
    # the analysis exists.
    if history.user_id and (current_user is None or current_user.id != history.user_id):
        raise AnalysisNotFoundError(f"No analysis found with id '{analysis_id}'.")

    result = AnalysisResult.model_validate(history.result_json) if history.result_json else None

    return AnalysisStatusResponse(
        analysis_id=history.id,
        status=history.status,
        gene_symbol=history.gene_symbol,
        created_at=history.created_at,
        completed_at=history.completed_at,
        result=result,
        error_message=history.error_message,
    )


@router.get("/analyze/{analysis_id}/stream")
async def stream_analysis_progress(analysis_id: str, db: AsyncSession = Depends(get_db)):
    history = await db.get(AnalysisHistory, analysis_id)
    if history is None:
        raise AnalysisNotFoundError(f"No analysis found with id '{analysis_id}'.")

    async def event_generator():
        async for progress_event in progress_store.stream(analysis_id):
            payload = progress_event.model_dump(mode="json")
            yield f"event: progress\ndata: {json.dumps(payload)}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
