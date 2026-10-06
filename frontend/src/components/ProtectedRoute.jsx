import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route element. Three states:
 *  - still resolving the stored token (isLoading) -> render nothing yet,
 *    so a logged-in user never flashes a login redirect on refresh.
 *  - not authenticated -> send to /login.
 *  - authenticated but role isn't in `allow` -> send home rather than
 *    showing a dashboard that doesn't belong to them.
 */
export default function ProtectedRoute({ children, allow }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="ga-route-loading" aria-label="Loading">
        <span className="ga-route-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
