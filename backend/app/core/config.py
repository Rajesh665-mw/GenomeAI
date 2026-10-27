"""
Central application configuration.

All values are overridable via environment variables / a .env file, per
Twelve-Factor practice. Nothing here is hardcoded for a specific environment.
"""
import json
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App metadata ---
    APP_NAME: str = "GenomeAI Backend"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"  # development | staging | production
    DEBUG: bool = True

    # --- API ---
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    return json.loads(v_stripped)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # --- Database ---
    # Production target is PostgreSQL, e.g.:
    #   postgresql+asyncpg://user:password@host:5432/genomeai
    # Local development defaults to a SQLite file so the project runs with
    # zero external setup; swapping DATABASE_URL is the only change needed
    # to point this at a real Postgres instance.
    DATABASE_URL: str = "sqlite+aiosqlite:///./genomeai.db"
    DATABASE_ECHO: bool = False

    # --- Security (JWT) ---
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_A_REAL_SECRET"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Orchestrator / agents ---
    # Simulated per-agent processing delay in mock mode, so the SSE progress
    # stream feels realistic and matches the frontend's existing agent-feed
    # pacing. Set to 0 for instant responses (e.g. in tests).
    MOCK_AGENT_DELAY_SECONDS: float = 0.6

    # --- Datasets ---
    # Path to directory containing production datasets (defaults to app/../datasets/production)
    DATASET_DIR: str | None = None

    # --- Reports ---
    REPORTS_DIR: str = "./generated_reports"

    # --- Gemini (AI Planner / reasoning engine) ---
    # The Planner Agent's "brain": Gemini decides which backend agents to
    # invoke and synthesizes their structured JSON into a professional
    # analysis. It never invents biomedical facts — see gemini_planner.py's
    # system instruction for the enforced contract.
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    # Hard ceiling on tool-calling rounds per user turn, so a confused model
    # can't loop indefinitely calling tools instead of answering.
    GEMINI_MAX_TOOL_ROUNDS: int = 6

    # --- Live biomedical data sources ---
    # "live" calls the real public APIs below (with mock-data fallback per
    # gene on any network/parse failure); "mock" always uses the curated
    # _mock_data.py table, e.g. for offline development or demos.
    GENOMEAI_DATA_SOURCE: str = "live"
    HTTP_TIMEOUT_SECONDS: float = 8.0

    HGNC_BASE_URL: str = "https://rest.genenames.org"
    MYGENE_BASE_URL: str = "https://mygene.info/v3"
    CLINVAR_EUTILS_BASE_URL: str = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    EUROPE_PMC_BASE_URL: str = "https://www.ebi.ac.uk/europepmc/webservices/rest"
    # NCBI eutils allows 3 req/sec without a key, 10 req/sec with one.
    # https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/
    NCBI_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — import and call this, don't instantiate
    Settings() directly, so the whole app shares one instance."""
    return Settings()
