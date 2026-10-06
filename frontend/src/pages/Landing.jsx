import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DNABackground from "../components/DNABackground";
import ClinicalVerificationStatus from "../components/ClinicalVerificationStatus";
import StatsSection from "../sections/Stats";
import AgentsSection from "../sections/Agents";
import WorkflowSection from "../sections/Workflow";
import ResearchCapabilitiesSection from "../sections/ResearchCapabilities";
import KnowledgeGraphSection from "../sections/KnowledgeGraph";
import DashboardSection from "../sections/Dashboard";
import TrustedSourcesSection from "../sections/TrustedSources";
import ReportPreviewSection from "../sections/ReportPreview";
import { API_BASE_URL } from "../lib/apiBase";
import FooterSection from "../sections/Footer";
import "../index.css";

export default function Landing() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mouse = useRef({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    function onMouseMove(e) {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("scroll", onScroll);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const analysisDestination = isAuthenticated
    ? user?.role === "doctor"
      ? "/doctor"
      : "/patient"
    : "/login";

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  const navItems = [
    { label: "Home", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { label: "Analyze Gene", action: () => navigate(analysisDestination) },
    { label: "AI Agents", action: () => scrollToSection("ai-agents") },
    { label: "Clinical Summary", action: () => scrollToSection("dashboard") },
    { label: "Research", action: () => scrollToSection("research") },
    { label: "Documentation", action: () => window.open(`${API_BASE_URL}/docs`, "_blank", "noopener,noreferrer") },
    { label: "About", action: () => scrollToSection("workflow") },
    { label: "Contact", action: () => scrollToSection("contact") },
  ];

  function handleNavClick(item) {
    setMenuOpen(false);
    item.action?.();
  }

  return (
    <div className="ga-root">
      <div className="ga-hex-pattern" />

      <div className="ga-ambient-glow">
        <span className="glow-blob glow-a" />
        <span className="glow-blob glow-b" />
        <span className="glow-blob glow-c" />
      </div>

      <nav className={`ga-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="ga-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>
          <span className="ga-logo-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 3C6 8 18 8 18 13C18 18 6 18 6 21" stroke="#051019" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          GenomeAI
        </div>

        <ul className="ga-links">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="ga-nav-link-btn"
                onClick={() => handleNavClick(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="ga-nav-actions">
          {isAuthenticated ? (
            <div className="ga-nav-user">
              <span className="ga-nav-user-name">Hi, {user.full_name?.split(" ")[0] || user.email}</span>
              {(user.role === "patient" || user.role === "doctor") && (
                <Link className="ga-btn ga-btn-ghost" to={user.role === "patient" ? "/patient" : "/doctor"}>Dashboard</Link>
              )}
              <button className="ga-btn ga-btn-ghost" onClick={logout}>Log Out</button>
            </div>
          ) : (
            <Link className="ga-btn ga-btn-ghost" to="/login">Sign In</Link>
          )}
          <Link className="ga-btn ga-btn-primary" to={analysisDestination}>Analyze Gene</Link>
          <button className="ga-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className={`ga-mobile-menu ${menuOpen ? "open" : ""}`}>
        <button className="ga-mobile-close" onClick={() => setMenuOpen(false)}>×</button>
        <ul>
          {navItems.map((item) => (
            <li key={item.label} onClick={() => handleNavClick(item)}>
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <header className="ga-hero">
        <DNABackground mouse={mouse} />
        <div className="ga-hero-fade" />

        <div className="ga-hero-copy">
          <div className="ga-eyebrow">
            <span className="dot"></span>
            Multi-Agent Genomic Intelligence
          </div>

          <h1 className="ga-headline">
            AI-Powered Genetic Disease<br />
            Analysis Using <span className="grad">Multi-Agent Intelligence</span>
          </h1>

          <p className="ga-sub">
            Certain genetic mutations quietly raise your lifetime risk for specific
            diseases, often years before any symptoms appear. GenomeAI analyzes a gene
            through seven specialized AI agents that validate findings against trusted
            biomedical databases and translate the result into clear, evidence-based
            preventive guidance you can act on.
          </p>

          <div className="ga-hero-actions">
            <Link className="ga-btn ga-btn-primary ga-btn-lg" to={analysisDestination}>
              Analyze Gene
            </Link>
            <button
              type="button"
              className="ga-btn ga-btn-ghost ga-btn-lg"
              onClick={() => scrollToSection("workflow")}
            >
              Explore Platform
            </button>
          </div>

          <div className="ga-trust-row">
            <span><span className="pulse"></span>7 coordinated AI agents</span>
            <span>NCBI · ClinVar · OMIM sourced</span>
          </div>
        </div>

        <div className="ga-hero-visual-space" />

        <div className="ga-scroll-cue" onClick={() => scrollToSection("workflow")} style={{ cursor: "pointer" }}>
          Scroll to explore
          <span className="ga-scroll-line"></span>
        </div>
      </header>

      <div className="ga-cvs-section">
        <ClinicalVerificationStatus />
      </div>

      <StatsSection />
      <AgentsSection />
      <WorkflowSection />
      <ResearchCapabilitiesSection />
      <KnowledgeGraphSection />
      <DashboardSection />
      <TrustedSourcesSection />
      <ReportPreviewSection />
      <FooterSection />
    </div>
  );
}
