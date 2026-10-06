import { TRUSTED_SOURCES } from "../data/trustedSources";

export default function TrustedSourcesSection() {
  return (
    <section className="ga-trusted-section">
      <div className="ga-section-head">
        <div className="ga-eyebrow ga-eyebrow-alt">
          <span className="dot"></span>
          Trusted Sources
        </div>
        <h2 className="ga-section-title">Grounded in established biomedical databases</h2>
        <p className="ga-section-sub">
          Every finding is checked against records from these sources before it reaches
          your report.
        </p>
      </div>

      <div className="ga-trusted-grid">
        {TRUSTED_SOURCES.map((s) => (
          <div className="ga-trusted-card" key={s.name}>
            <div className="ga-trusted-name">{s.name}</div>
            <div className="ga-trusted-full">{s.full}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

