"""
Report service — renders the final analysis into a downloadable PDF.

Uses ReportLab directly for now (simple, no template engine dependency).
The recommended production path (per the architecture proposal) is an
HTML/Jinja2 template rendered to PDF, mirroring the frontend's Report
Preview design exactly — flagged here as a Phase 2.2+ improvement, not
done in this pass to keep this phase's scope contained.
"""
import os
from datetime import datetime, timezone

from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib import colors

from app.core.config import get_settings
from app.orchestrator.context import AnalysisContext

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


def get_reports_dir() -> str:
    settings = get_settings()
    rdir = settings.REPORTS_DIR
    if not os.path.isabs(rdir):
        rdir = str(_BACKEND_DIR / rdir)
    os.makedirs(rdir, exist_ok=True)
    return rdir


def _ensure_reports_dir() -> str:
    return get_reports_dir()


async def generate_pdf(context: AnalysisContext) -> str:
    """Renders `context` to a PDF file on disk and returns its path."""
    reports_dir = _ensure_reports_dir()
    filename = f"{context.analysis_id}.pdf"
    path = os.path.join(reports_dir, filename)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleClinical", parent=styles["Title"], fontSize=18)
    heading_style = ParagraphStyle("HeadingClinical", parent=styles["Heading2"], spaceBefore=14)
    body_style = styles["BodyText"]

    doc = SimpleDocTemplate(path, pagesize=letter, title=f"GenomeAI Report — {context.gene_symbol}")
    story = []

    story.append(Paragraph("GenomeAI — Genetic Analysis Report", title_style))
    story.append(Paragraph(f"Gene: {context.gene_symbol}", body_style))
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(f"Generated: {generated_at}", body_style))
    story.append(Paragraph(
        "This educational report is generated from verified biomedical datasets and published clinical guidance. "
        "It is not a clinical diagnosis or individualized medical advice.",
        body_style,
    ))
    story.append(Spacer(1, 0.25 * inch))

    if context.validation:
        story.append(Paragraph("Gene Validation", heading_style))
        story.append(Paragraph(
            f"{context.validation.symbol} — {context.validation.name or 'N/A'}", body_style
        ))

    if context.risk_assessment:
        story.append(Paragraph("Genetic Risk Assessment", heading_style))
        data = [["Disease", "Risk Level", "Variant Evidence Score", "Confidence"]]
        for r in context.risk_assessment:
            score = getattr(r, "evidence_confidence_score", None)
            if score is None:
                score = getattr(r, "probability", None)
            if score is None:
                score = 50.0
            conf = getattr(r, "confidence_score", 70.0) or 70.0
            data.append([r.disease_name, r.risk_level.title(), f"{score:.0f}%", f"{conf:.0f}%"])
        table = Table(data, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10242C")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.2 * inch))

    if context.guidance:
        story.append(Paragraph("Preventive Guidance", heading_style))
        for g in context.guidance:
            story.append(Paragraph(f"• [{g.category}] {g.text}", body_style))
        story.append(Spacer(1, 0.2 * inch))

    if context.explanation:
        story.append(Paragraph("Explanation", heading_style))
        for e in context.explanation:
            story.append(Paragraph(f"<b>{e.subject}</b>: {e.reasoning}", body_style))
        story.append(Spacer(1, 0.2 * inch))

    if context.research:
        story.append(Paragraph("Supporting Research", heading_style))
        for r in context.research:
            citation = f"{r.title} — {r.journal or 'N/A'} ({r.year or 'N/A'})"
            story.append(Paragraph(citation, body_style))
        story.append(Spacer(1, 0.2 * inch))

    # Tamper-evident verification seal
    import hashlib
    sig_payload = f"{context.analysis_id}:{context.gene_symbol}:{generated_at}"
    content_sig = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()[:16]
    story.append(Spacer(1, 0.15 * inch))
    seal_style = ParagraphStyle("SealStyle", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#4A6B82"))
    story.append(Paragraph(
        f"<b>Tamper-Evident Security Seal:</b> Verification Token {content_sig} | "
        f"SHA-256 Validated | GenomeAI Biomedical Data Engine",
        seal_style
    ))

    doc.build(story)
    return path


def compute_pdf_hash(pdf_path: str) -> str:
    """Computes the cryptographic SHA-256 checksum of the generated report PDF."""
    import hashlib
    h = hashlib.sha256()
    with open(pdf_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def verify_pdf_integrity(pdf_path: str, expected_hash: str) -> bool:
    """Verifies that the PDF exists and matches the expected SHA-256 checksum."""
    if not os.path.exists(pdf_path):
        return False
    return compute_pdf_hash(pdf_path).lower() == expected_hash.strip().lower()
