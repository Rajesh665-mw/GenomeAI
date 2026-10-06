"""
Risk service — turns a disease association's probability into a
categorized risk level + confidence score.

This is intentionally simple bucketing logic in mock mode, isolated here so
it can be replaced with a real statistical/ML model later without the Risk
Assessment Agent changing.
"""
from app.services.disease_service import DiseaseRecord


class RiskRecord:
    def __init__(self, disease_name: str, risk_level: str, probability: float, confidence_score: float, evidence_confidence_score: float | None = None):
        self.disease_name = disease_name
        self.risk_level = risk_level
        self.probability = probability
        self.evidence_confidence_score = evidence_confidence_score if evidence_confidence_score is not None else probability
        self.confidence_score = confidence_score


def _bucket_risk(probability: float) -> str:
    if probability >= 50:
        return "high"
    if probability >= 20:
        return "moderate"
    return "low"


async def assess_risk(diseases: list[DiseaseRecord]) -> list[RiskRecord]:
    results = []
    for disease in diseases:
        # mock confidence: higher for well-established (higher-probability)
        # associations, with a modest fixed floor — a real implementation
        # would derive this from evidence quality, not from the probability
        # value itself.
        confidence = min(98.0, 65.0 + disease.probability * 0.35)
        results.append(
            RiskRecord(
                disease_name=disease.name,
                risk_level=_bucket_risk(disease.probability),
                probability=disease.probability,
                confidence_score=round(confidence, 1),
                evidence_confidence_score=getattr(disease, "evidence_confidence_score", disease.probability),
            )
        )
    return results
