import { useState } from "react";
import GeneticBackground from "./GeneticBackground";

const FEATURES = [
  "AI-Powered Gene Analysis",
  "Multi-Agent Research Assistant",
  "Secure Medical Platform",
  "Trusted Biomedical Data",
  "Personalized Preventive Guidance",
];

function GenomeBackground({ paused }) {
  return (
    <div className="ga-auth-bg" aria-hidden="true">
      <div className="ga-auth-hexgrid" />
      <span className="ga-auth-blob ga-auth-blob-a" />
      <span className="ga-auth-blob ga-auth-blob-b" />
      <span className="ga-auth-blob ga-auth-blob-c" />
      <GeneticBackground paused={paused} />
    </div>
  );
}

export default function AuthLayout({ children }) {
  const [paused, setPaused] = useState(false);

  return (
    <div className="ga-auth-split">
      <GenomeBackground paused={paused} />

      <button
        className="ga-auth-anim-toggle"
        onClick={() => setPaused((p) => !p)}
        type="button"
        title={paused ? "Resume motion" : "Pause motion"}
      >
        {paused ? "▶ Motion On" : "⏸ Pause Motion"}
      </button>

      <div className="ga-auth-brand-panel">
        <div className="ga-auth-brand">
          <span className="ga-auth-brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 3C6 8 18 8 18 13C18 18 6 18 6 21" stroke="#051019" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          GenomeAI
        </div>

        <div className="ga-eyebrow ga-auth-eyebrow"><span className="dot"></span>Multi-Agent Genomic Intelligence</div>

        <h1 className="ga-auth-headline">
          Precision genomics,<br /><span className="grad">powered by AI.</span>
        </h1>
        <p className="ga-auth-headline-sub">
          Analyze genetic variants, understand disease risk, and get evidence-based
          preventive guidance — backed by trusted biomedical data and coordinated AI agents.
        </p>

        <div className="ga-auth-feature-list">
          {FEATURES.map((f, i) => (
            <div className="ga-auth-feature" key={f} style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
              <span className="ga-auth-feature-check">✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <div className="ga-auth-formpanel">{children}</div>
    </div>
  );
}
