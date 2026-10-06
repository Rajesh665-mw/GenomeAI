import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiBase";
import { getAnalysis } from "../lib/analysisApi";
import { buildAnalysisSummary } from "../lib/analysisSummary";
import { groupGuidance } from "../lib/guidanceCategories";
import AnalysisWorkspaceLayout from "../components/AnalysisWorkspaceLayout";

function RiskBadge({ level }) {
  const cls = level === "High" ? "danger" : level === "Moderate" ? "pending" : "success";
  return <span className={`ga-dash-badge ga-dash-badge-${cls}`}>{level} risk</span>;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const SECTION_ICONS = {
  summary: <><path d="M6 2.5h8l5 5V21H6V2.5z" /><path d="M14 2.5V8h5" /><path d="M9 13h6M9 17h6" /></>,
  risk: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />,
  conditions: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9" /></>,
  findings: <path d="M11 3a8 8 0 105.29 14.29L21 21M11 8v6M8 11h6" />,
  evidence: <path d="M4 5h16v11H8l-4 4V5z" />,
  guidance: <path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.3 4.8 6 4.2c2-.3 3.7.6 6 2.8 2.3-2.2 4-3.1 6-2.8 3.7.6 5.5 4.2 4 7.7C19.5 16.4 12 21 12 21z" />,
};

function SectionIcon({ name }) {
  return (
    <span className="ga-report-section-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {SECTION_ICONS[name]}
      </svg>
    </span>
  );
}

export default function ReportPage() {
  const { analysisId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const dashboardPath = user?.role === "doctor" ? "/doctor" : "/patient";
  const resultsPath = `${dashboardPath}/analysis/${analysisId}`;
  const guidancePath = `${resultsPath}/guidance`;

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
        setError(err.message || "This report could not be found.");
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [token, analysisId]);

  return (
    <AnalysisWorkspaceLayout backTo={dashboardPath} stepLabel="Step 3 of 3 · Report">
      <div className="ga-dash-page ga-workspace-page">
        {status === "loading" && <p className="ga-dash-muted">Loading report…</p>}
        {(status === "error" || status === "not_found") && (
          <div className="ga-dash-card ga-dataset-notfound">
            <div className="ga-dataset-notfound-icon">✕</div>
            <h3>Report not available</h3>
            <p>{error || "This report is no longer available."}</p>
            <button className="ga-btn ga-btn-primary" onClick={() => navigate(dashboardPath)}>Back to Dashboard</button>
          </div>
        )}

        {status === "ready" && analysis && (
          <ReportContent
            analysis={analysis}
            user={user}
            token={token}
            navigate={navigate}
            resultsPath={resultsPath}
            guidancePath={guidancePath}
          />
        )}
      </div>
    </AnalysisWorkspaceLayout>
  );
}

function ReportContent({ analysis, user, token, navigate, resultsPath, guidancePath }) {
  const result = analysis.result;
  const guidanceGroups = groupGuidance(result.guidance, result.risk_assessment);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!result.report?.download_url) return;
    setDownloading(true);
    try {
      let downloadPath = result.report.download_url;
      if (token) {
        const sep = downloadPath.includes("?") ? "&" : "?";
        downloadPath += `${sep}token=${encodeURIComponent(token)}`;
      }
      const url = `${API_BASE_URL}${downloadPath}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download PDF report");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `genomeai-report-${result.gene_symbol}-${analysis.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <h1 className="ga-dash-h1">Report</h1>
      <p className="ga-dash-lead">A complete summary of your gene analysis, ready to download.</p>

      <div className="ga-report-doc">
        <div className="ga-report-doc-header">
          <div className="ga-report-doc-header-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M8 3c0 4 8 4 8 8s-8 4-8 8M16 3c0 4-8 4-8 8s8 4 8 8M6 7h12M6 17h12" />
            </svg>
          </div>
          <div className="ga-report-doc-header-text">
            <div className="ga-report-doc-title">Genomic Analysis Report</div>
            <div className="ga-report-doc-gene">{result.gene_symbol} — {result.validation.name}</div>
          </div>
        </div>

        <div className="ga-report-meta-grid">
          <div><span className="ga-dash-muted">Prepared for</span><p>{user?.full_name || user?.email}</p></div>
          <div><span className="ga-dash-muted">Analysis date</span><p>{formatDate(analysis.completed_at)}</p></div>
          <div><span className="ga-dash-muted">Status</span><p><span className="ga-dash-badge ga-dash-badge-success">Completed</span></p></div>
          <div><span className="ga-dash-muted">Source</span><p>{result.analysis_mode === "ai_research" ? "AI Research Analysis" : "Verified Biomedical Data"}</p></div>
        </div>
      </div>

      <div className="ga-dash-card">
        <div className="ga-workspace-section-label ga-report-section-label"><SectionIcon name="summary" />Analysis Summary</div>
        <p className="ga-workspace-summary-text">{buildAnalysisSummary(result)}</p>
      </div>

      {result.risk_assessment.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label ga-report-section-label"><SectionIcon name="risk" />Risk Information</div>
          <div className="ga-dataset-disease-list">
            {result.risk_assessment.map((r, i) => (
              <div className="ga-dataset-disease-item" key={i}>
                <div className="ga-dataset-disease-item-head"><strong>{r.disease_name}</strong><RiskBadge level={r.risk_level} /></div>
                <div className="ga-dash-muted ga-dataset-disease-meta"><span>Evidence confidence score: {r.evidence_confidence_score ?? r.probability}%</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.diseases.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label ga-report-section-label"><SectionIcon name="conditions" />Associated Conditions</div>
          <div className="ga-dataset-disease-list">
            {result.diseases.map((d, i) => {
              const v = result.verification.find((x) => x.disease_name === d.name);
              return (
                <div className="ga-dataset-disease-item" key={i}>
                  <div className="ga-dataset-disease-item-head"><strong>{d.name}</strong>{v && <span className="ga-dash-badge ga-dash-badge-pending">{v.significance}</span>}</div>
                  <div className="ga-dash-muted ga-dataset-disease-meta">
                    {d.category && <span>{d.category}</span>}
                    {v && <span>Evidence confidence: {v.evidence_confidence}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.explanation.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label ga-report-section-label"><SectionIcon name="findings" />Key Findings</div>
          <div className="ga-dash-guidance-list">
            {result.explanation.map((e, i) => (
              <div className="ga-dash-guidance-item" key={i}><span className="ga-dash-guidance-cat">{e.subject}</span><p>{e.reasoning}</p></div>
            ))}
          </div>
        </div>
      )}

      <div className="ga-dash-card">
        <div className="ga-workspace-section-label ga-report-section-label"><SectionIcon name="evidence" />Evidence</div>
        {result.research.length === 0 ? (
          <p className="ga-dash-muted">No supporting research entries are available for this gene.</p>
        ) : (
          <div className="ga-dash-guidance-list">
            {result.research.map((r, i) => (
              <div className="ga-dash-guidance-item" key={i}><strong>{r.title}</strong><p className="ga-dash-muted">{r.journal} · {r.year}</p><p>{r.summary}</p></div>
            ))}
          </div>
        )}
      </div>

      {guidanceGroups.length > 0 && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label ga-report-section-label"><SectionIcon name="guidance" />Preventive Guidance</div>
          {guidanceGroups.map((group) => (
            <div className="ga-report-guidance-group" key={group.category}>
              <div className="ga-report-guidance-group-label">{group.category}</div>
              <ul className="ga-workspace-guidance-list">
                {group.items.map((text, i) => <li key={i}>{text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="ga-dataset-results-actions ga-report-actions">
        <button className="ga-btn ga-btn-ghost" onClick={() => navigate(resultsPath)}>Back to Analysis</button>
        <button className="ga-btn ga-btn-ghost" onClick={() => navigate(guidancePath)}>Back to Preventive Guidance</button>
        {result.report?.download_url && (
          <button
            className="ga-btn ga-btn-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? "Downloading…" : "Download Report"}
          </button>
        )}
      </div>
    </>
  );
}
