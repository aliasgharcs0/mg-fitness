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

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromSession = async (accessToken: string | null, authUserId?: string) => {
    if (!accessToken) {
      setUser(null);
      setToken(null);
      return;
    }

    let resolvedAuthUserId = authUserId;
    if (!resolvedAuthUserId) {
      const {
        data: { user: authUser },
        error: authErr,
      } = await withTimeout(
        supabase.auth.getUser(accessToken),
        8000,
        "Timed out while validating session with Supabase Auth.",
      );
      if (authErr || !authUser) {
        setUser(null);
        setToken(null);
        return;
      }
      resolvedAuthUserId = authUser.id;
    }

    if (!resolvedAuthUserId) {
      setUser(null);
      setToken(null);
      return;
    }

    const controller = new AbortController();
    const query = supabase
      .from("members")
      .select("id, auth_user_id, username, role, name")
      .eq("auth_user_id", resolvedAuthUserId)
      .maybeSingle()
      .abortSignal(controller.signal);
    const { data: member, error: memberErr } = await withTimeout(
      query,
      8000,
      "Timed out while loading member profile from Supabase.",
    );

    if (memberErr) {
      setUser(null);
      setToken(null);
      throw new Error(memberErr.message || "Failed to load member profile from Supabase.");
    }
    if (!member) {
      setUser(null);
      setToken(null);
      await supabase.auth.signOut();
      throw new Error(
        "Login succeeded but no linked member profile found. Link members.auth_user_id to auth.users.id in Supabase.",
      );
    }

    const roleRaw = String(member.role ?? "member").toLowerCase();
    const role: "admin" | "member" = roleRaw === "admin" ? "admin" : "member";

    setUser({
      id: member.id,
      authUserId: member.auth_user_id,
      username: member.username ?? "",
      role,
      name: member.name ?? "Member",
    });
    setToken(accessToken);
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "Timed out while restoring session from Supabase.",
        );
        if (!mounted) return;
        await loadUserFromSession(session?.access_token ?? null, session?.user?.id);
      } catch {
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        // Always clear loading so Strict Mode / slow first boot cannot leave the UI stuck on "Loading…"
        setLoading(false);
      }
    };
    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      try {
        await loadUserFromSession(session?.access_token ?? null, session?.user?.id);
      } catch {
        if (mounted) {
          setUser(null);
          setToken(null);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    const raw = identifier.trim().toLowerCase();
    const email = raw.includes("@") ? raw : `${raw}@mgfitness.local`;
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      }),
      12000,
      "Supabase login request timed out.",
    );
    if (error) throw new Error(error.message || "Login failed");
    try {
      await loadUserFromSession(data.session?.access_token ?? null, data.user?.id);
    } catch (err) {
      await supabase.auth.signOut();
      throw err;
    }
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

