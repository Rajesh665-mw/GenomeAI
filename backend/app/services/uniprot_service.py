"""
UniProt service layer — placeholder.

Wired up as its own module now (per the "design for easy future
integration" requirement) so the Verification Agent's source list and
future tool handlers have a stable import path, even though this source
isn't live yet.

UniProt's REST API (https://www.uniprot.org/help/api) needs no key at all —
this is the best next source to wire up live for protein-level function
data. It's a placeholder only because Stage 2 scoped to HGNC/MyGene/ClinVar/
Europe PMC; there's no external blocker like OMIM's key approval.
"""


async def is_available() -> bool:
    return False


async def fetch_placeholder(gene_symbol: str) -> dict:
    return {
        "source": "UniProt",
        "status": "not_yet_integrated",
        "gene_symbol": gene_symbol.strip().upper(),
        "note": "No API key needed (https://www.uniprot.org/help/api); not yet queried live.",
    }
