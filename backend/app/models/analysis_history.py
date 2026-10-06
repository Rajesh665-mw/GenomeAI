"""
AnalysisHistory table — one row per orchestrator pipeline run.

`result_json` holds the full unified response once the analysis completes
(mirrors exactly what GET /analyze/{id} and the report are built from).
Per-agent live progress during a run is tracked separately in-memory by the
orchestrator (see app/orchestrator/progress.py) and is not persisted here —
see that module's docstring for the tradeoff and production note.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    gene_symbol: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    # pending | running | completed | failed
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
