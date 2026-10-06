"""
Explainability service — turns already-verified findings into a plain-
language gene -> function -> mutation -> pathway -> disease -> clinical
impact narrative.

This module deliberately has no data source of its own. It only explains
claims that `disease_service` / `risk_service` / `verification_service`
already produced — it can never introduce a new biomedical fact, only
narrate existing ones. That constraint is what keeps this safe to hand to
Gemini as a tool: the model can call it, but it still can't make the facts
up, because the facts were fixed before Gemini ever saw them.
"""
from app.services.disease_service import DiseaseRecord
from app.services.risk_service import RiskRecord
from app.services.verification_service import VerificationRecord


class ExplanationRecord:
    def __init__(self, subject: str, reasoning: str):
        self.subject = subject
        self.reasoning = reasoning


async def explain(
    gene_symbol: str,
    diseases: list[DiseaseRecord],
    risk_assessment: list[RiskRecord],
    verification: list[VerificationRecord],
) -> list[ExplanationRecord]:
    risk_by_disease = {r.disease_name: r for r in risk_assessment}
    verification_by_disease = {v.disease_name: v for v in verification}

    explanations: list[ExplanationRecord] = []
    for disease in diseases:
        risk = risk_by_disease.get(disease.name)
        verification_record = verification_by_disease.get(disease.name)

        parts = [f"{gene_symbol} was associated with {disease.name}."]
        if risk:
            parts.append(
                f"This was categorized as {risk.risk_level} risk "
                f"({risk.probability:.0f}% variant evidence score, "
                f"{risk.confidence_score:.0f}% model confidence)."
            )
        if verification_record:
            sources = ", ".join(verification_record.sources_checked) or "the checked sources"
            parts.append(
                f"The association was cross-checked against {sources} and classified as "
                f"{verification_record.significance.lower()}."
            )

        explanations.append(ExplanationRecord(subject=disease.name, reasoning=" ".join(parts)))

    return explanations
