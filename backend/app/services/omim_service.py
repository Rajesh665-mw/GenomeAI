"""
OMIM service layer — placeholder.

Wired up as its own module now (per the "design for easy future
integration" requirement) so the Verification Agent's source list and
future tool handlers have a stable import path, even though this source
isn't live yet.

OMIM's API requires a registered, approved-on-request API key
(https://omim.org/api) — that approval step is why this stays a placeholder
for Stage 2, unlike HGNC/MyGene/ClinVar/Europe PMC which need no key.
"""


async def is_available() -> bool:
    return False


async def fetch_placeholder(gene_symbol: str) -> dict:
    return {
        "source": "OMIM",
        "status": "not_yet_integrated",
        "gene_symbol": gene_symbol.strip().upper(),
        "note": "Requires a registered OMIM API key (https://omim.org/api); not yet queried live.",
    }
