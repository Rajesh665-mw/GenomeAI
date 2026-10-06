"""Request/response contracts for the consultation system."""
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import UserPublic


class ConsultationCreateRequest(BaseModel):
    gene_symbol: str = Field(..., min_length=1, max_length=32)
    disease_name: str | None = Field(default=None, max_length=255)
    ai_report_snapshot: dict | None = None
    patient_question: str = Field(..., min_length=1, max_length=4000)
    additional_notes: str | None = Field(default=None, max_length=4000)


class ConsultationRespondRequest(BaseModel):
    advice: str = Field(..., min_length=1, max_length=4000)
    appointment_recommended: bool
    observations: str | None = Field(default=None, max_length=4000)


class ConsultationOut(BaseModel):
    id: str
    patient: UserPublic
    doctor: UserPublic | None
    gene_symbol: str
    disease_name: str | None
    ai_report_snapshot: dict | None
    patient_question: str
    additional_notes: str | None
    status: str
    doctor_response: str | None
    appointment_recommended: bool | None
    doctor_observations: str | None
    created_at: datetime
    responded_at: datetime | None

    model_config = {"from_attributes": True}
