"""
MyGene.info live data source.

Used as the *secondary* source in `gene_service`, specifically for the
free-text function `summary` (HGNC doesn't carry one) and the Entrez gene
ID. No API key required. https://docs.mygene.info/
"""
from app.core.config import get_settings
from app.services.http_client import safe_get_json


async def fetch_gene_summary(symbol: str) -> dict | None:
    """Returns the top-scoring MyGene.info hit for a human gene symbol, or
    None if not found / the service is unreachable."""
    settings = get_settings()
    url = f"{settings.MYGENE_BASE_URL}/query"
    data = await safe_get_json(
        url,
        params={
            "q": f"symbol:{symbol}",
            "species": "human",
            "fields": "symbol,name,summary,entrezgene,alias,genomic_pos",
            "size": 1,
        },
    )
    if not data:
        return None
    hits = data.get("hits", [])
    return hits[0] if hits else None
