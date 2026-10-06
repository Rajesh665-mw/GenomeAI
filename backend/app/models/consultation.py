"""
Consultation requests.

Deliberately asymmetric by design (per the product spec): patients submit a
structured request bundling the gene/disease/AI-report context plus their
question; a doctor reviews and responds asynchronously. There is no direct
patient<->doctor messaging — everything routes through this table so both
sides always have the full clinical context attached, and so a doctor
picking up a request later has everything they need without a live thread.
"""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class ConsultationRequest(Base):
    __tablename__ = "consultation_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    # Set once a doctor responds — until then, any doctor can see and pick up the request.
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    patient: Mapped["User"] = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    doctor: Mapped["User | None"] = relationship("User", foreign_keys=[doctor_id], lazy="selectin")

    gene_symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    disease_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # A snapshot of the AI analysis at request time (e.g. the planner's
    # disease/risk/verification JSON) — frozen here so the doctor sees
    # exactly what the patient saw, even if live data sources change later.
    ai_report_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    patient_question: Mapped[str] = mapped_column(Text, nullable=False)
    additional_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)  # pending | responded
    doctor_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    appointment_recommended: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    doctor_observations: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(nullable=True)
