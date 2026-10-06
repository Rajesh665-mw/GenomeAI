import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import AuthTabs from "../components/AuthTabs";

const ROLES = [
  {
    value: "patient",
    label: "Patient",
    blurb: "Analyze genes, track your history, request consultations.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.3 4.8 6 4.2c2-.3 3.7.6 6 2.8 2.3-2.2 4-3.1 6-2.8 3.7.6 5.5 4.2 4 7.7C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4 12h3l1.5-3L11 15l1.5-4.5L14 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: "doctor",
    label: "Doctor / Researcher",
    blurb: "Review consultations, compare genes, access the research workspace.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 3v6a3 3 0 006 0V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 3v7a6 6 0 0012 0V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="18.5" cy="16.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 16a6 6 0 00-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", role: "patient" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const newUser = await register(form);
      const dest = newUser.role === "patient" ? "/patient" : newUser.role === "doctor" ? "/doctor" : "/";
      navigate(dest);
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="ga-auth-card mounted">
        <AuthTabs active="register" />

        <h1 className="ga-auth-title">Create your account</h1>
        <p className="ga-auth-sub">Join as a patient or doctor/researcher.</p>

        {formError && <div className="ga-auth-formerror">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="ga-auth-field">
            <label className="ga-auth-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              className={`ga-auth-input ${errors.fullName ? "has-error" : ""}`}
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="Jordan Alvarez"
            />
            {errors.fullName && <p className="ga-auth-error">{errors.fullName}</p>}
          </div>

          <div className="ga-auth-field">
            <label className="ga-auth-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className={`ga-auth-input ${errors.email ? "has-error" : ""}`}
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <p className="ga-auth-error">{errors.email}</p>}
          </div>

          <div className="ga-auth-field">
            <label className="ga-auth-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              className={`ga-auth-input ${errors.password ? "has-error" : ""}`}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 8 characters"
            />
            {errors.password && <p className="ga-auth-error">{errors.password}</p>}
          </div>

          <div className="ga-auth-field">
            <label className="ga-auth-label" htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              className={`ga-auth-input ${errors.confirmPassword ? "has-error" : ""}`}
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="ga-auth-error">{errors.confirmPassword}</p>}
          </div>

          <div className="ga-auth-field">
            <label className="ga-auth-label">I am a...</label>
            <div className="ga-auth-role-group">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  className={`ga-auth-role-card ${form.role === r.value ? "selected" : ""}`}
                  onClick={() => update("role", r.value)}
                  role="radio"
                  aria-checked={form.role === r.value}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") update("role", r.value); }}
                >
                  <span className="ga-auth-role-check">✓</span>
                  <div className="ga-auth-role-icon">{r.icon}</div>
                  <div className="ga-auth-role-label">{r.label}</div>
                  <div className="ga-auth-role-blurb">{r.blurb}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="ga-auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <span className="ga-auth-spinner" />}
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="ga-auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p className="ga-auth-footer-note">Secured with encrypted authentication</p>
      </div>
    </AuthLayout>
  );
}
