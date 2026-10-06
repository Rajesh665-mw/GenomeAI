import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnalysis } from "../lib/analysisApi";
import { buildAnalysisSummary } from "../lib/analysisSummary";
import AnalysisWorkspaceLayout from "../components/AnalysisWorkspaceLayout";

function RiskBadge({ level }) {
  const cls = level === "High" ? "danger" : level === "Moderate" ? "pending" : "success";
  return <span className={`ga-dash-badge ga-dash-badge-${cls}`}>{level} risk</span>;
}

export default function AnalysisResultsPage() {
  const { analysisId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | ready | error | not_found
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const dashboardPath = user?.role === "doctor" ? "/doctor" : "/patient";
  const isResearchView = user?.role === "doctor";

  useEffect(() => {
    let cancelled = false;
    getAnalysis(token, analysisId)
      .then((data) => {
        if (cancelled) return;
        if (!data.result) {
          setStatus("not_found");
        } else {
          setAnalysis(data);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "This analysis could not be found.");
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [token, analysisId]);

  return (
    <AnalysisWorkspaceLayout backTo={dashboardPath} stepLabel="Step 1 of 2 · Analysis Results">
      <div className="ga-dash-page ga-workspace-page">
        {status === "loading" && <p className="ga-dash-muted">Loading analysis…</p>}
        {(status === "error" || status === "not_found") && (
          <div className="ga-dash-card ga-dataset-notfound">
            <div className="ga-dataset-notfound-icon">✕</div>
            <h3>Analysis not available</h3>
            <p>{error || "This analysis result is no longer available."}</p>
            <button className="ga-btn ga-btn-primary" onClick={() => navigate(dashboardPath)}>Back to Dashboard</button>
          </div>
        )}

        {status === "ready" && analysis && (
          <ResultsContent result={analysis.result} isResearchView={isResearchView} analysisId={analysisId} navigate={navigate} dashboardPath={dashboardPath} />
        )}
      </div>
    </AnalysisWorkspaceLayout>
  );
}

function ResultsContent({ result, isResearchView, analysisId, navigate, dashboardPath }) {
  return (
    <>
      <h1 className="ga-dash-h1">Analysis Results</h1>
      <p className="ga-dash-lead">
        {isResearchView
          ? "Full genomic analysis, including verification detail and evidence sourcing."
          : "Here's what we found for your gene analysis."}
      </p>

      <div className="ga-dash-card ga-dataset-header">
        <div className="ga-workspace-section-label">Gene Overview</div>
        <div className="ga-dataset-header-top">
          <div>
            <h2 className="ga-dataset-gene-name">{result.gene_symbol}</h2>
            <p className="ga-dataset-gene-fullname">{result.validation.name}</p>
          </div>
          <div className="ga-dataset-mode-tags">
            <span className="ga-dataset-tag ga-dataset-tag-accent">
              Source: {result.analysis_mode === "ai_research" ? "AI Research Analysis" : "Verified Biomedical Data"}
            </span>
          </div>
        </div>
        {result.validation.aliases?.length > 0 && <p className="ga-dash-muted">Aliases: {result.validation.aliases.join(", ")}</p>}
        {result.validation.chromosome && <p className="ga-dash-muted">Chromosome: {result.validation.chromosome}</p>}
      </div>

      {result.risk_assessment.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label">Risk Insights</div>
          <div className="ga-dataset-disease-list">
            {result.risk_assessment.map((r, i) => (
              <div className="ga-dataset-disease-item" key={i}>
                <div className="ga-dataset-disease-item-head">
                  <strong>{r.disease_name}</strong>
                  <RiskBadge level={r.risk_level} />
                </div>
                <div className="ga-dash-muted ga-dataset-disease-meta">
                  <span>Evidence confidence score: {r.evidence_confidence_score ?? r.probability}%</span>
                  {isResearchView && <span>Confidence score: {r.confidence_score}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.diseases.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label">Associated Conditions</div>
          <div className="ga-dataset-disease-list">
            {result.diseases.map((d, i) => {
              const verification = result.verification.find((v) => v.disease_name === d.name);
              return (
                <div className="ga-dataset-disease-item" key={i}>
                  <div className="ga-dataset-disease-item-head">
                    <strong>{d.name}</strong>
                    {verification && <span className="ga-dash-badge ga-dash-badge-pending">{verification.significance}</span>}
                  </div>
                  <div className="ga-dash-muted ga-dataset-disease-meta">
                    {d.category && <span>{d.category}</span>}
                    {verification && <span>Evidence confidence: {verification.evidence_confidence}%</span>}
                    {isResearchView && verification?.sources_checked?.length > 0 && (
                      <span>Sources checked: {verification.sources_checked.join(", ")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.explanation.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label">Key Findings</div>
          <div className="ga-dash-guidance-list">
            {result.explanation.map((e, i) => (
              <div className="ga-dash-guidance-item" key={i}>
                <span className="ga-dash-guidance-cat">{e.subject}</span>
                <p>{e.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ga-dash-card">
        <div className="ga-workspace-section-label">Evidence</div>
        {result.research.length === 0 ? (
          <p className="ga-dash-muted">No supporting research entries are available for this gene.</p>
        ) : (
          <div className="ga-dash-guidance-list">
            {result.research.map((r, i) => (
              <div className="ga-dash-guidance-item" key={i}>
                <strong>{r.title}</strong>
                <p className="ga-dash-muted">{r.journal} · {r.year}</p>
                <p>{r.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ga-dash-card">
        <div className="ga-workspace-section-label">Summary</div>
        <p className="ga-workspace-summary-text">{buildAnalysisSummary(result)}</p>
      </div>

      <div className="ga-dataset-results-actions">
        <button className="ga-btn ga-btn-ghost" onClick={() => navigate(dashboardPath)}>Back to Dashboard</button>
        <button className="ga-btn ga-btn-primary" onClick={() => navigate(`${dashboardPath}/analysis/${analysisId}/guidance`)}>
          Continue to Preventive Guidance
        </button>
      </div>
    </>
  );
}
