import { supabase } from "@/integrations/supabase/client";

type CurrentUser = {
  authUserId: string;
  memberId: number;
  role: "admin" | "member";
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toBody(raw?: BodyInit | null): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("members")
    .select("id, role, auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!member) return null;
  return {
    authUserId: user.id,
    memberId: member.id,
    role: (member.role ?? "member") as "admin" | "member",
  };
}

function pathParts(path: string) {
  const clean = path.replace(/^\/api\/?/, "").replace(/^\/+/, "");
  return clean.split("/").filter(Boolean);
}

/** Supabase-only API compatibility layer (replaces Express `/api/*`). */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const parts = pathParts(path);
  const base = parts[0] ?? "";
  const id = parts[1] ? Number(parts[1]) : null;
  const body = toBody(options.body);
  const me = await getCurrentUser();

  // /api/me
  if (base === "me" && method === "GET") {
    if (!me) return json({ error: "Unauthorized" }, 401);
    const { data, error } = await supabase.from("members").select("*").eq("id", me.memberId).maybeSingle();
    if (error || !data) return json({ error: "User not found" }, 404);
    return json(data);
  }

  // /api/me/password
  if (base === "me" && parts[1] === "password" && method === "PATCH") {
    if (!me) return json({ error: "Unauthorized" }, 401);
    const newPassword = String(body.newPassword ?? "");
    if (!newPassword) return json({ error: "newPassword is required" }, 400);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  // /api/members
  if (base === "members") {
    if (!me) return json({ error: "Unauthorized" }, 401);

    if (method === "GET") {
      if (me.role === "admin") {
        const { data, error } = await supabase.from("members").select("*").neq("role", "admin");
        if (error) return json({ error: error.message }, 400);
        return json(data ?? []);
      }
      const { data, error } = await supabase.from("members").select("*").eq("id", me.memberId);
      if (error) return json({ error: error.message }, 400);
      return json(data ?? []);
    }

    if (method === "POST") {
      if (me.role !== "admin") return json({ error: "Admin only" }, 403);
      const payload = {
        action: "create_member",
        member: body,
      };
      const { data, error } = await supabase.functions.invoke("admin-ops", { body: payload });
      if (error || data?.error) return json({ error: data?.error ?? error?.message ?? "Failed to create member" }, 400);
      return json(data, 201);
    }

    if ((method === "PATCH" || method === "DELETE") && id) {
      if (method === "DELETE") {
        if (me.role !== "admin") return json({ error: "Admin only" }, 403);
        const { data, error } = await supabase.functions.invoke("admin-ops", {
          body: { action: "delete_member", member_id: id },
        });
        if (error || data?.error) return json({ error: data?.error ?? error?.message ?? "Failed to delete member" }, 400);
        return json({ ok: true });
      }

      if (me.role !== "admin" && id !== me.memberId) return json({ error: "Forbidden" }, 403);
      const patch = { ...body } as Record<string, unknown>;
      if (patch.password) {
        delete patch.password; // password updates are via /me/password
      }
      const { data, error } = await supabase.from("members").update(patch).eq("id", id).select("*").maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Member not found" }, error ? 400 : 404);
      return json(data);
    }
  }

  // /api/programs
  if (base === "programs") {
    if (method === "GET") {
      const { data, error } = await supabase.from("programs").select("*");
      if (error) return json({ error: error.message }, 400);
      return json(data ?? []);
    }
    if (!me || me.role !== "admin") return json({ error: "Admin only" }, 403);

    if (method === "POST") {
      const { data, error } = await supabase.from("programs").insert(body).select("*").maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Failed to create program" }, 400);
      return json(data, 201);
    }
    if (method === "PATCH" && id) {
      const { data, error } = await supabase.from("programs").update(body).eq("id", id).select("*").maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Program not found" }, 400);
      return json(data);
    }
    if (method === "DELETE" && id) {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
  }

  // /api/diet-plans
  if (base === "diet-plans") {
    if (method === "GET") {
      const { data, error } = await supabase.from("diet_plans").select("*");
      if (error) return json({ error: error.message }, 400);
      return json(data ?? []);
    }
    if (!me || me.role !== "admin") return json({ error: "Admin only" }, 403);
    if (method === "POST") {
      const { data, error } = await supabase.from("diet_plans").insert(body).select("*").maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Failed to create diet plan" }, 400);
      return json(data, 201);
    }
    if (method === "PATCH" && id) {
      const { data, error } = await supabase.from("diet_plans").update(body).eq("id", id).select("*").maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Diet plan not found" }, 400);
      return json(data);
    }
    if (method === "DELETE" && id) {
      await supabase.from("members").update({ diet_plan_id: null }).eq("diet_plan_id", id);
      const { error } = await supabase.from("diet_plans").delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
  }

  // /api/payments
  if (base === "payments") {
    if (!me) return json({ error: "Unauthorized" }, 401);
    if (method === "GET") {
      if (me.role === "admin") {
        const { data, error } = await supabase.from("payments").select("*");
        if (error) return json({ error: error.message }, 400);
        return json(data ?? []);
      }
      const { data, error } = await supabase.from("payments").select("*").eq("member_id", me.memberId);
      if (error) return json({ error: error.message }, 400);
      return json(data ?? []);
    }
    if (method === "POST") {
      if (me.role !== "admin") return json({ error: "Admin only" }, 403);
      const { data, error } = await supabase.from("payments").insert(body).select("*").maybeSingle();
      if (error || !data) return json({ error: error?.message ?? "Failed to create payment" }, 400);
      return json(data, 201);
    }
  }

  // Keep login/logout compatibility for older UI flows (now handled by supabase auth directly).
  if (base === "login" || base === "logout") {
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

export async function fixAdminAccount(): Promise<{ fixed: boolean; message?: string; error?: string }> {
  return { fixed: false, error: "Removed: using Supabase Auth directly." };
}

export { apiFetch as default };
