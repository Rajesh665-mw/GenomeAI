"""
Research service — retrieves supporting biomedical literature for a gene.

Live mode: queries Europe PMC for recent articles mentioning the gene
symbol. Only a short (~280 char) abstract preview is kept — never the full
abstract — since these are copyrighted publications; the summary exists to
help the reader decide whether to open the source, not to substitute for it.

Falls back to the curated mock table (same as mock mode) if Europe PMC
returns nothing or is unreachable — deliberately never fabricates a
citation for a gene it has no real literature for, in either mode.
"""
from app.core.config import get_settings
from app.services import europepmc_service
from app.services._mock_data import RESEARCH_BY_GENE


class ResearchRecord:
    def __init__(self, title: str, journal: str | None, year: int | None, url: str | None, summary: str | None):
        self.title = title
        self.journal = journal
        self.year = year
        self.url = url
        self.summary = summary


def _article_url(article: dict) -> str | None:
    doi = article.get("doi")
    if doi:
        return f"https://doi.org/{doi}"
    pmid = article.get("pmid")
    if pmid:
        return f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
    pmcid = article.get("pmcid")
    if pmcid:
        return f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/"
    return None


async def _live_lookup(gene_symbol: str) -> list[ResearchRecord]:
    articles = await europepmc_service.search_literature(gene_symbol)
    results = []
    for article in articles:
        title = article.get("title")
        if not title:
            continue
        year = None
        pub_year = article.get("pubYear")
        if pub_year and str(pub_year).isdigit():
            year = int(pub_year)
        results.append(ResearchRecord(
            title=title,
            journal=(article.get("journalInfo") or {}).get("journal", {}).get("title"),
            year=year,
            url=_article_url(article),
            summary=europepmc_service.summarize_abstract(article.get("abstractText")),
        ))
    return results


def _mock_lookup(gene_symbol: str) -> list[ResearchRecord]:
    entries = RESEARCH_BY_GENE.get(gene_symbol.upper(), [])
    return [
        ResearchRecord(
            title=e["title"],
            journal=e.get("journal"),
            year=e.get("year"),
            url=e.get("url"),
            summary=e.get("summary"),
        )
        for e in entries
    ]


async def get_literature(gene_symbol: str) -> list[ResearchRecord]:
    settings = get_settings()
    if settings.GENOMEAI_DATA_SOURCE == "live":
        live_results = await _live_lookup(gene_symbol)
        if live_results:
            return live_results
    return _mock_lookup(gene_symbol)
