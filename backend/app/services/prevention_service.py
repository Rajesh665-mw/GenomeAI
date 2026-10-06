"""
Prevention service — generates preventive/management guidance.

Explicitly educational, not diagnostic — this module (and the agent that
calls it) must never produce language that reads as a diagnosis or a
guaranteed outcome. Loads synthesized educational guidance from
production/genomeai_preventive_guidance.csv.
"""
import csv
import logging
from pathlib import Path

from app.services.disease_service import DiseaseRecord

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_GUIDANCE_CSV = _BACKEND_DIR / "datasets" / "production" / "genomeai_preventive_guidance.csv"

_GUIDANCE_BY_CATEGORY: dict[str, list[dict]] = {}
_DEFAULT_GUIDANCE: list[dict] = [
    {
        "category": "management",
        "text": "Educational guidance: Discuss this genetic result with a certified genetic counselor or physician before making healthcare decisions."
    },
    {
        "category": "screening",
        "text": "Educational guidance: Inquire about appropriate baseline clinical screening and surveillance protocols."
    }
]


def _load_guidance_from_csv():
    if not _GUIDANCE_CSV.exists():
        return
    try:
        with open(_GUIDANCE_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cat = row.get("guidance_category", "").strip()
                text = row.get("guidance_text", "").strip()
                if not cat or not text:
                    continue
                items = []
                if cat == "Oncology":
                    items = [
                        {"category": "screening", "text": "Follow specialized high-risk cancer screening protocols (e.g. enhanced breast MRI/mammography or colonoscopy)."},
                        {"category": "lifestyle", "text": "Evidence-based cancer risk-reduction lifestyle practices (balanced diet, regular physical exercise, avoidance of tobacco and carcinogens)."},
                        {"category": "management", "text": "Comprehensive genetic counseling is recommended to discuss personalized surveillance and risk-reducing options."}
                    ]
                elif cat == "Pulmonology":
                    items = [
                        {"category": "screening", "text": "Regular pulmonary function monitoring (spirometry) and sweat chloride testing as indicated."},
                        {"category": "management", "text": "Airway clearance therapy, prompt treatment of respiratory tract infections, and pulmonary specialist follow-up."}
                    ]
                elif cat == "Neurology":
                    items = [
                        {"category": "screening", "text": "Annual neurological evaluation, cognitive assessments, and motor functional evaluations."},
                        {"category": "lifestyle", "text": "Physical therapy and neuro-protective lifestyle habits to preserve mobility."},
                        {"category": "management", "text": "Genetic risk assessment and counseling for family members."}
                    ]
                elif cat == "Cardiology":
                    items = [
                        {"category": "screening", "text": "Routine echocardiography and ECG monitoring for cardiac structure and rhythm assessment."},
                        {"category": "lifestyle", "text": "Rigorous blood pressure control and avoidance of competitive strenuous exercise if aortopathy is suspected."},
                        {"category": "management", "text": "Cardiology consultation and evaluation by a specialized cardiovascular genetics team."}
                    ]
                elif cat == "Hematology":
                    items = [
                        {"category": "screening", "text": "Complete blood count monitoring and hemoglobin electrophoresis."},
                        {"category": "lifestyle", "text": "Avoidance of unnecessary iron supplementation unless clinical iron deficiency is documented."},
                        {"category": "management", "text": "Preconception carrier screening and hematology specialist consultation."}
                    ]
                elif cat == "Metabolic":
                    items = [
                        {"category": "screening", "text": "Comprehensive lipid profile and fasting metabolic screening."},
                        {"category": "lifestyle", "text": "Dietary modification, early lifestyle intervention, and regular cardiovascular exercise."},
                        {"category": "management", "text": "Evaluation for targeted lipid-lowering or enzyme therapy with a metabolic specialist."}
                    ]
                else:
                    items = [{"category": "management", "text": text}]
                _GUIDANCE_BY_CATEGORY[cat] = items
    except Exception as e:
        logger.error(f"Error loading preventive guidance CSV: {e}")


_load_guidance_from_csv()


class GuidanceRecord:
    def __init__(self, category: str, text: str):
        self.category = category
        self.text = text


async def get_guidance(diseases: list[DiseaseRecord]) -> list[GuidanceRecord]:
    seen_categories: set[str] = set()
    results: list[GuidanceRecord] = []

    for disease in diseases:
        category = disease.category or ""
        if category in seen_categories:
            continue
        seen_categories.add(category)

        items = _GUIDANCE_BY_CATEGORY.get(category, _DEFAULT_GUIDANCE)
        results.extend(GuidanceRecord(category=item["category"], text=item["text"]) for item in items)

    if not results:
        results.extend(GuidanceRecord(category=item["category"], text=item["text"]) for item in _DEFAULT_GUIDANCE)

    return results
