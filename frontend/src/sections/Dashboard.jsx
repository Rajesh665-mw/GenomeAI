import { useInView } from "../hooks/useInView";
import { DASHBOARD_DISEASES, DASHBOARD_MUTATIONS, RELATED_GENES, RESEARCH_PAPERS } from "../data/dashboard";

function GaugeCard({ label, value, colorVar, sub }) {
  const [ref, inView] = useInView(0.4);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = inView ? circumference * (1 - value / 100) : circumference;

  return (
    <div className="ga-dash-card ga-gauge-card" ref={ref}>
      <div className="ga-gauge-wrap">
        <svg viewBox="0 0 130 130" className="ga-gauge-svg">
          <circle cx="65" cy="65" r={r} className="ga-gauge-track" />
          <circle
            cx="65"
            cy="65"
            r={r}
            className="ga-gauge-fill"
            style={{
              stroke: `var(${colorVar})`,
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="ga-gauge-center">
          <span className="ga-gauge-value">{value}%</span>
        </div>
      </div>
      <div className="ga-gauge-label">{label}</div>
      {sub && <div className="ga-gauge-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardSection() {
  return (
    <section className="ga-dashboard-section" id="dashboard">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Clinical Analysis Summary
        </div>
        <h2 className="ga-section-title">Everything in one clinical view</h2>
        <p className="ga-section-sub">
          A sample report for BRCA1 — the same layout every analysis produces once your
          data pipeline is connected.
        </p>
      </div>

      <div className="ga-dash-grid">
        <GaugeCard label="Genetic Risk Assessment" value={72} colorVar="--primary" />
        <GaugeCard label="Evidence Confidence" value={91} colorVar="--success" />

        <div className="ga-dash-card ga-dash-wide">
          <div className="ga-dash-card-title">Evidence Confidence Score</div>
          {DASHBOARD_DISEASES.map((d) => (
            <div className="ga-dash-bar-row" key={d.name}>
              <span className="ga-dash-bar-label">{d.name}</span>
              <div className="ga-dash-bar-track">
                <div className="ga-dash-bar-fill" style={{ width: `${d.prob}%` }} />
              </div>
              <span className="ga-dash-bar-value">{d.prob}%</span>
            </div>
          ))}
        </div>

        <div className="ga-dash-card">
          <div className="ga-dash-card-title">Mutation Summary</div>
          <div className="ga-dash-mutation-list">
            {DASHBOARD_MUTATIONS.map((m) => (
              <div className="ga-dash-mutation-row" key={m.id}>
                <span className="ga-dash-mutation-id">{m.id}</span>
                <span className="ga-dash-mutation-type">{m.type}</span>
                <span
                  className={`ga-dash-mutation-tag ${
                    m.significance === "Pathogenic" ? "tag-danger" : "tag-warn"
                  }`}
                >
                  {m.significance}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ga-dash-card">
          <div className="ga-dash-card-title">Related Genes</div>
          <div className="ga-dash-tag-row">
            {RELATED_GENES.map((g) => (
              <span className="ga-dash-tag" key={g}>
                {g}
              </span>
            ))}
          </div>
        </div>

        <div className="ga-dash-card ga-dash-wide">
          <div className="ga-dash-card-title">Research Papers</div>
          <div className="ga-dash-paper-list">
            {RESEARCH_PAPERS.map((p) => (
              <div className="ga-dash-paper-row" key={p.title}>
                <div className="ga-dash-paper-title">{p.title}</div>
                <div className="ga-dash-paper-meta">
                  {p.journal} · {p.year}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ga-dash-card">
          <div className="ga-dash-card-title">Biomedical Sources</div>
          <div className="ga-dash-source-list">
            {["NCBI", "ClinVar", "OMIM"].map((s) => (
              <div className="ga-dash-source-row" key={s}>
                <span className="ga-dash-source-check">✓</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

