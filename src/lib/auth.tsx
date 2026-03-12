import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = {
  id: number;
  username: string;
  role: "admin" | "member";
  name: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("mg_fitness_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { token: string; user: User };
        setUser(parsed.user);
        setToken(parsed.token);
      } catch {
        localStorage.removeItem("mg_fitness_auth");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    let res: Response;
    try {
      res = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
    } catch (err: any) {
      throw new Error("Cannot reach server. Is it running? (npm start in the server folder)");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || "Login failed");
    }
    const loginData = data as { token: string; user: User };
    setUser(loginData.user);
    setToken(loginData.token);
    localStorage.setItem("mg_fitness_auth", JSON.stringify(loginData));
  };

  const logout = async () => {
    if (token) {
      try {
        await apiFetch("/api/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("mg_fitness_auth");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

