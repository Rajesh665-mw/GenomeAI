import { Link } from "react-router-dom";

export default function AnalysisWorkspaceLayout({ backTo, stepLabel, children }) {
  return (
    <div className="ga-workspace">
      <header className="ga-workspace-header">
        <Link to={backTo} className="ga-workspace-brand">
          <span className="ga-dash-brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 3C6 8 18 8 18 13C18 18 6 18 6 21" stroke="#051019" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          GenomeAI
        </Link>
        {stepLabel && <span className="ga-workspace-step">{stepLabel}</span>}
      </header>
      <main className="ga-workspace-main">{children}</main>
    </div>
  );
}
