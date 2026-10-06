"""
Async database engine and session factory.

Works against SQLite (local dev, zero setup) or PostgreSQL (staging/prod) —
whichever DATABASE_URL points at. No code elsewhere needs to know which.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a request-scoped async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """
    Create all tables if they don't exist.

    This is a development convenience (equivalent to `Base.metadata.create_all`
    for sync SQLAlchemy). Production deployments should use Alembic migrations
    instead — this function is safe to call alongside Alembic since it's a
    no-op for tables that already exist, but Alembic remains the source of
    truth for schema evolution.
    """
    from app.db.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
