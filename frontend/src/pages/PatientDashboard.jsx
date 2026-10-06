import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiBase";
import { listMyAnalyses } from "../lib/analysisApi";
import { createConsultation, listMyConsultations } from "../lib/consultationApi";
import AnalyzeTab from "../components/AnalyzeTab";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "home" },
  { key: "analyses", label: "My Analyses", icon: "dna" },
  { key: "guidance", label: "Preventive Guidance", icon: "shield" },
  { key: "consultations", label: "Consultations", icon: "chat" },
  { key: "profile", label: "Profile", icon: "user" },
  { key: "settings", label: "Settings", icon: "gear" },
];

const ICONS = {
  home: <path d="M4 11.5L12 4l8 7.5M6 10v9h12v-9" />,
  dna: <path d="M8 3c0 4 8 4 8 8s-8 4-8 8M16 3c0 4-8 4-8 8s8 4 8 8M6 7h12M6 17h12" />,
  flask: <path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" />,
  shield: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />,
  chat: <path d="M4 5h16v11H8l-4 4V5z" />,
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

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const SEEN_CONSULTATIONS_KEY_PREFIX = "genomeai_seen_consultations_";

function loadSeenIds(userId) {
  try {
    const raw = localStorage.getItem(SEEN_CONSULTATIONS_KEY_PREFIX + userId);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveSeenIds(userId, set) {
  try {
    localStorage.setItem(SEEN_CONSULTATIONS_KEY_PREFIX + userId, JSON.stringify([...set]));
  } catch {
    // ignore storage failures (private browsing, quota, etc.) — the badge
    // just won't persist across reloads, nothing breaks
  }
}

export default function PatientDashboard() {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [analyses, setAnalyses] = useState(null); // null = loading
  const [analysesError, setAnalysesError] = useState("");
  const [consultations, setConsultations] = useState(null);
  const [consultationsError, setConsultationsError] = useState("");
  const [seenIds, setSeenIds] = useState(() => (user ? loadSeenIds(user.id) : new Set()));

  function markConsultationSeen(id) {
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      if (user) saveSeenIds(user.id, next);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    listMyAnalyses(token)
      .then((data) => { if (!cancelled) setAnalyses(data); })
      .catch((err) => { if (!cancelled) { setAnalysesError(err.message); setAnalyses([]); } });
    listMyConsultations(token)
      .then((data) => { if (!cancelled) setConsultations(data); })
      .catch((err) => { if (!cancelled) { setConsultationsError(err.message); setConsultations([]); } });
    return () => { cancelled = true; };
  }, [token]);

  const completedAnalyses = useMemo(() => (analyses || []).filter((a) => a.status === "completed"), [analyses]);
  const reportsAvailable = useMemo(
    () => completedAnalyses.filter((a) => a.result?.report?.download_url),
    [completedAnalyses]
  );
  const pendingConsultations = useMemo(
    () => (consultations || []).filter((c) => c.status === "pending"),
    [consultations]
  );
  const unseenResponses = useMemo(
    () => (consultations || []).filter((c) => c.status === "responded" && !seenIds.has(c.id)),
    [consultations, seenIds]
  );
  const mostRecentGuidance = useMemo(() => {
    const withGuidance = completedAnalyses.find((a) => (a.result?.guidance || []).length > 0);
    return withGuidance || null;
  }, [completedAnalyses]);

  function refreshConsultations() {
    listMyConsultations(token).then(setConsultations).catch((err) => setConsultationsError(err.message));
  }

  function refreshAnalyses() {
    return listMyAnalyses(token).then(setAnalyses).catch((err) => setAnalysesError(err.message));
  }

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
              {item.key === "consultations" && unseenResponses.length > 0 && (
                <span className="ga-dash-navbadge">{unseenResponses.length}</span>
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
              <div className="ga-dash-user-role">Patient</div>
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
        {tab === "analyze" && <AnalyzeTab token={token} basePath="/patient" onCompleted={refreshAnalyses} />}
        {tab === "overview" && (
          <OverviewTab
            user={user}
            analyses={analyses}
            completedAnalyses={completedAnalyses}
            reportsAvailable={reportsAvailable}
            pendingConsultations={pendingConsultations}
            onNavigate={setTab}
          />
        )}
        {tab === "analyses" && (
          <AnalysesTab analyses={analyses} error={analysesError} />
        )}
        {tab === "guidance" && (
          <GuidanceTab analysis={mostRecentGuidance} loading={analyses === null} onNavigate={setTab} />
        )}
        {tab === "consultations" && (
          <ConsultationsTab
            consultations={consultations}
            analyses={analyses}
            error={consultationsError}
            token={token}
            onCreated={refreshConsultations}
            seenIds={seenIds}
            onOpen={markConsultationSeen}
          />
        )}
        {tab === "profile" && <ProfileTab user={user} />}
        {tab === "settings" && <SettingsTab onLogout={logout} />}
      </main>
    </div>
  );
}

function OverviewTab({ user, analyses, completedAnalyses, reportsAvailable, pendingConsultations, onNavigate }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Welcome back, {(user?.full_name || user?.email || "").split(" ")[0]}</h1>
      <p className="ga-dash-lead">Here's a snapshot of your genomic health activity.</p>

      <div className="ga-dash-stats">
        <div className="ga-dash-stat">
          <div className="ga-dash-stat-value">{analyses === null ? "—" : analyses.length}</div>
          <div className="ga-dash-stat-label">Total Analyses</div>
        </div>
        <div className="ga-dash-stat">
          <div className="ga-dash-stat-value">{analyses === null ? "—" : reportsAvailable.length}</div>
          <div className="ga-dash-stat-label">Reports Available</div>
        </div>
        <div className="ga-dash-stat">
          <div className="ga-dash-stat-value">{analyses === null ? "—" : pendingConsultations.length}</div>
          <div className="ga-dash-stat-label">Pending Consultations</div>
        </div>
      </div>

      <div className="ga-dash-card ga-dash-analyze-cta">
        <div>
          <h3>Analyze a gene</h3>
          <p>Explore genetic information, disease associations, and preventive guidance.</p>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={() => onNavigate("analyze")}>Start Analysis</button>
      </div>

      <div className="ga-dash-card">
        <div className="ga-dash-card-head">
          <h3>Recent analyses</h3>
          <button className="ga-dash-link" onClick={() => onNavigate("analyses")}>View all</button>
        </div>
        {analyses === null ? (
          <p className="ga-dash-muted">Loading…</p>
        ) : completedAnalyses.length === 0 ? (
          <EmptyState icon="flask" title="No analyses yet" sub="Once you run your first gene analysis, it will show up here." />
        ) : (
          <ul className="ga-dash-minilist">
            {completedAnalyses.slice(0, 4).map((a) => (
              <li key={a.analysis_id}>
                <Link className="ga-dash-minilist-link" to={`/patient/analysis/${a.analysis_id}`}>
                  <span className="ga-dash-gene-chip">{a.gene_symbol}</span>
                  <span className="ga-dash-muted">{formatDate(a.completed_at || a.created_at)}</span>
                </Link>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AnalysesTab({ analyses, error }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">My Analyses</h1>
      <p className="ga-dash-lead">Every gene analysis and downloadable report tied to your account.</p>

      {error && <div className="ga-auth-formerror">{error}</div>}

      {analyses === null ? (
        <p className="ga-dash-muted">Loading…</p>
      ) : analyses.length === 0 ? (
        <EmptyState icon="flask" title="No analyses yet" sub="Your gene analyses and their reports will appear here once you run one." />
      ) : (
        <div className="ga-dash-table">
          <div className="ga-dash-table-head">
            <span>Gene</span><span>Status</span><span>Date</span><span>Report</span>
          </div>
          {analyses.map((a) => (
            <div className="ga-dash-table-row" key={a.analysis_id}>
              <span className="ga-dash-gene-chip">{a.gene_symbol}</span>
              <span><StatusBadge status={a.status} /></span>
              <span className="ga-dash-muted">{formatDate(a.completed_at || a.created_at)}</span>
              <span className="ga-dash-table-actions">
                {a.status === "completed" && a.result ? (
                  <Link className="ga-dash-link" to={`/patient/analysis/${a.analysis_id}`}>View Results</Link>
                ) : (
                  <span className="ga-dash-muted">—</span>
                )}
                {a.result?.report?.download_url && (
                  <a className="ga-dash-link" href={`${API_BASE_URL}${a.result.report.download_url}`} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuidanceTab({ analysis, loading, onNavigate }) {
  return (
    <div className="ga-dash-page">
      <h1 className="ga-dash-h1">Preventive Guidance</h1>
      <p className="ga-dash-lead">Personalized, evidence-based guidance generated from your most recent completed analysis.</p>

      {loading ? (
        <p className="ga-dash-muted">Loading…</p>
      ) : !analysis ? (
        <EmptyState
          icon="shield"
          title="No guidance yet"
          sub="Preventive guidance is generated as part of a completed gene analysis."
          action={<button className="ga-btn ga-btn-ghost" onClick={() => onNavigate("analyses")}>View my analyses</button>}
        />
      ) : (
        <div className="ga-dash-card">
          <div className="ga-dash-card-head">
            <h3>Based on your {analysis.gene_symbol} analysis</h3>
            <span className="ga-dash-muted">{formatDate(analysis.completed_at)}</span>
          </div>
          <div className="ga-dash-guidance-list">
            {(analysis.result.guidance || []).map((g, i) => (
              <div className="ga-dash-guidance-item" key={i}>
                <span className="ga-dash-guidance-cat">{g.category}</span>
                <p>{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsultationsTab({ consultations, analyses, error, token, onCreated, seenIds, onOpen }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ gene_symbol: "", disease_name: "", patient_question: "", additional_notes: "", analysis_id: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [openId, setOpenId] = useState(null);

  // Only completed analyses with a report make sense to attach — a doctor
  // reviewing the consultation should see the same finished result the
  // patient saw, not an in-progress/failed run.
  const referenceableAnalyses = (analyses || []).filter((a) => a.status === "completed" && a.result);

  function validate() {
    const next = {};
    if (!form.gene_symbol.trim()) next.gene_symbol = "Gene symbol is required.";
    if (!form.patient_question.trim()) next.patient_question = "Please describe your question.";
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  function selectReferencedAnalysis(analysisId) {
    const match = referenceableAnalyses.find((a) => a.analysis_id === analysisId);
    setForm((f) => ({
      ...f,
      analysis_id: analysisId,
      // Prefill gene from the referenced analysis, but leave it editable —
      // the patient may still be asking about a related but different gene.
      gene_symbol: match ? match.gene_symbol : f.gene_symbol,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setJustSubmitted(false);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const referenced = referenceableAnalyses.find((a) => a.analysis_id === form.analysis_id);
      await createConsultation(token, {
        gene_symbol: form.gene_symbol.trim().toUpperCase(),
        disease_name: form.disease_name.trim() || null,
        patient_question: form.patient_question.trim(),
        additional_notes: form.additional_notes.trim() || null,
        ai_report_snapshot: referenced ? referenced.result : null,
      });
      setForm({ gene_symbol: "", disease_name: "", patient_question: "", additional_notes: "", analysis_id: "" });
      setShowForm(false);
      setJustSubmitted(true);
      onCreated();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ga-dash-page">
      <div className="ga-dash-page-head">
        <div>
          <h1 className="ga-dash-h1">Consultations</h1>
          <p className="ga-dash-lead">Request a doctor's review and read their responses here.</p>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={() => { setShowForm((v) => !v); setJustSubmitted(false); }}>
          {showForm ? "Cancel" : "Request Consultation"}
        </button>
      </div>

      {justSubmitted && (
        <div className="ga-dash-success-banner">
          <span className="ga-dash-success-banner-icon">✓</span>
          Your consultation request was submitted. A doctor will review it and respond here.
        </div>
      )}

      {showForm && (
        <form className="ga-dash-card ga-dash-consult-form" onSubmit={handleSubmit} noValidate>
          {submitError && <div className="ga-auth-formerror">{submitError}</div>}

          {referenceableAnalyses.length > 0 && (
            <div className="ga-auth-field">
              <label className="ga-auth-label">Reference an existing analysis (optional)</label>
              <select
                className="ga-auth-input"
                value={form.analysis_id}
                onChange={(e) => selectReferencedAnalysis(e.target.value)}
              >
                <option value="">None — start from scratch</option>
                {referenceableAnalyses.map((a) => (
                  <option key={a.analysis_id} value={a.analysis_id}>
                    {a.gene_symbol} — {formatDate(a.completed_at)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ga-dash-form-row">
            <div className="ga-auth-field">
              <label className="ga-auth-label">Gene</label>
              <input
                className={`ga-auth-input ${formErrors.gene_symbol ? "has-error" : ""}`}
                value={form.gene_symbol}
                onChange={(e) => setForm({ ...form, gene_symbol: e.target.value })}
                placeholder="BRCA1"
              />
              {formErrors.gene_symbol && <p className="ga-auth-error">{formErrors.gene_symbol}</p>}
            </div>
            <div className="ga-auth-field">
              <label className="ga-auth-label">Disease (optional)</label>
              <input
                className="ga-auth-input"
                value={form.disease_name}
                onChange={(e) => setForm({ ...form, disease_name: e.target.value })}
                placeholder="Hereditary Breast and Ovarian Cancer Syndrome"
              />
            </div>
          </div>
          <div className="ga-auth-field">
            <label className="ga-auth-label">Your question</label>
            <textarea
              className={`ga-auth-input ga-dash-textarea ${formErrors.patient_question ? "has-error" : ""}`}
              value={form.patient_question}
              onChange={(e) => setForm({ ...form, patient_question: e.target.value })}
              placeholder="What does this result mean for my family?"
              rows={3}
            />
            {formErrors.patient_question && <p className="ga-auth-error">{formErrors.patient_question}</p>}
          </div>
          <div className="ga-auth-field">
            <label className="ga-auth-label">Additional message (optional)</label>
            <textarea
              className="ga-auth-input ga-dash-textarea"
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
              placeholder="Family history, prior test results, etc."
              rows={2}
            />
          </div>
          <button className="ga-btn ga-btn-primary ga-auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      )}

      {error && <div className="ga-auth-formerror">{error}</div>}

      {consultations === null ? (
        <p className="ga-dash-muted">Loading…</p>
      ) : consultations.length === 0 ? (
        <EmptyState icon="chat" title="No consultations yet" sub="Requests you submit to a doctor will appear here, along with their responses." />
      ) : (
        <div className="ga-dash-consult-list">
          {consultations.map((c) => {
            const isOpen = openId === c.id;
            const isUnseenResponse = c.status === "responded" && !seenIds.has(c.id);
            return (
              <div className="ga-dash-card ga-dash-consult-card" key={c.id}>
                <button
                  className="ga-dash-consult-summary"
                  onClick={() => {
                    setOpenId(isOpen ? null : c.id);
                    if (!isOpen) onOpen(c.id);
                  }}
                >
                  <div className="ga-dash-card-head" style={{ marginBottom: 0, flex: 1 }}>
                    <div>
                      <span className="ga-dash-gene-chip">{c.gene_symbol}</span>
                      {c.disease_name && <span className="ga-dash-muted"> · {c.disease_name}</span>}
                      {isUnseenResponse && <span className="ga-dash-newdot" title="New response" />}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <StatusBadge status={c.status} />
                      <svg className={`ga-dash-chevron ${isOpen ? "open" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="ga-dash-consult-detail">
                    <p className="ga-dash-consult-question">"{c.patient_question}"</p>
                    {c.additional_notes && <p className="ga-dash-muted">Additional message: {c.additional_notes}</p>}
                    {c.ai_report_snapshot && (
                      <div className="ga-dash-ref-analysis">
                        <span className="ga-dash-ref-analysis-label">Referenced analysis attached</span>
                        {c.ai_report_snapshot.report?.download_url && (
                          <a className="ga-dash-link" href={`${API_BASE_URL}${c.ai_report_snapshot.report.download_url}`} target="_blank" rel="noreferrer">
                            View report
                          </a>
                        )}
                      </div>
                    )}
                    <p className="ga-dash-muted ga-dash-consult-date">Submitted {formatDate(c.created_at)}</p>

                    {c.status === "responded" ? (
                      <div className="ga-dash-response">
                        <div className="ga-dash-response-head">
                          <strong>{c.doctor?.full_name || c.doctor?.email}</strong>
                          {c.appointment_recommended && <span className="ga-dash-badge ga-dash-badge-pending">Appointment recommended</span>}
                        </div>
                        <p>{c.doctor_response}</p>
                        {c.doctor_observations && <p className="ga-dash-muted">Additional notes: {c.doctor_observations}</p>}
                        <p className="ga-dash-muted ga-dash-consult-date">Responded {formatDate(c.responded_at)}</p>
                      </div>
                    ) : (
                      <p className="ga-dash-muted ga-dash-waiting">Waiting for a doctor to respond…</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          <div><span className="ga-dash-muted">Role</span><p style={{ textTransform: "capitalize" }}>{user?.role}</p></div>
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
