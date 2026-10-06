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
        raise ReportNotReadyError(f"No generated PDF available yet for analysis '{analysis_id}'.")

    return FileResponse(
        path=report_row.pdf_path,
        media_type="application/pdf",
        filename=f"genomeai-report-{history.gene_symbol}-{analysis_id[:8]}.pdf",
    )
