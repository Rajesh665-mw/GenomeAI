import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import AuthTabs from "../components/AuthTabs";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      // Route each role to its own dashboard now that both exist. Admin
      // has no dashboard yet, so that role still lands on the homepage.
      const dest = loggedInUser.role === "patient" ? "/patient" : loggedInUser.role === "doctor" ? "/doctor" : "/";
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
        <AuthTabs active="login" />

        <h1 className="ga-auth-title">Welcome back</h1>
        <p className="ga-auth-sub">Sign in to continue your research.</p>

        {formError && <div className="ga-auth-formerror">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="ga-auth-field">
            <label className="ga-auth-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={`ga-auth-input ${errors.email ? "has-error" : ""}`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <p className="ga-auth-error">{errors.email}</p>}
          </div>

          <div className="ga-auth-field">
            <label className="ga-auth-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className={`ga-auth-input ${errors.password ? "has-error" : ""}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {errors.password && <p className="ga-auth-error">{errors.password}</p>}
          </div>

          <button className="ga-auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <span className="ga-auth-spinner" />}
            {isSubmitting ? "Signing in…" : "Log In"}
          </button>
        </form>

        <p className="ga-auth-switch">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
        <p className="ga-auth-footer-note">Secured with encrypted authentication</p>
      </div>
    </AuthLayout>
  );
}
