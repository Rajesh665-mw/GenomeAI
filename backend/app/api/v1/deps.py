"""Shared dependencies for v1 endpoints."""
from app.db.session import get_db  # re-exported for convenient single-import in endpoints

__all__ = ["get_db"]
