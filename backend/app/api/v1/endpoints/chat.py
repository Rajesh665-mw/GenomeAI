"""
POST /chat/stream — the AI Agent entry point.

Unlike /analyze (fixed gene_symbol -> fixed 8-agent pipeline), this accepts
free-text ("Analyze BRCA1", "Compare BRCA1 and TP53", "Generate report for
CFTR") and lets the Gemini Planner Agent decide which specialist agents to
call, in what order, for what genes — see app/orchestrator/gemini_planner.py.
"""
import json
import os

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth_deps import get_current_user_optional
from app.api.v1.deps import get_db
from app.core.config import get_settings
from app.core.exceptions import GenomeAIError, ReportNotReadyError
from app.models.analysis_history import AnalysisHistory
from app.models.user import User
from app.orchestrator.conversation_store import conversation_store
from app.orchestrator.gemini_planner import planner
from app.schemas.chat import ChatRequest, ChatSessionResetResponse

router = APIRouter()


@router.post("/chat/stream")
async def stream_chat_turn(payload: ChatRequest, current_user: User | None = Depends(get_current_user_optional)):
    # Namespaced by user when logged in, so two people can never collide on
    # (or guess into) the same session_id. Anonymous sessions — the public
    # marketing-page demo — keep the raw client-generated id.
    effective_session_id = f"user:{current_user.id}:{payload.session_id}" if current_user else payload.session_id

    async def event_generator():
        try:
            async for event in planner.stream_turn(
                effective_session_id, payload.message, user_id=current_user.id if current_user else None
            ):
                # internal-only fields (e.g. filesystem paths) never cross the wire
                public_event = {k: v for k, v in event.items() if not k.startswith("_")}
                event_type = public_event.pop("type")
                yield f"event: {event_type}\ndata: {json.dumps(public_event)}\n\n"
        except GenomeAIError as exc:
            yield f"event: error\ndata: {json.dumps({'message': exc.message})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/chat/reset", response_model=ChatSessionResetResponse)
async def reset_chat_session(
    session_id: str, current_user: User | None = Depends(get_current_user_optional)
) -> ChatSessionResetResponse:
    effective_session_id = f"user:{current_user.id}:{session_id}" if current_user else session_id
    conversation_store.reset(effective_session_id)
    return ChatSessionResetResponse(session_id=session_id)


@router.get("/chat/reports/{report_id}/pdf")
async def download_chat_report_pdf(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> FileResponse:
    """
    Serves PDFs generated via the chat `generate_report` tool, and (since
    they share this same file-based route — see dataset_service.run and
    gemini_planner._persist_report_as_analysis_history) Gene Analysis
    reports too.

    Ownership check: `report_id` is always the same id as the owning
    AnalysisHistory row when one exists (analysis_id == report_id by
    construction). If that row has an owner, only that owner may download
    the PDF — reuses the same "not ready" (409) response a missing file
    would give, rather than a 403, so a non-owner can't distinguish
    "doesn't exist" from "not yours" and can't confirm the report exists.
    Reports with no AnalysisHistory row (e.g. anonymous chat-generated
    ones) stay accessible by id, matching prior behavior for that case.
    """
    from app.services.report_service import get_reports_dir, generate_pdf
    from app.orchestrator.context import AnalysisContext
    from app.schemas.analyze import (
        GeneValidation,
        RiskAssessment,
        GuidanceItem,
        ExplanationItem,
        ResearchReference,
    )

    history = await db.get(AnalysisHistory, report_id)
    if history is not None and history.user_id:
        if current_user is None or current_user.id != history.user_id:
            raise ReportNotReadyError(f"No generated PDF found for report '{report_id}'.")

    path = os.path.join(get_reports_dir(), f"{report_id}.pdf")
    if not os.path.exists(path):
        if history is not None and history.result_json:
            rj = history.result_json
            val = GeneValidation(**rj["validation"]) if rj.get("validation") else None
            ra = [RiskAssessment(**x) for x in rj.get("risk_assessment", [])]
            gd = [GuidanceItem(**x) for x in rj.get("guidance", [])]
            ex = [ExplanationItem(**x) for x in rj.get("explanation", [])]
            rs = [ResearchReference(**x) for x in rj.get("research", [])]
            ctx = AnalysisContext(
                analysis_id=report_id,
                gene_symbol=history.gene_symbol,
                validation=val,
                risk_assessment=ra,
                guidance=gd,
                explanation=ex,
                research=rs,
            )
            await generate_pdf(ctx)
        else:
            raise ReportNotReadyError(f"No generated PDF found for report '{report_id}'.")

    return FileResponse(path=path, media_type="application/pdf", filename=f"genomeai-report-{report_id[:8]}.pdf")
