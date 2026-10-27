export default function ReportPreviewSection() {

  return (
    <section className="ga-report-section">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Report
        </div>
        <h2 className="ga-section-title">A clinical-grade report, every time</h2>
        <p className="ga-section-sub">
          Every analysis compiles into a structured, shareable PDF — sample layout shown
          below.
        </p>
      </div>

      <div className="ga-report-wrap">
        <div className="ga-report-doc">
          <div className="ga-report-doc-header">
            <span className="ga-report-doc-logo">GenomeAI</span>
            <span className="ga-report-doc-tag">Genetic Analysis Report</span>
          </div>
          <div className="ga-report-doc-title">BRCA1 — Hereditary Cancer Risk Assessment</div>
          <div className="ga-report-doc-meta">Sample Patient Preview · Production-derived BRCA1 Analysis</div>

          <div className="ga-report-doc-section">
            <div className="ga-report-doc-heading">Summary</div>
            <div className="ga-report-doc-line" style={{ width: "94%" }} />
            <div className="ga-report-doc-line" style={{ width: "88%" }} />
            <div className="ga-report-doc-line" style={{ width: "62%" }} />
          </div>
          <div className="ga-report-doc-section">
            <div className="ga-report-doc-heading">Risk Assessment</div>
            <div className="ga-report-doc-line" style={{ width: "80%" }} />
            <div className="ga-report-doc-line" style={{ width: "70%" }} />
          </div>
          <div className="ga-report-doc-section">
            <div className="ga-report-doc-heading">Preventive Guidance</div>
            <div className="ga-report-doc-line" style={{ width: "90%" }} />
            <div className="ga-report-doc-line" style={{ width: "52%" }} />
          </div>
        </div>

        <div className="ga-report-side">
          <div className="ga-report-side-title">Export this analysis</div>
          <p className="ga-report-side-text">
            Download a complete PDF with full methodology, citations, and preventive
            guidance — ready to share with a physician.
          </p>
          <a
            className="ga-btn ga-btn-primary ga-report-download-btn"
            href="/sample-genomeai-report-BRCA1.pdf"
            download="genomeai-sample-report-BRCA1.pdf"
          >
            Download Sample Report (PDF)
          </a>
        </div>
      </div>
    </section>
  );
}

