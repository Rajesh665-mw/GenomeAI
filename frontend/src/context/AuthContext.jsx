import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, loginUser, registerUser } from "../lib/authApi";

const TOKEN_STORAGE_KEY = "genomeai_token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  // Starts true whenever a stored token exists, so route guards (added in a
  // later feature) can wait for the /auth/me hydration below instead of
  // briefly treating a returning user as logged out.
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchCurrentUser(token)
      .then((fetchedUser) => {
        if (!cancelled) setUser(fetchedUser);
      })
      .catch(() => {
        // stored token is invalid/expired — drop it rather than getting stuck
        if (!cancelled) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = useCallback((session) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
    setToken(session.access_token);
    setUser(session.user);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const session = await loginUser({ email, password });
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const register = useCallback(
    async ({ fullName, email, password, role }) => {
      const session = await registerUser({ fullName, email, password, role });
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(user), isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
