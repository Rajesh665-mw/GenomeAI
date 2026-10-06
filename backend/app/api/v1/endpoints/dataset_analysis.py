"""
POST /dataset-analysis

The restored, original analysis mode: local datasets only, no Gemini, no
internet, no biomedical APIs. Synchronous (unlike /analyze's background-task
+ poll pattern) because dataset lookups are in-memory dict access — there's
no external I/O to wait on, so there's nothing to stream progress for.
"""
from fastapi import APIRouter, Depends

from app.api.v1.auth_deps import get_current_user_optional
from app.models.user import User
from app.schemas.dataset_analysis import DatasetAnalysisRequest, DatasetAnalysisResponse
from app.services import dataset_service

router = APIRouter()


@router.post("/dataset-analysis", response_model=DatasetAnalysisResponse)
async def run_dataset_analysis(
    payload: DatasetAnalysisRequest,
    current_user: User | None = Depends(get_current_user_optional),
) -> DatasetAnalysisResponse:
    gene_symbol = dataset_service.search(payload.query)

    if gene_symbol is None:
        return DatasetAnalysisResponse(
            found=False,
            query=payload.query,
            message="This Gene or Disease could not be found in our verified genetic records.",
        )

    result = await dataset_service.run(gene_symbol, user_id=current_user.id if current_user else None)
    return DatasetAnalysisResponse(found=True, query=payload.query, result=result)
