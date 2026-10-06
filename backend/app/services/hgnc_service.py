"""
HGNC (HUGO Gene Nomenclature Committee) live data source.

HGNC is the worldwide authority for human gene symbols/names, so it's the
primary source for `validate_gene`'s identity fields. No API key required.
https://www.genenames.org/help/rest/
"""
from app.core.config import get_settings
from app.services.http_client import safe_get_json


async def fetch_by_symbol(symbol: str) -> dict | None:
    """Returns the raw HGNC 'doc' for an approved symbol, or None if not
    found / the service is unreachable."""
    settings = get_settings()
    url = f"{settings.HGNC_BASE_URL}/fetch/symbol/{symbol}"
    data = await safe_get_json(url, headers={"Accept": "application/json"})
    if not data:
        return None
    docs = data.get("response", {}).get("docs", [])
    return docs[0] if docs else None
