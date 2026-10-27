import os

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth_deps import get_current_user_optional
from app.api.v1.deps import get_db
from app.core.exceptions import AnalysisNotFoundError, ReportNotReadyError
from app.models.analysis_history import AnalysisHistory
from app.models.report import Report
from app.models.user import User
from app.schemas.analyze import AnalysisResult, ReportSummary

router = APIRouter()


def _check_ownership(history: AnalysisHistory, current_user: User | None) -> None:
    """Same pattern as analyze.py/chat.py: an owned analysis is only
    visible to its owner. Raises AnalysisNotFoundError (404) rather than
    403 so a non-owner can't confirm the record exists."""
    if history.user_id and (current_user is None or current_user.id != history.user_id):
        raise AnalysisNotFoundError(f"No analysis found with id '{history.id}'.")


@router.get("/reports/{analysis_id}", response_model=ReportSummary)
async def get_report_summary(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> ReportSummary:
    history = await db.get(AnalysisHistory, analysis_id)
    if history is None:
        raise AnalysisNotFoundError(f"No analysis found with id '{analysis_id}'.")
    _check_ownership(history, current_user)
    if history.status != "completed" or not history.result_json:
        raise ReportNotReadyError(f"Analysis '{analysis_id}' has not completed yet (status={history.status}).")

    result = AnalysisResult.model_validate(history.result_json)
    if result.report is None:
        raise ReportNotReadyError(f"Analysis '{analysis_id}' completed without generating a report.")
    return result.report


@router.get("/reports/{analysis_id}/pdf")
async def download_report_pdf(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> FileResponse:
    history = await db.get(AnalysisHistory, analysis_id)
    if history is None:
        raise AnalysisNotFoundError(f"No analysis found with id '{analysis_id}'.")
    _check_ownership(history, current_user)

    stmt = select(Report).where(Report.analysis_id == analysis_id).order_by(Report.generated_at.desc())
    report_row = (await db.execute(stmt)).scalars().first()

    if report_row is None or not os.path.exists(report_row.pdf_path):
        if history is not None and history.result_json:
            from app.services.report_service import generate_pdf
            from app.orchestrator.context import AnalysisContext
            from app.schemas.analyze import (
                GeneValidation, RiskAssessment, GuidanceItem,
                ExplanationItem, ResearchReference
            )
            rj = history.result_json
            val = GeneValidation(**rj["validation"]) if rj.get("validation") else None
            ra = [RiskAssessment(**x) for x in rj.get("risk_assessment", [])]
            gd = [GuidanceItem(**x) for x in rj.get("guidance", [])]
            ex = [ExplanationItem(**x) for x in rj.get("explanation", [])]
            rs = [ResearchReference(**x) for x in rj.get("research", [])]
            ctx = AnalysisContext(
                analysis_id=analysis_id,
                gene_symbol=history.gene_symbol,
                validation=val,
                risk_assessment=ra,
                guidance=gd,
                explanation=ex,
                research=rs,
            )
            reconstructed_path = await generate_pdf(ctx)
            if report_row is not None:
                report_row.pdf_path = reconstructed_path
            else:
                db.add(Report(analysis_id=analysis_id, pdf_path=reconstructed_path))
            await db.commit()
            pdf_path_to_serve = reconstructed_path
        else:
            raise ReportNotReadyError(f"No generated PDF available yet for analysis '{analysis_id}'.")
    else:
        pdf_path_to_serve = report_row.pdf_path

    return FileResponse(
        path=pdf_path_to_serve,
        media_type="application/pdf",
        filename=f"genomeai-report-{history.gene_symbol}-{analysis_id[:8]}.pdf",
    )
