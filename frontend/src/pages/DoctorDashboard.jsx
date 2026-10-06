import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiBase";
import { listMyConsultations, respondToConsultation } from "../lib/consultationApi";
import { getGeneRelationships } from "../lib/geneGraphApi";
import AnalyzeTab from "../components/AnalyzeTab";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "home" },
  { key: "requests", label: "Consultation Requests", icon: "chat" },
  { key: "responses", label: "Consultation Responses", icon: "check" },
  { key: "workspace", label: "Research Workspace", icon: "flask" },
  { key: "compare", label: "Gene Comparison", icon: "compare" },
  { key: "graph", label: "Relationship Graph", icon: "graph" },
  { key: "reports", label: "Report Access", icon: "file" },
  { key: "profile", label: "Profile", icon: "user" },
  { key: "settings", label: "Settings", icon: "gear" },
];

const ICONS = {
  home: <path d="M4 11.5L12 4l8 7.5M6 10v9h12v-9" />,
  dna: <path d="M8 3c0 4 8 4 8 8s-8 4-8 8M16 3c0 4-8 4-8 8s8 4 8 8M6 7h12M6 17h12" />,
  flask: <path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" />,
  shield: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />,
  chat: <path d="M4 5h16v11H8l-4 4V5z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9" /></>,
  compare: <><rect x="3.5" y="3.5" width="12" height="12" rx="2" /><rect x="8.5" y="8.5" width="12" height="12" rx="2" /></>,
  graph: <><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="7" r="2.2" /><circle cx="12" cy="18" r="2.2" /><path d="M7.8 7.2l3 8.5M16.2 8.3l-3 8" /></>,
  file: <><path d="M6 2.5h8l5 5V21H6V2.5z" /><path d="M14 2.5V8h5" /><path d="M9 13h6M9 17h6" /></>,
  user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-4 4-6 8-6s8 2 8 6" />,
  gear: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6l1.4 1.4M6.3 17.7l1.4-1.4m8.6-8.6l1.4-1.4" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="ga-dash-icon">
      {ICONS[name]}
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: "Completed", cls: "success" },
    pending: { label: "Pending", cls: "pending" },
    failed: { label: "Failed", cls: "danger" },
    responded: { label: "Responded", cls: "success" },
  };
  const s = map[status] || { label: status, cls: "pending" };
  return <span className={`ga-dash-badge ga-dash-badge-${s.cls}`}>{s.label}</span>;
}

function ReferencedAnalysisPanel({ snapshot }) {
  const topDisease = snapshot.diseases?.[0];
  const topRisk = snapshot.risk_assessment?.find((r) => r.disease_name === topDisease?.name);
  const topVerification = snapshot.verification?.find((v) => v.disease_name === topDisease?.name);

  return (
    <div className="ga-dash-ref-analysis ga-dash-ref-analysis-doctor">
      <div className="ga-dash-ref-analysis-doctor-head">
        <span className="ga-dash-ref-analysis-label">Referenced analysis — {snapshot.gene_symbol}</span>
        {snapshot.report?.download_url && (
          <a className="ga-dash-link" href={`${API_BASE_URL}${snapshot.report.download_url}`} target="_blank" rel="noreferrer">
            View report
          </a>
        )}
      </div>
      {topDisease && (
        <div className="ga-dash-ref-analysis-facts">
          <span>Top association: <strong>{topDisease.name}</strong></span>
          {topRisk && <span>Risk level: <strong>{topRisk.risk_level}</strong> (Evidence score: {topRisk.evidence_confidence_score ?? topRisk.probability}%)</span>}
          {topVerification && <span>Clinical significance: <strong>{topVerification.significance}</strong></span>}
        </div>
      )}
      {(snapshot.guidance?.length || 0) > 0 && (
        <span className="ga-dash-muted">{snapshot.guidance.length} preventive guidance item{snapshot.guidance.length === 1 ? "" : "s"} included.</span>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="ga-dash-empty">
      <div className="ga-dash-empty-icon"><Icon name={icon} /></div>
      <p className="ga-dash-empty-title">{title}</p>
      <p className="ga-dash-empty-sub">{sub}</p>
      {action}
    </div>
  );
}

function ComingSoonCard({ icon, title, sub, children }) {
  return (
    <div className="ga-dash-card ga-dash-comingsoon">
      <div className="ga-dash-comingsoon-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      <p>{sub}</p>
      {children}
      <span className="ga-dash-soon-badge">Coming soon</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function DoctorDashboard() {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [consultations, setConsultations] = useState(null); // null = loading
  const [consultationsError, setConsultationsError] = useState("");

  function refreshConsultations() {
    return listMyConsultations(token)
      .then(setConsultations)
      .catch((err) => setConsultationsError(err.message));
  }

  useEffect(() => {
    let cancelled = false;
    listMyConsultations(token)
      .then((data) => { if (!cancelled) setConsultations(data); })
      .catch((err) => { if (!cancelled) { setConsultationsError(err.message); setConsultations([]); } });
    return () => { cancelled = true; };
  }, [token]);

  const pendingRequests = useMemo(() => (consultations || []).filter((c) => c.status === "pending"), [consultations]);
  const myResponses = useMemo(
    () => (consultations || []).filter((c) => c.status === "responded" && c.doctor?.id === user?.id),
    [consultations, user]
  );
  const reportsAvailable = useMemo(
    () => (consultations || []).filter((c) => c.ai_report_snapshot?.report?.download_url),
    [consultations]
  );

  return (
    <div className="ga-dash-shell">
      {mobileNavOpen && <div className="ga-dash-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`ga-dash-sidebar ${mobileNavOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link to="/" className="ga-dash-brand">
            <span className="ga-dash-brand-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 3C6 8 18 8 18 13C18 18 6 18 6 21" stroke="#051019" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="ga-dash-label-text">GenomeAI</span>
          </Link>
          <button
            className="ga-dash-collapse-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>

        <nav className="ga-dash-nav">
          <button
            className={`ga-dash-analyze-cta-sidebar active ${tab === "analyze" ? "current" : ""}`}
            onClick={() => { setTab("analyze"); setMobileNavOpen(false); }}
            title={collapsed ? "Analyze Gene" : undefined}
          >
            <span className="ga-dash-analyze-cta-sidebar-icon"><Icon name="dna" /></span>
            <div className="ga-dash-analyze-cta-sidebar-text ga-dash-label-text">
              <div className="ga-dash-analyze-cta-sidebar-label">ANALYZE GENE</div>
              <div className="ga-dash-analyze-cta-sidebar-soon">Genes &amp; Diseases</div>
            </div>
            <span className="ga-dash-tooltip">Analyze Gene</span>
          </button>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`ga-dash-navitem ${tab === item.key ? "active" : ""}`}
              onClick={() => { setTab(item.key); setMobileNavOpen(false); }}
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} />
              <span className="ga-dash-label-text">{item.label}</span>
              {item.key === "requests" && pendingRequests.length > 0 && (
                <span className="ga-dash-navbadge">{pendingRequests.length}</span>
              )}
              <span className="ga-dash-tooltip">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ga-dash-sidebar-footer">
          <div className="ga-dash-user-chip">
            <div className="ga-dash-user-avatar">{(user?.full_name || user?.email || "?")[0].toUpperCase()}</div>
            <div className="ga-dash-label-text">
              <div className="ga-dash-user-name">{user?.full_name || user?.email}</div>
              <div className="ga-dash-user-role">Doctor / Researcher</div>
            </div>
          </div>
          <hr className="ga-dash-nav-divider" />
          <button className="ga-btn ga-btn-ghost ga-dash-logout" onClick={logout} title={collapsed ? "Log Out" : undefined}>
            <Icon name="logout" />
            <span className="ga-dash-label-text">Log Out</span>
            <span className="ga-dash-tooltip">Log Out</span>
          </button>
        </div>
      </aside>

      <button className="ga-dash-mobiletoggle" onClick={() => setMobileNavOpen((v) => !v)} aria-label="Toggle menu">
        <Icon name="menu" />
      </button>

      <main className="ga-dash-main">
        {tab === "analyze" && <AnalyzeTab token={token} basePath="/doctor" />}
        {tab === "overview" && (
          <OverviewTab user={user} pendingRequests={pendingRequests} myResponses={myResponses} onNavigate={setTab} />
        )}
        {tab === "requests" && (
          <RequestsTab pendingRequests={pendingRequests} error={consultationsError} token={token} onResponded={refreshConsultations} />
        )}
        {tab === "responses" && <ResponsesTab responses={myResponses} loading={consultations === null} />}
        {tab === "workspace" && (
          <div className="ga-dash-page">
            <h1 className="ga-dash-h1">Research Workspace</h1>
            <p className="ga-dash-lead">Create analysis sessions and explore genes and diseases across multiple sources.</p>
            <ComingSoonCard
              icon="flask"
              title="Multi-source research workspace"
              sub="This is where Gene Analysis and AI Research Analysis will run side by side — session history, notes, and cross-source findings, all in one workspace."
            />
          </div>
        )}
        {tab === "compare" && <CompareTab />}
        {tab === "graph" && <GraphTab token={token} />}
        {tab === "reports" && <ReportsTab reports={reportsAvailable} loading={consultations === null} />}
        {tab === "profile" && <ProfileTab user={user} />}
        {tab === "settings" && <SettingsTab onLogout={logout} />}
      </main>
    </div>
  );
}

function OverviewTab({ user, pendingRequests, myResponses, onNavigate }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Welcome back, {(user?.full_name || user?.email || "").split(" ")[0]}</h1>
      <p className="ga-dash-lead">Here's what needs your attention.</p>

      <div className="ga-dash-stats">
        <div className="ga-dash-stat">
          <div className="ga-dash-stat-value">{pendingRequests.length}</div>
          <div className="ga-dash-stat-label">Pending Requests</div>
        </div>
        <div className="ga-dash-stat">
          <div className="ga-dash-stat-value">{myResponses.length}</div>
          <div className="ga-dash-stat-label">Consultations Responded</div>
        </div>
        <div className="ga-dash-stat">
          <div className="ga-dash-stat-value">{pendingRequests.length + myResponses.length}</div>
          <div className="ga-dash-stat-label">Total Consultations</div>
        </div>
      </div>

      <div className="ga-dash-card">
        <div className="ga-dash-card-head">
          <h3>Pending requests</h3>
          <button className="ga-dash-link" onClick={() => onNavigate("requests")}>View all</button>
        </div>
        {pendingRequests.length === 0 ? (
          <EmptyState icon="chat" title="No pending requests" sub="New patient consultation requests will show up here." />
        ) : (
          <ul className="ga-dash-minilist">
            {pendingRequests.slice(0, 4).map((c) => (
              <li key={c.id}>
                <span className="ga-dash-gene-chip">{c.gene_symbol}</span>
                <span className="ga-dash-muted">{c.patient?.full_name || c.patient?.email}</span>
                <span className="ga-dash-muted">{formatDate(c.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RequestsTab({ pendingRequests, error, token, onResponded }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Consultation Requests</h1>
      <p className="ga-dash-lead">Patient requests waiting for a doctor's review. Any doctor can respond to a pending request.</p>

      {error && <div className="ga-auth-formerror">{error}</div>}

      {pendingRequests === null ? (
        <p className="ga-dash-muted">Loading…</p>
      ) : pendingRequests.length === 0 ? (
        <EmptyState icon="chat" title="No pending requests" sub="You're all caught up — new patient requests will appear here." />
      ) : (
        <div className="ga-dash-consult-list">
          {pendingRequests.map((c) => (
            <RequestCard
              key={c.id}
              consultation={c}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              token={token}
              onResponded={() => { setOpenId(null); onResponded(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ consultation: c, open, onToggle, token, onResponded }) {
  const [advice, setAdvice] = useState("");
  const [appointmentRecommended, setAppointmentRecommended] = useState(false);
  const [observations, setObservations] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!advice.trim()) { setError("Please write a response before submitting."); return; }
    setIsSubmitting(true);
    try {
      await respondToConsultation(token, c.id, {
        advice: advice.trim(),
        appointment_recommended: appointmentRecommended,
        observations: observations.trim() || null,
      });
      onResponded();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ga-dash-card ga-dash-consult-card">
      <div className="ga-dash-card-head">
        <div>
          <span className="ga-dash-gene-chip">{c.gene_symbol}</span>
          {c.disease_name && <span className="ga-dash-muted"> · {c.disease_name}</span>}
        </div>
        <StatusBadge status={c.status} />
      </div>
      <p className="ga-dash-muted">Patient: {c.patient?.full_name || c.patient?.email}</p>
      <p className="ga-dash-consult-question">"{c.patient_question}"</p>
      {c.additional_notes && <p className="ga-dash-muted">Notes: {c.additional_notes}</p>}
      {c.ai_report_snapshot && <ReferencedAnalysisPanel snapshot={c.ai_report_snapshot} />}
      <p className="ga-dash-muted ga-dash-consult-date">Submitted {formatDate(c.created_at)}</p>

      {!open ? (
        <button className="ga-btn ga-btn-primary" onClick={onToggle}>Respond</button>
      ) : (
        <form className="ga-dash-response-form" onSubmit={handleSubmit}>
          {error && <div className="ga-auth-formerror">{error}</div>}
          <div className="ga-auth-field">
            <label className="ga-auth-label">Your advice</label>
            <textarea
              className="ga-auth-input ga-dash-textarea"
              rows={3}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              placeholder="Share your clinical guidance for the patient…"
            />
          </div>
          <div className="ga-auth-field">
            <label className="ga-auth-label">Additional observations (optional)</label>
            <textarea
              className="ga-auth-input ga-dash-textarea"
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Anything else worth noting for the patient's record…"
            />
          </div>
          <label className="ga-dash-checkbox-row">
            <input type="checkbox" checked={appointmentRecommended} onChange={(e) => setAppointmentRecommended(e.target.checked)} />
            Recommend an in-person appointment
          </label>
          <div className="ga-dash-form-actions">
            <button className="ga-btn ga-btn-ghost" type="button" onClick={onToggle} disabled={isSubmitting}>Cancel</button>
            <button className="ga-btn ga-btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Response"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ResponsesTab({ responses, loading }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Consultation Responses</h1>
      <p className="ga-dash-lead">Your consultation history — every request you've personally responded to.</p>

      {loading ? (
        <p className="ga-dash-muted">Loading…</p>
      ) : responses.length === 0 ? (
        <EmptyState icon="check" title="No responses yet" sub="Consultations you respond to will be archived here for your records." />
      ) : (
        <div className="ga-dash-consult-list">
          {responses.map((c) => (
            <div className="ga-dash-card ga-dash-consult-card" key={c.id}>
              <div className="ga-dash-card-head">
                <div>
                  <span className="ga-dash-gene-chip">{c.gene_symbol}</span>
                  {c.disease_name && <span className="ga-dash-muted"> · {c.disease_name}</span>}
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="ga-dash-muted">Patient: {c.patient?.full_name || c.patient?.email}</p>
              <p className="ga-dash-consult-question">"{c.patient_question}"</p>
              <div className="ga-dash-response">
                <div className="ga-dash-response-head">
                  <strong>Your response</strong>
                  {c.appointment_recommended && <span className="ga-dash-badge ga-dash-badge-pending">Appointment recommended</span>}
                </div>
                <p>{c.doctor_response}</p>
                {c.doctor_observations && <p className="ga-dash-muted">Additional notes: {c.doctor_observations}</p>}
              </div>
              <p className="ga-dash-muted ga-dash-consult-date">Responded {formatDate(c.responded_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareTab() {
  const [genes, setGenes] = useState(["BRCA1", "TP53"]);
  const [draft, setDraft] = useState("");

  function addGene() {
    const symbol = draft.trim().toUpperCase();
    if (symbol && !genes.includes(symbol) && genes.length < 6) setGenes([...genes, symbol]);
    setDraft("");
  }

  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Gene Comparison</h1>
      <p className="ga-dash-lead">Compare multiple genes side by side — associations, risk patterns, and shared pathways.</p>

      <div className="ga-dash-card">
        <div className="ga-dash-card-head"><h3>Genes to compare</h3></div>
        <div className="ga-dash-chip-row">
          {genes.map((g) => (
            <span className="ga-dash-gene-chip ga-dash-gene-chip-removable" key={g}>
              {g}
              <button type="button" onClick={() => setGenes(genes.filter((x) => x !== g))} aria-label={`Remove ${g}`}>×</button>
            </span>
          ))}
        </div>
        <div className="ga-dash-form-row" style={{ marginTop: 14 }}>
          <div className="ga-auth-field" style={{ marginBottom: 0, flex: 1 }}>
            <input
              className="ga-auth-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGene(); } }}
              placeholder="Add a gene symbol, e.g. ATM"
              disabled={genes.length >= 6}
            />
          </div>
          <button className="ga-btn ga-btn-ghost" type="button" onClick={addGene} disabled={genes.length >= 6}>Add</button>
        </div>
      </div>

      <ComingSoonCard
        icon="compare"
        title="Side-by-side gene comparison"
        sub="Once Gene Analysis and AI Research Analysis are connected, comparing the genes above will surface shared disease associations, risk profiles, and research findings in one view."
      />
    </div>
  );
}

function GraphTab({ token }) {
  const [genes, setGenes] = useState(["BRCA1", "TP53"]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState("");

  function addGene() {
    const symbol = draft.trim().toUpperCase();
    if (symbol && !genes.includes(symbol) && genes.length < 8) setGenes([...genes, symbol]);
    setDraft("");
  }

  async function runGraph() {
    if (genes.length < 2) {
      setError("Add at least 2 genes to view relationships.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("loading");
    try {
      const result = await getGeneRelationships(token, genes);
      setGraph(result);
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Could not compute relationships for these genes.");
      setStatus("error");
    }
  }

  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Gene Relationship Graph</h1>
      <p className="ga-dash-lead">Analyze two or more genes to see how they connect. Doctor/Researcher access only.</p>

      <div className="ga-dash-card">
        <div className="ga-dash-card-head"><h3>Genes to analyze</h3></div>
        <div className="ga-dash-chip-row">
          {genes.map((g) => (
            <span className="ga-dash-gene-chip ga-dash-gene-chip-removable" key={g}>
              {g}
              <button type="button" onClick={() => setGenes(genes.filter((x) => x !== g))} aria-label={`Remove ${g}`}>×</button>
            </span>
          ))}
        </div>
        <div className="ga-dash-form-row" style={{ marginTop: 14 }}>
          <div className="ga-auth-field" style={{ marginBottom: 0, flex: 1 }}>
            <input
              className="ga-auth-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGene(); } }}
              placeholder="Add a gene symbol, e.g. ATM"
              disabled={genes.length >= 8}
            />
          </div>
          <button className="ga-btn ga-btn-ghost" type="button" onClick={addGene} disabled={genes.length >= 8}>Add</button>
        </div>
        <button className="ga-btn ga-btn-primary" style={{ marginTop: 14 }} onClick={runGraph} disabled={status === "loading"}>
          {status === "loading" ? "Analyzing relationships…" : "View Relationships"}
        </button>
        {error && <div className="ga-auth-formerror" style={{ marginTop: 14, marginBottom: 0 }}>{error}</div>}
      </div>

      {status === "ready" && graph && <GraphResults graph={graph} />}
    </div>
  );
}

function GraphResults({ graph }) {
  return (
    <div className="ga-dash-card">
      <div className="ga-dash-card-head"><h3>Relationships found</h3></div>

      {graph.edges.length === 0 ? (
        <EmptyState
          icon="graph"
          title="No direct relationship found"
          sub="These genes don't share any disease associations in the available data. That's a meaningful result, not a failure — it means their known conditions don't overlap."
        />
      ) : (
        <div className="ga-dash-graph-edges">
          {graph.edges.map((e, i) => (
            <div className="ga-dash-graph-edge-card" key={i}>
              <div className="ga-dash-graph-edge-head">
                <span className="ga-dash-gene-chip">{e.source}</span>
                <span className="ga-dash-graph-edge-arrow">↔</span>
                <span className="ga-dash-gene-chip">{e.target}</span>
              </div>
              <p className="ga-dash-muted">Shared associations: {e.shared_diseases.join(", ")}</p>
            </div>
          ))}
        </div>
      )}

      {graph.isolated_genes.length > 0 && (
        <div className="ga-dash-graph-isolated">
          <span className="ga-dash-muted">
            No shared associations found for: {graph.isolated_genes.map((g) => (
              <span className="ga-dash-gene-chip" key={g} style={{ marginLeft: 6 }}>{g}</span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function ReportsTab({ reports, loading }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Report Access</h1>
      <p className="ga-dash-lead">Reports attached to consultation requests you can view.</p>

      {loading ? (
        <p className="ga-dash-muted">Loading…</p>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="file"
          title="No reports available yet"
          sub="When a patient's consultation request includes a generated analysis report, it will appear here for you to review and download."
        />
      ) : (
        <div className="ga-dash-table">
          <div className="ga-dash-table-head"><span>Gene</span><span>Patient</span><span>Date</span><span>Report</span></div>
          {reports.map((c) => (
            <div className="ga-dash-table-row" key={c.id}>
              <span className="ga-dash-gene-chip">{c.gene_symbol}</span>
              <span className="ga-dash-muted">{c.patient?.full_name || c.patient?.email}</span>
              <span className="ga-dash-muted">{formatDate(c.created_at)}</span>
              <span>
                <a className="ga-dash-link" href={`${API_BASE_URL}${c.ai_report_snapshot.report.download_url}`} target="_blank" rel="noreferrer">
                  Download PDF
                </a>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ user }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Profile</h1>
      <p className="ga-dash-lead">Your account details.</p>
      <div className="ga-dash-card ga-dash-profile-card">
        <div className="ga-dash-user-avatar ga-dash-user-avatar-lg">{(user?.full_name || user?.email || "?")[0].toUpperCase()}</div>
        <div className="ga-dash-profile-fields">
          <div><span className="ga-dash-muted">Full name</span><p>{user?.full_name || "—"}</p></div>
          <div><span className="ga-dash-muted">Email</span><p>{user?.email}</p></div>
          <div><span className="ga-dash-muted">Role</span><p style={{ textTransform: "capitalize" }}>Doctor / Researcher</p></div>
          <div><span className="ga-dash-muted">Member since</span><p>{formatDate(user?.created_at)}</p></div>
        </div>
      </div>
      <p className="ga-dash-muted ga-dash-soon-note">Editing your profile is coming in a later update.</p>
    </div>
  );
}

function SettingsTab({ onLogout }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Settings</h1>
      <p className="ga-dash-lead">Account and platform preferences.</p>
      <div className="ga-dash-card">
        <div className="ga-dash-card-head"><h3>Session</h3></div>
        <p className="ga-dash-muted" style={{ marginBottom: 16 }}>Sign out of GenomeAI on this device.</p>
        <button className="ga-btn ga-btn-ghost" onClick={onLogout}>Log Out</button>
      </div>
      <p className="ga-dash-muted ga-dash-soon-note">Notification and privacy preferences are coming in a later update.</p>
    </div>
  );
}
