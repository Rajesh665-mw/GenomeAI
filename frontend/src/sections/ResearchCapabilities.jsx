import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CAPABILITIES = [
  {
    icon: (
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    ),
    title: "Multi-Agent Orchestration",
    description:
      "A network of seven specialized biomedical agents operating in sequence — validating gene nomenclature, identifying disease phenotypes, computing risk profiles, and cross-referencing literature.",
  },
  {
    icon: (
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
    title: "Clinical Evidence Grounding",
    description:
      "Every genetic finding is verified against curated biomedical databases including ClinVar, HGNC, and OMIM before inclusion in clinical summaries, eliminating hallucinated associations.",
  },
  {
    icon: (
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
    title: "Actionable Preventive Translation",
    description:
      "Complex variant and risk metrics are translated into categorized, understandable preventive guidance covering screening schedules, lifestyle factors, and clinical consultation prep.",
  },
  {
    icon: (
      <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    ),
    title: "Doctor Collaboration & Reports",
    description:
      "Patients can directly submit analysis snapshots to clinicians for personalized medical review, accompanied by structured, tamper-evident PDF reports.",
  },
];

export default function ResearchCapabilitiesSection() {
  const { isAuthenticated, user } = useAuth();
  const analysisDestination = isAuthenticated
    ? user?.role === "doctor"
      ? "/doctor"
      : "/patient"
    : "/login";

  return (
    <section className="ga-research-section" id="research">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Genomic Intelligence Architecture
        </div>
        <h2 className="ga-section-title">Evidence-grounded genomic research</h2>
        <p className="ga-section-sub">
          GenomeAI unites multi-agent intelligence with deterministic biomedical data to deliver
          clinical-grade genetic insights and preventive action plans.
        </p>
      </div>

      <div className="ga-research-banner">
        <div className="ga-research-banner-badge">
          <span className="ga-research-banner-dot"></span>
          AI Research Engine — Under Active Clinical Development
        </div>
        <p className="ga-research-banner-text">
          Our advanced multi-agent AI research reasoning engine is currently undergoing clinical validation.
          Core <strong>Gene Analysis</strong>, risk assessment, preventive guidance, and physician consultations
          are fully powered by deterministic biomedical datasets and ready to use today.
        </p>
      </div>

      <div className="ga-research-grid">
        {CAPABILITIES.map((item) => (
          <div className="ga-dash-card ga-research-card" key={item.title}>
            <div className="ga-research-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
            </div>
            <h3 className="ga-research-card-title">{item.title}</h3>
            <p className="ga-research-card-desc">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="ga-research-cta-panel">
        <div className="ga-research-cta-copy">
          <h3>Explore your genetic risk factors today</h3>
          <p>Analyze known genes like BRCA1, TP53, or CFTR and generate a verified clinical PDF report.</p>
        </div>
        <div className="ga-research-cta-actions">
          <Link className="ga-btn ga-btn-primary ga-btn-lg" to={analysisDestination}>
            Launch Gene Analysis
          </Link>
          <button
            type="button"
            className="ga-btn ga-btn-ghost ga-btn-lg"
            onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
          >
            View Sample Analysis
          </button>
        </div>
      </div>
    </section>
  );
}
