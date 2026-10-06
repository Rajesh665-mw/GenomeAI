"""GeneDiseaseRelations table — the association between a gene and a disease,
including the strength/significance of that association."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GeneDiseaseRelation(Base):
    __tablename__ = "gene_disease_relations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gene_id: Mapped[str] = mapped_column(ForeignKey("genes.id"), nullable=False, index=True)
    disease_id: Mapped[str] = mapped_column(ForeignKey("diseases.id"), nullable=False, index=True)
    probability: Mapped[float] = mapped_column(Float, nullable=False)  # 0-100
    significance: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. Pathogenic, Likely Pathogenic
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)
