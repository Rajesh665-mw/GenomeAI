"""
Disease service — resolves diseases associated with a validated gene.

Live mode (default): aggregates ClinVar variant-level classifications
(via `clinvar_service`) by phenotype/trait name into gene-disease
associations, with a probability derived from the real proportion of
ClinVar submissions classified pathogenic/likely-pathogenic for that trait.

Falls back to the curated master dataset registry (same as mock mode) if ClinVar
has no entries for the gene or is unreachable, so callers get the same contract
either way.
"""
import uuid

from app.core.config import get_settings
from app.services import clinvar_service

_IGNORED_TRAIT_NAMES = {"not provided", "not specified", "see cases"}

_CATEGORY_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("Oncology", ("cancer", "tumor", "tumour", "carcinoma", "neoplasm", "sarcoma", "lymphoma", "leukemia")),
    ("Pulmonology", ("cystic fibrosis", "lung", "pulmonary", "respiratory", "asthma")),
    ("Neurology", ("alzheimer", "parkinson", "neuro", "dementia", "epilepsy", "ataxia", "seizure")),
    ("Cardiology", ("cardio", "heart", "cardiomyopathy", "arrhythmia")),
    ("Hematology", ("anemia", "anaemia", "hemophilia", "haemophilia", "thalassemia", "blood")),
    ("Metabolic", ("diabetes", "metabolic", "deficiency")),
]

_PATHOGENIC_LEANING = ("pathogenic",)


class DiseaseRecord:
    def __init__(
        self,
        disease_id: str,
        name: str,
        category: str | None,
        probability: float,
        clinvar_significance: str | None = None,
        review_status: str | None = None,
        evidence_confidence_score: float | None = None,
    ):
        self.disease_id = disease_id
        self.name = name
        self.category = category
        self.probability = probability
        self.evidence_confidence_score = evidence_confidence_score if evidence_confidence_score is not None else probability
        self.clinvar_significance = clinvar_significance
        self.review_status = review_status


def _infer_category(trait_name: str) -> str | None:
    lowered = trait_name.lower()
    for category, keywords in _CATEGORY_KEYWORDS:
        if any(kw in lowered for kw in keywords):
            return category
    return None


def _most_common(values: list[str | None]) -> str | None:
    counts: dict[str, int] = {}
    for v in values:
        if v:
            counts[v] = counts.get(v, 0) + 1
    return max(counts, key=counts.get) if counts else None


async def _live_lookup(gene_symbol: str) -> list[DiseaseRecord]:
    variant_records = await clinvar_service.get_variant_classifications(gene_symbol)
    if not variant_records:
        return []

    by_trait: dict[str, list[dict]] = {}
    for record in variant_records:
        for trait_name in record["trait_names"]:
            if trait_name.strip().lower() in _IGNORED_TRAIT_NAMES:
                continue
            by_trait.setdefault(trait_name, []).append(record)

    results: list[DiseaseRecord] = []
    for trait_name, records in by_trait.items():
        total = len(records)
        pathogenic_count = sum(
            1 for r in records
            if r["significance"] and any(p in r["significance"].lower() for p in _PATHOGENIC_LEANING)
            and "benign" not in r["significance"].lower()
        )
        probability = round(100.0 * pathogenic_count / total, 1) if total else 0.0
        results.append(DiseaseRecord(
            disease_id=str(uuid.uuid4()),
            name=trait_name,
            category=_infer_category(trait_name),
            probability=probability,
            clinvar_significance=_most_common([r["significance"] for r in records]),
            review_status=_most_common([r["review_status"] for r in records]),
        ))

    results.sort(key=lambda d: d.probability, reverse=True)
    return results[:8]


def _mock_lookup(gene_symbol: str) -> list[DiseaseRecord]:
    from app.services.master_dataset_loader import registry
    return registry.get_disease_records(gene_symbol)


async def get_associated_diseases(gene_symbol: str) -> list[DiseaseRecord]:
    settings = get_settings()
    if settings.GENOMEAI_DATA_SOURCE == "live":
        live_results = await _live_lookup(gene_symbol)
        if live_results:
            return live_results
    return _mock_lookup(gene_symbol)
