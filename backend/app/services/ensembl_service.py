"""
Ensembl service layer — placeholder.

Wired up as its own module now (per the "design for easy future
integration" requirement) so the Verification Agent's source list and
future tool handlers have a stable import path, even though this source
isn't live yet.

Ensembl's REST API (https://rest.ensembl.org) needs no key — same status as
UniProt: a placeholder purely because Stage 2 scoped to HGNC/MyGene/ClinVar/
Europe PMC, not because of any external blocker.
"""


async def is_available() -> bool:
    return False


async def fetch_placeholder(gene_symbol: str) -> dict:
    return {
        "source": "Ensembl",
        "status": "not_yet_integrated",
        "gene_symbol": gene_symbol.strip().upper(),
        "note": "No API key needed (https://rest.ensembl.org); not yet queried live.",
    }
