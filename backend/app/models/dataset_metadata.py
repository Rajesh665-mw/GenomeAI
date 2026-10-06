"""
DatasetMetadata table — tracks what dataset versions/sources are currently
backing each service, once real datasets are plugged in (see
app/datasets/ and the service layer docstrings). Empty until Phase 3.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # genes | diseases | gene_disease | ...
    version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    record_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_updated: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)
