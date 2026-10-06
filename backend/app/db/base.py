"""
Declarative base for all ORM models.

Every model in app/models imports Base from here. This module also imports
every model so that Base.metadata is fully populated for Alembic autogenerate
and for create_all() during local development/testing.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models so they register on Base.metadata.
# (Import order doesn't matter for SQLAlchemy's metadata registration.)
from app.models import user, gene, disease, gene_disease_relation  # noqa: E402,F401
from app.models import research_paper, analysis_history, report, dataset_metadata  # noqa: E402,F401
from app.models import consultation  # noqa: E402,F401
