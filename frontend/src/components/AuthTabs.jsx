import { Link } from "react-router-dom";

export default function AuthTabs({ active }) {
  return (
    <div className="ga-auth-tabs">
      <div className="ga-auth-tab-slider" style={{ transform: `translateX(${active === "login" ? "0%" : "100%"})` }} />
      <Link to="/login" className={`ga-auth-tab ${active === "login" ? "active" : ""}`}>Log In</Link>
      <Link to="/register" className={`ga-auth-tab ${active === "register" ? "active" : ""}`}>Register</Link>
    </div>
  );
}
