"""
POST /consultations, GET /consultations, GET /consultations/{id},
POST /consultations/{id}/respond.

Patients only ever see their own requests. Doctors see the open pool
(unassigned, pending) plus anything they've personally responded to —
there's no assignment step; any doctor can pick up any pending request by
responding to it. Admins see everything.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth_deps import get_current_user, require_roles
from app.core.exceptions import ConsultationNotFoundError, ForbiddenError
from app.db.session import get_db
from app.models.consultation import ConsultationRequest
from app.models.user import User
from app.schemas.consultation import ConsultationCreateRequest, ConsultationOut, ConsultationRespondRequest

router = APIRouter()


@router.post("/consultations", response_model=ConsultationOut, status_code=201)
async def create_consultation(
    payload: ConsultationCreateRequest,
    current_user: User = Depends(require_roles("patient")),
    db: AsyncSession = Depends(get_db),
) -> ConsultationRequest:
    consultation = ConsultationRequest(
        patient_id=current_user.id,
        gene_symbol=payload.gene_symbol.strip().upper(),
        disease_name=payload.disease_name,
        ai_report_snapshot=payload.ai_report_snapshot,
        patient_question=payload.patient_question,
        additional_notes=payload.additional_notes,
    )
    db.add(consultation)
    await db.commit()
    await db.refresh(consultation, attribute_names=["patient", "doctor"])
    return consultation


@router.get("/consultations", response_model=list[ConsultationOut])
async def list_consultations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConsultationRequest]:
    if current_user.role == "patient":
        stmt = select(ConsultationRequest).where(ConsultationRequest.patient_id == current_user.id)
    elif current_user.role == "doctor":
        stmt = select(ConsultationRequest).where(
            or_(ConsultationRequest.status == "pending", ConsultationRequest.doctor_id == current_user.id)
        )
    else:  # admin
        stmt = select(ConsultationRequest)
    stmt = stmt.order_by(ConsultationRequest.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/consultations/{consultation_id}", response_model=ConsultationOut)
async def get_consultation(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsultationRequest:
    consultation = await db.get(ConsultationRequest, consultation_id)
    if consultation is None:
        raise ConsultationNotFoundError(f"No consultation found with id '{consultation_id}'.")
    if current_user.role == "patient" and consultation.patient_id != current_user.id:
        raise ForbiddenError("You can only view your own consultation requests.")
    if current_user.role == "doctor" and consultation.status != "pending" and consultation.doctor_id != current_user.id:
        raise ForbiddenError("You cannot view consultations handled by another physician.")
    return consultation


@router.post("/consultations/{consultation_id}/respond", response_model=ConsultationOut)
async def respond_to_consultation(
    consultation_id: str,
    payload: ConsultationRespondRequest,
    current_user: User = Depends(require_roles("doctor")),
    db: AsyncSession = Depends(get_db),
) -> ConsultationRequest:
    consultation = await db.get(ConsultationRequest, consultation_id)
    if consultation is None:
        raise ConsultationNotFoundError(f"No consultation found with id '{consultation_id}'.")

    consultation.doctor_id = current_user.id
    consultation.doctor_response = payload.advice
    consultation.appointment_recommended = payload.appointment_recommended
    consultation.doctor_observations = payload.observations
    consultation.status = "responded"
    consultation.responded_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(consultation, attribute_names=["patient", "doctor"])
    return consultation
