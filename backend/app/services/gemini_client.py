"""
Cached accessor for the Gemini SDK client.

Every module that needs to talk to Gemini imports `get_client()` from here
rather than constructing `genai.Client(...)` itself, so there's exactly one
place that reads GEMINI_API_KEY and exactly one place a missing-key error
can come from.
"""
from functools import lru_cache

from google import genai

from app.core.config import get_settings
from app.core.exceptions import GenomeAIError


class GeminiNotConfiguredError(GenomeAIError):
    status_code = 503
    error_code = "gemini_not_configured"


@lru_cache
def get_client() -> genai.Client:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise GeminiNotConfiguredError(
            "GEMINI_API_KEY is not set. Add it to backend/.env (see .env.example) "
            "to enable the AI Planner."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)
