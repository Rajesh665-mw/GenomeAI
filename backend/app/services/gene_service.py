"""
Gene service — validates and resolves gene metadata.

Live mode (default): HGNC is the authoritative source for symbol/name/
aliases/chromosome; MyGene.info supplements with a plain-language function
summary and Entrez ID. Both are free, no-key public APIs.

If both live sources fail (network issue, or a syntactically valid but
unrecognized symbol), this falls back to the curated master dataset registry
(over 5,000 authoritative NCBI ClinVar genes) — same contract either way,
so `GeneValidationAgent` and the planner never need to know which path ran.
"""
import asyncio
import re

from app.core.config import get_settings
from app.services import hgnc_service, mygene_service

_SYMBOL_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9\-]{0,31}$")


class GeneRecord:
    def __init__(
        self,
        symbol: str,
        name: str,
        aliases: list[str],
        chromosome: str | None,
        description: str | None,
        source: str = "master_dataset",
    ):
        self.symbol = symbol
        self.name = name
        self.aliases = aliases
        self.chromosome = chromosome
        self.description = description
        self.source = source


def _mock_lookup(normalized: str) -> GeneRecord:
    from app.services.master_dataset_loader import registry
    return registry.get_gene_record(normalized)


async def _live_lookup(normalized: str) -> GeneRecord | None:
    hgnc_doc, mygene_hit = await asyncio.gather(
        hgnc_service.fetch_by_symbol(normalized),
        mygene_service.fetch_gene_summary(normalized),
    )
    if not hgnc_doc and not mygene_hit:
        return None

    if hgnc_doc:
        symbol = hgnc_doc.get("symbol", normalized)
        name = hgnc_doc.get("name") or (mygene_hit or {}).get("name")
        aliases = list({
            *(hgnc_doc.get("alias_symbol") or []),
            *(hgnc_doc.get("prev_symbol") or []),
        })
        chromosome = hgnc_doc.get("location")
    else:
        symbol = (mygene_hit or {}).get("symbol", normalized)
        name = (mygene_hit or {}).get("name")
        alias_field = (mygene_hit or {}).get("alias") or []
        aliases = [alias_field] if isinstance(alias_field, str) else list(alias_field)
        chromosome = None

    description = (mygene_hit or {}).get("summary")

    return GeneRecord(
        symbol=symbol,
        name=name or f"{symbol} (name not available from live sources)",
        aliases=aliases,
        chromosome=chromosome,
        description=description,
        source="hgnc+mygene",
    )


async def validate_gene(symbol: str) -> GeneRecord | None:
    """
    Returns a GeneRecord if `symbol` is a syntactically valid gene symbol,
    or None if it's malformed (e.g. empty, contains illegal characters).
    """
    normalized = symbol.strip().upper()
    if not normalized or not _SYMBOL_PATTERN.match(normalized):
        return None

    settings = get_settings()
    if settings.GENOMEAI_DATA_SOURCE == "live":
        live_record = await _live_lookup(normalized)
        if live_record:
            return live_record

    return _mock_lookup(normalized)
