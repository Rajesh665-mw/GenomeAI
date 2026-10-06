"""
Shared HTTP client for the live biomedical data sources (MyGene.info,
HGNC, ClinVar/eutils, Europe PMC).

`safe_get_json` never raises for network/HTTP/parse errors — it returns
None so callers (the *_service.py modules) can fall back to curated mock
data per-gene rather than taking the whole request down because one public
API had a slow day. This is a deliberate reliability choice: a demo/thesis
project depending on four different free public APIs staying up
simultaneously is fragile, so every live call is "best effort, with a safety
net" rather than "must succeed."
"""
import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def safe_get_json(url: str, *, params: dict | None = None, headers: dict | None = None) -> dict | list | None:
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Live data source call failed (%s): %s", url, exc)
        return None
