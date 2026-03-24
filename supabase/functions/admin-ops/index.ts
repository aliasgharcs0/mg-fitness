import { createClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function res(data: Json, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return res({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRole);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return res({ error: "Unauthorized" }, 401);

  const { data: authUserData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !authUserData.user) return res({ error: "Unauthorized" }, 401);

  const { data: me } = await admin
    .from("members")
    .select("id, role")
    .eq("auth_user_id", authUserData.user.id)
    .maybeSingle();
  if (!me || me.role !== "admin") return res({ error: "Admin only" }, 403);

  const body = (await req.json().catch(() => ({}))) as Json;
  const action = String(body.action ?? "");

  if (action === "create_member") {
    const member = (body.member ?? {}) as Json;
    const username = String(member.username ?? "").trim().toLowerCase();
    const password = String(member.password ?? "").trim();
    const name = String(member.name ?? "").trim();
    if (!username || !password || !name) return res({ error: "username, password, name required" }, 400);

    const email = `${username}@mgfitness.local`;
    const { data: createdAuth, error: createAuthErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createAuthErr || !createdAuth.user) return res({ error: createAuthErr?.message ?? "Failed to create auth user" }, 400);

    const startDate = new Date().toISOString().slice(0, 10);
    const renewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const insertRow: Json = {
      auth_user_id: createdAuth.user.id,
      username,
      role: String(member.role ?? "member"),
      name,
      email: String(member.email ?? ""),
      phone: String(member.phone ?? ""),
      trainer: String(member.trainer ?? ""),
      membership: String(member.membership ?? "Custom"),
      diet_plan_id: member.diet_plan_id ?? null,
      payment_day: Number(member.payment_day ?? 1),
      status: "active",
      start_date: startDate,
      renew_date: renewDate,
      balance: 0,
      total_paid: 0,
      fees: Number(member.fees ?? 0),
    };

    const { data: createdMember, error: createMemberErr } = await admin
      .from("members")
      .insert(insertRow)
      .select("*")
      .maybeSingle();
    if (createMemberErr || !createdMember) {
      await admin.auth.admin.deleteUser(createdAuth.user.id);
      return res({ error: createMemberErr?.message ?? "Failed to create member profile" }, 400);
    }
    return res(createdMember as Json, 201);
  }

  if (action === "delete_member") {
    const memberId = Number(body.member_id ?? 0);
    if (!memberId) return res({ error: "member_id required" }, 400);
    const { data: existing } = await admin
      .from("members")
      .select("id, role, auth_user_id")
      .eq("id", memberId)
      .maybeSingle();
    if (!existing) return res({ error: "Member not found" }, 404);
    if (existing.role === "admin") return res({ error: "Cannot delete admin" }, 403);

    await admin.from("payments").delete().eq("member_id", memberId);
    await admin.from("members").delete().eq("id", memberId);
    if (existing.auth_user_id) await admin.auth.admin.deleteUser(existing.auth_user_id);
    return res({ ok: true });
  }

  return res({ error: "Unknown action" }, 400);
});

