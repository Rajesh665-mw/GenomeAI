import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { runDatasetAnalysis } from "../lib/datasetAnalysisApi";

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 118 0v4" />
  </svg>
);

/**
 * The Gene Analysis entry point (search only). On a match, this navigates
 * to the standalone Analysis Results page rather than rendering results
 * inline — Results and Preventive Guidance are separate routes/pages by
 * design, not tabs within this component.
 */
export default function DatasetAnalysis({ token, basePath, onCompleted, onSwitchToAI }) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | loading | not_found
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSearch(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setError("");
    setPhase("loading");
    try {
      const res = await runDatasetAnalysis(token, trimmed);
      if (res.found) {
        onCompleted?.();
        navigate(`${basePath}/analysis/${res.result.report.report_id}`);
      } else {
        setPhase("not_found");
      }
    } catch (err) {
      setError(err.message || "Something went wrong running the analysis.");
      setPhase("idle");
    }
  }

  function reset() {
    setPhase("idle");
    setQuery("");
    setError("");
  }

  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Gene Analysis</h1>
      <p className="ga-dash-lead">
        Explore genetic information, disease associations, risk insights, and preventive guidance.
      </p>

      {phase !== "not_found" && (
        <form className="ga-dash-card ga-dataset-search" onSubmit={handleSearch}>
          {error && <div className="ga-auth-formerror">{error}</div>}
          <label className="ga-auth-label">Gene or Disease name</label>
          <div className="ga-dataset-search-row">
            <input
              className="ga-auth-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. BRCA1, or cystic fibrosis"
              disabled={phase === "loading"}
            />
            <button className="ga-btn ga-btn-primary" type="submit" disabled={phase === "loading" || !query.trim()}>
              {phase === "loading" ? "Analyzing…" : "Analyze Gene"}
            </button>
          </div>
        </form>
      )}

      {phase === "not_found" && (
        <div className="ga-dash-card ga-dataset-notfound">
          <div className="ga-dataset-notfound-icon">✕</div>
          <h3>No Results Found</h3>
          <p>We couldn't find genetic information matching that search.</p>
          <div className="ga-dataset-notfound-actions">
            <button className="ga-btn ga-btn-primary" onClick={reset}>Search Again</button>
            {onSwitchToAI ? (
              <button className="ga-btn ga-btn-ghost ga-ai-muted-btn" onClick={onSwitchToAI}>
                <span className="ga-analyze-mode-lock">{LOCK_ICON}</span>
                AI Research Analysis — Coming Soon
              </button>
            ) : (
              <Link className="ga-btn ga-btn-ghost ga-ai-muted-btn" to="/">
                <span className="ga-analyze-mode-lock">{LOCK_ICON}</span>
                AI Research Analysis — Coming Soon
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
