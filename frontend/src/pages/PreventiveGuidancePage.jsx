import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnalysis } from "../lib/analysisApi";
import { groupGuidance } from "../lib/guidanceCategories";
import AnalysisWorkspaceLayout from "../components/AnalysisWorkspaceLayout";

export default function PreventiveGuidancePage() {
  const { analysisId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const dashboardPath = user?.role === "doctor" ? "/doctor" : "/patient";
  const resultsPath = `${dashboardPath}/analysis/${analysisId}`;

  useEffect(() => {
    let cancelled = false;
    getAnalysis(token, analysisId)
      .then((data) => {
        if (cancelled) return;
        if (!data.result) setStatus("not_found");
        else { setAnalysis(data); setStatus("ready"); }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "This analysis could not be found.");
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [token, analysisId]);

  const groups = analysis?.result ? groupGuidance(analysis.result.guidance, analysis.result.risk_assessment) : [];

  return (
    <AnalysisWorkspaceLayout backTo={dashboardPath} stepLabel="Step 2 of 2 · Preventive Guidance">
      <div className="ga-dash-page ga-workspace-page">
        {status === "loading" && <p className="ga-dash-muted">Loading guidance…</p>}
        {(status === "error" || status === "not_found") && (
          <div className="ga-dash-card ga-dataset-notfound">
            <div className="ga-dataset-notfound-icon">✕</div>
            <h3>Guidance not available</h3>
            <p>{error || "This analysis result is no longer available."}</p>
            <button className="ga-btn ga-btn-primary" onClick={() => navigate(dashboardPath)}>Back to Dashboard</button>
          </div>
        )}

        {status === "ready" && analysis && (
          <>
            <h1 className="ga-dash-h1">Preventive Guidance</h1>
            <p className="ga-dash-lead">
              Based on your {analysis.result.gene_symbol} analysis. This information is educational and does not replace
              advice from a qualified healthcare professional.
            </p>

            <div className="ga-workspace-disclaimer">
              <strong>Not a diagnosis.</strong> The guidance below is generated from your analysis results to help inform
              conversations with a doctor or genetic counselor — it is not a medical diagnosis or a substitute for
              professional care.
            </div>

            {groups.length === 0 ? (
              <div className="ga-dash-card">
                <p className="ga-dash-muted">No preventive guidance is available for this result.</p>
              </div>
            ) : (
              groups.map((group) => (
                <div className="ga-dash-card" key={group.category}>
                  <div className="ga-workspace-section-label">{group.category}</div>
                  <ul className="ga-workspace-guidance-list">
                    {group.items.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            <div className="ga-dataset-results-actions">
              <button className="ga-btn ga-btn-ghost" onClick={() => navigate(resultsPath)}>Back to Analysis</button>
              <button className="ga-btn ga-btn-primary" onClick={() => navigate(`${resultsPath}/report`)}>
                Generate Report
              </button>
            </div>
          </>
        )}
      </div>
    </AnalysisWorkspaceLayout>
  );
}
