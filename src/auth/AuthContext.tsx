import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { api, API_BASE_URL, setAuthToken } from "@/api/client";
import type { components } from "@/api/types";

type User = components["schemas"]["UserPublic"];

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Token lives in memory only — no localStorage, no persistence across reloads.
  // Per Krapp's spec: if the page reloads, staff logs in again.

  const login = useCallback(async (username: string, password: string) => {
    // /auth/token is OAuth2 form-encoded, not JSON.
    const res = await fetch(`${API_BASE_URL}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password, scope: "" }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(body.detail ?? "Login failed");
    }

    const { access_token } = (await res.json()) as { access_token: string };
    setAuthToken(access_token);

    const { data } = await api.GET("/auth/userinfo");
    if (!data) throw new Error("Could not fetch user info after login");
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
