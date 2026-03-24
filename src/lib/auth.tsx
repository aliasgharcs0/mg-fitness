import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type User = {
  id: number;
  authUserId: string;
  username: string;
  role: "admin" | "member";
  name: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null; // Supabase access token
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromSession = async (accessToken: string | null) => {
    if (!accessToken) {
      setUser(null);
      setToken(null);
      return;
    }

    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser(accessToken);
    if (authErr || !authUser) {
      setUser(null);
      setToken(null);
      return;
    }

    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("id, auth_user_id, username, role, name")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (memberErr || !member) {
      setUser(null);
      setToken(null);
      throw new Error("Profile not found. Ask admin to link this account in members.auth_user_id.");
    }

    setUser({
      id: member.id,
      authUserId: member.auth_user_id,
      username: member.username ?? authUser.email ?? "",
      role: (member.role ?? "member") as "admin" | "member",
      name: member.name ?? authUser.email ?? "Member",
    });
    setToken(accessToken);
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      try {
        await loadUserFromSession(session?.access_token ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      await loadUserFromSession(session?.access_token ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const raw = identifier.trim().toLowerCase();
    const email = raw.includes("@") ? raw : `${raw}@mgfitness.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password.trim(),
    });
    if (error) throw new Error(error.message || "Login failed");
    await loadUserFromSession(data.session?.access_token ?? null);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
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

