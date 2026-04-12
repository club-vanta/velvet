import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, setAuthToken } from "@/api/client";
import { extractApiError } from "@/api/errors";
import type { components } from "@/api/types";

type User = components["schemas"]["UserPublic"];

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehidrata el usuario al montar si hay un token persistido en localStorage.
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
      .catch(() => {
        // Error de red — el token puede seguir siendo válido, no lo borramos.
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data, error } = await api.POST("/auth/token", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      bodySerializer: (body) =>
        new URLSearchParams(body as Record<string, string>).toString(),
      body: { username, password, scope: "" },
    });

    if (error) throw new Error(extractApiError(error, "Login failed"));

    setAuthToken(data.access_token);

    const { data: userInfo } = await api.GET("/auth/userinfo");
    if (!userInfo) throw new Error("Could not fetch user info after login");
    setUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

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
