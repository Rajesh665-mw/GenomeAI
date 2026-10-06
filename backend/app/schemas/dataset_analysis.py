"""Request/response contracts for the Dataset Analysis endpoint."""
from pydantic import BaseModel, Field

from app.schemas.analyze import AnalysisResult


class DatasetAnalysisRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200, description="A gene symbol or disease name, e.g. 'BRCA1' or 'cystic fibrosis'.")


class DatasetAnalysisResponse(BaseModel):
    found: bool
    query: str
    message: str | None = None
    result: AnalysisResult | None = None
