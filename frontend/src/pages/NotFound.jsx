import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const homeDestination = isAuthenticated
    ? user?.role === "doctor"
      ? "/doctor"
      : "/patient"
    : "/";

  return (
    <AuthLayout>
      <div className="ga-auth-card mounted" style={{ textAlign: "center", padding: "40px 30px" }}>
        <div style={{
          fontSize: "56px",
          fontWeight: "800",
          fontFamily: "'Space Grotesk', sans-serif",
          color: "var(--accent, #7ed7c1)",
          lineHeight: 1,
          marginBottom: "12px",
          textShadow: "0 0 24px rgba(126,215,193,0.3)"
        }}>
          404
        </div>
        <h1 className="ga-auth-title" style={{ marginBottom: "8px" }}>Page Not Found</h1>
        <p className="ga-auth-sub" style={{ marginBottom: "28px" }}>
          The genomic analysis or route you requested does not exist or has been moved.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            className="ga-btn ga-btn-primary"
            onClick={() => navigate(homeDestination)}
          >
            {isAuthenticated ? "Return to Dashboard" : "Return to Home"}
          </button>
          <button
            type="button"
            className="ga-btn ga-btn-ghost"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
