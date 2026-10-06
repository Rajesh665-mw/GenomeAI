import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/apiBase";

export default function FooterSection() {
  const { isAuthenticated, user } = useAuth();
  const analysisDestination = isAuthenticated
    ? user?.role === "doctor"
      ? "/doctor"
      : "/patient"
    : "/login";

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <footer className="ga-footer" id="contact">
      <div className="ga-footer-top">
        <div className="ga-footer-brand">
          <div className="ga-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>
            <span className="ga-logo-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 3C6 8 18 8 18 13C18 18 6 18 6 21" stroke="#051019" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            GenomeAI
          </div>
          <p className="ga-footer-tagline">
            Multi-agent genetic disease analysis and preventive guidance.
          </p>
        </div>

        <div className="ga-footer-col">
          <div className="ga-footer-col-title">Product</div>
          <Link className="ga-footer-link" to={analysisDestination}>Analyze Gene</Link>
          <button type="button" className="ga-footer-link-btn" onClick={() => scrollTo("ai-agents")}>AI Agents</button>
          <button type="button" className="ga-footer-link-btn" onClick={() => scrollTo("dashboard")}>Clinical Summary</button>
          <a className="ga-footer-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">API Documentation</a>
        </div>

        <div className="ga-footer-col">
          <div className="ga-footer-col-title">Platform</div>
          <button type="button" className="ga-footer-link-btn" onClick={() => scrollTo("workflow")}>Workflow Pipeline</button>
          <button type="button" className="ga-footer-link-btn" onClick={() => scrollTo("research")}>Research Architecture</button>
          <button type="button" className="ga-footer-link-btn" onClick={() => scrollTo("contact")}>Contact &amp; Support</button>
        </div>

        <div className="ga-footer-col">
          <div className="ga-footer-col-title">Clinical Compliance</div>
          <span className="ga-footer-link" style={{ cursor: "default", opacity: 0.7 }}>HIPAA Compliant Design</span>
          <span className="ga-footer-link" style={{ cursor: "default", opacity: 0.7 }}>ClinVar Verified Evidence</span>
          <span className="ga-footer-link" style={{ cursor: "default", opacity: 0.7 }}>Educational Use Notice</span>
        </div>
      </div>

      <div className="ga-footer-bottom">
        <span>© {new Date().getFullYear()} GenomeAI Platform. All rights reserved.</span>
        <span className="ga-footer-github">v0.1.0 · Clinical Intelligence Platform</span>
      </div>
    </footer>
  );
}

