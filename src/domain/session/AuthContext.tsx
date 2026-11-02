import { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "@/api/client";
import { extractApiError } from "@/api/errors";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";

type User = components["schemas"]["UserPublic"];

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restores the session from the token persisted in localStorage. A 401
  // drops the token; a network error keeps it, since it may still be valid.
  useEffect(() => {
    api
      .GET("/auth/userinfo")
      .then(({ data, response }) => {
        if (data) {
          setUser(data);
        } else if (response.status === 401) {
          setAuthToken(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Throws with a message to show: the backend's detail (wrong password,
  // pending approval, disabled account), a NetworkError, or a fallback.
  async function login(username: string, password: string) {
    const { data, error } = await api.POST("/auth/token", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      bodySerializer: (body) =>
        new URLSearchParams(body as Record<string, string>).toString(),
      body: { username, password, scope: "" },
    });
    if (error || !data) {
      throw new Error(extractApiError(error, t("somethingWentWrong")));
    }
    setAuthToken(data.access_token);

    try {
      const userInfo = await api.GET("/auth/userinfo");
      if (userInfo.error || !userInfo.data) {
        throw new Error(
          extractApiError(userInfo.error, t("somethingWentWrong")),
        );
      }
      setUser(userInfo.data);
    } catch (err) {
      // The sign-in failed as far as the user can tell: drop the token, or a
      // reload would bring back a session they were told did not start.
      setAuthToken(null);
      throw err;
    }
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
