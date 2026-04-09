import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, API_BASE_URL, setAuthToken } from "@/api/client";
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
    // /auth/token is OAuth2 form-encoded, not JSON.
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password, scope: "" }),
      });
    } catch {
      throw new Error(`No se pudo conectar al servidor en ${API_BASE_URL}. Verificá tu conexión.`);
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
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
