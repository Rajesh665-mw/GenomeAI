import { useState } from "react";
import DatasetAnalysis from "./DatasetAnalysis";

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 118 0v4" />
  </svg>
);

/**
 * Mode picker between Gene Analysis (fully available) and AI Research
 * Analysis (visible, but clearly gated as not-yet-available — see
 * AIResearchComingSoon below). The real AIResearchAnalysis component and
 * its backend (Gemini planner, tool-calling, SSE streaming) are untouched
 * and still fully wired; this file simply doesn't render/invoke it from
 * the picker anymore, so it stays available for future re-enabling.
 */
export default function AnalyzeTab({ token, basePath, onCompleted }) {
  const [mode, setMode] = useState("gene"); // gene | ai

  return (
    <div className="ga-analyze-tab">
      <div className="ga-analyze-mode-picker">
        <button className={mode === "gene" ? "active" : ""} onClick={() => setMode("gene")}>
          Gene Analysis
        </button>
        <button className={`ga-analyze-mode-ai-btn ${mode === "ai" ? "active" : ""}`} onClick={() => setMode("ai")}>
          <span className="ga-analyze-mode-ai-label">
            <span className="ga-analyze-mode-lock">{LOCK_ICON}</span>
            AI Research Analysis
          </span>
          <span className="ga-analyze-mode-badge">Coming Soon — Under Development</span>
        </button>
      </div>

      {mode === "gene" ? (
        <DatasetAnalysis token={token} basePath={basePath} onCompleted={onCompleted} onSwitchToAI={() => setMode("ai")} />
      ) : (
        <AIResearchComingSoon onContinue={() => setMode("gene")} />
      )}
    </div>
  );
}

function AIResearchComingSoon({ onContinue }) {
  return (
    <div className="ga-dash-page">
      <div className="ga-dash-card ga-ai-comingsoon">
        <div className="ga-ai-comingsoon-icon">{LOCK_ICON}</div>
        <span className="ga-analyze-mode-badge ga-ai-comingsoon-badge">Coming Soon — Under Development</span>
        <h2>AI Research Analysis isn't available yet</h2>
        <p>
          An advanced research mode combining AI-powered analysis, biomedical research sources, verification,
          and multi-agent reasoning is currently being developed and tested.
        </p>
        <button className="ga-btn ga-btn-primary" onClick={onContinue}>Continue with Gene Analysis</button>
      </div>
    </div>
  );
}
