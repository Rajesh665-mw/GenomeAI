import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { streamChatTurn, newSessionId } from "../lib/chatApi";
import { toolDisplay } from "../data/chatAgents";

export default function AIResearchAnalysis({ token, basePath }) {
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState(null);
  const sessionIdRef = useRef(newSessionId());
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isRunning) return;

    setIsRunning(true);
    setTimeline([]);
    setAnswerText("");
    setError("");
    setReportId(null);

    const prompt = `Provide a full analysis of ${trimmed}, including disease associations, risk assessment, verification, research, and preventive guidance, then generate a downloadable report.`;

    await streamChatTurn(sessionIdRef.current, prompt, (type, data) => {
      switch (type) {
        case "tool_call":
          setTimeline((prev) => [...prev, { agent: data.agent, status: "running" }]);
          break;
        case "tool_result":
          setTimeline((prev) => {
            const next = [...prev];
            const idx = next.findLastIndex((t) => t.agent === data.agent && t.status === "running");
            if (idx !== -1) next[idx] = { ...next[idx], status: data.status };
            return next;
          });
          if (data.agent === "generate_report" && data.status === "completed" && data.data?.report?.report_id) {
            setReportId(data.data.report.report_id);
          }
          break;
        case "answer_chunk":
          setAnswerText((prev) => prev + data.text);
          break;
        case "error":
          setError(data.message);
          break;
        default:
          break;
      }
    }, undefined, token);

    setIsRunning(false);
  }

  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">AI Research Analysis</h1>
      <p className="ga-dash-lead">
        Advanced analysis using AI-coordinated research agents, verified biomedical sources, and current findings.
      </p>

      <div className="ga-workspace-disclaimer">
        <strong>Not a diagnosis.</strong> This analysis combines retrieved biomedical evidence with AI-generated
        interpretation. It's meant to inform, not replace, guidance from a qualified doctor or genetic counselor.
      </div>

      <form className="ga-dash-card ga-dataset-search" onSubmit={handleSubmit}>
        {error && <div className="ga-auth-formerror">{error}</div>}
        <label className="ga-auth-label">Gene or Disease name</label>
        <div className="ga-dataset-search-row">
          <input
            className="ga-auth-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. BRCA1, or Li-Fraumeni syndrome"
            disabled={isRunning}
          />
          <button className="ga-btn ga-btn-primary" type="submit" disabled={isRunning || !query.trim()}>
            {isRunning ? "Researching…" : "Run AI Research Analysis"}
          </button>
        </div>
      </form>

      {timeline.length > 0 && (
        <div className="ga-dash-card ga-ai-timeline">
          {timeline.map((step, i) => {
            const { label, verb } = toolDisplay(step.agent);
            return (
              <div className={`ga-ai-timeline-step step-${step.status}`} key={`${step.agent}-${i}`}>
                <span className="ga-ai-timeline-icon">{step.status === "running" ? "" : step.status === "failed" ? "!" : "✓"}</span>
                <span><strong>{label}</strong> — {verb}</span>
              </div>
            );
          })}
        </div>
      )}

      {answerText && (
        <div className="ga-dash-card">
          <div className="ga-workspace-section-label">AI Interpretation</div>
          <p className="ga-workspace-summary-text" style={{ whiteSpace: "pre-wrap" }}>{answerText}</p>
        </div>
      )}

      {reportId && (
        <div className="ga-dash-success-banner">
          <span className="ga-dash-success-banner-icon">✓</span>
          Analysis complete.
          <button className="ga-btn ga-btn-primary" style={{ marginLeft: "auto" }} onClick={() => navigate(`${basePath}/analysis/${reportId}`)}>
            View Results
          </button>
        </div>
      )}
    </div>
  );
}
