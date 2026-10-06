"""
ClinVar live data source, via NCBI eutils (esearch + esummary).

No API key required (NCBI_API_KEY, if set, only raises the rate limit from
3 to 10 req/sec — see https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/).

ClinVar's esummary schema has changed over time ("clinical_significance"
was renamed "germline_classification" for the ACMG/AMP model) — this module
checks both so it keeps working across the transition rather than silently
returning nothing.
"""
from app.core.config import get_settings
from app.services.http_client import safe_get_json


def _auth_params() -> dict:
    settings = get_settings()
    return {"api_key": settings.NCBI_API_KEY} if settings.NCBI_API_KEY else {}


async def _search_variant_ids(gene_symbol: str, retmax: int) -> list[str]:
    settings = get_settings()
    url = f"{settings.CLINVAR_EUTILS_BASE_URL}/esearch.fcgi"
    data = await safe_get_json(
        url,
        params={"db": "clinvar", "term": f"{gene_symbol}[gene]", "retmode": "json", "retmax": retmax, **_auth_params()},
    )
    if not data:
        return []
    return data.get("esearchresult", {}).get("idlist", [])


async def _summarize_variants(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    settings = get_settings()
    url = f"{settings.CLINVAR_EUTILS_BASE_URL}/esummary.fcgi"
    data = await safe_get_json(
        url,
        params={"db": "clinvar", "id": ",".join(ids), "retmode": "json", **_auth_params()},
    )
    if not data:
        return []

    result = data.get("result", {})
    uids = result.get("uids", [])
    records = []
    for uid in uids:
        record = result.get(uid)
        if not record:
            continue
        classification = record.get("germline_classification") or record.get("clinical_significance") or {}
        significance = classification.get("description")
        review_status = classification.get("review_status")
        trait_names = [
            t.get("trait_name") for t in record.get("trait_set", []) if t.get("trait_name")
        ]
        if significance and trait_names:
            records.append({
                "significance": significance,
                "review_status": review_status,
                "trait_names": trait_names,
            })
    return records


async def get_variant_classifications(gene_symbol: str, retmax: int = 40) -> list[dict]:
    """Returns per-variant {significance, review_status, trait_names} records
    for a gene. Empty list if the gene has no ClinVar entries or the
    service is unreachable — callers fall back to mock data on empty."""
    ids = await _search_variant_ids(gene_symbol, retmax)
    return await _summarize_variants(ids)
