"""
Europe PMC live data source — supporting literature for a gene.

No API key required. https://europepmc.org/RestfulWebService
"""
from app.core.config import get_settings
from app.services.http_client import safe_get_json

_ABSTRACT_PREVIEW_CHARS = 280


async def search_literature(gene_symbol: str, page_size: int = 5) -> list[dict]:
    """Returns up to `page_size` recent, relevant articles for a gene
    symbol as raw Europe PMC result dicts. Empty list on failure — the
    caller treats "no literature found" and "source unreachable" the same
    way (no fabricated citations either way)."""
    settings = get_settings()
    url = f"{settings.EUROPE_PMC_BASE_URL}/search"
    data = await safe_get_json(
        url,
        params={
            "query": f'"{gene_symbol}" AND (gene OR disease OR mutation)',
            "format": "json",
            "resultType": "core",
            "pageSize": page_size,
            "sort": "P_PDATE_D desc",
        },
    )
    if not data:
        return []
    return data.get("resultList", {}).get("result", [])


def summarize_abstract(abstract_text: str | None) -> str | None:
    """Short preview only — never the full abstract verbatim."""
    if not abstract_text:
        return None
    text = abstract_text.strip()
    if len(text) <= _ABSTRACT_PREVIEW_CHARS:
        return text
    return text[:_ABSTRACT_PREVIEW_CHARS].rsplit(" ", 1)[0] + "…"
