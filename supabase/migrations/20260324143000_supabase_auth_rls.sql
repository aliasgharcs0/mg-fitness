-- Supabase-only migration for MG Fitness.
-- 1) Link members to auth.users
-- 2) Enable role-aware RLS
-- 3) Keep frontend direct reads/writes protected by policies

alter table if exists public.members
  add column if not exists auth_user_id uuid unique;

create index if not exists idx_members_auth_user_id on public.members(auth_user_id);

-- Helper functions for RLS
create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select m.role from public.members m where m.auth_user_id = auth.uid() limit 1),
    'member'
  );
$$;

create or replace function public.current_member_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (select m.id from public.members m where m.auth_user_id = auth.uid() limit 1);
$$;

-- MEMBERS
alter table if exists public.members enable row level security;

drop policy if exists members_select_admin_or_self on public.members;
create policy members_select_admin_or_self
on public.members
for select
to authenticated
using (
  public.current_member_role() = 'admin'
  or auth_user_id = auth.uid()
);

drop policy if exists members_update_admin_or_self on public.members;
create policy members_update_admin_or_self
on public.members
for update
to authenticated
using (
  public.current_member_role() = 'admin'
  or auth_user_id = auth.uid()
)
with check (
  public.current_member_role() = 'admin'
  or auth_user_id = auth.uid()
);

-- PROGRAMS
alter table if exists public.programs enable row level security;

drop policy if exists programs_read_all on public.programs;
create policy programs_read_all
on public.programs
for select
to authenticated
using (true);

drop policy if exists programs_write_admin on public.programs;
create policy programs_write_admin
on public.programs
for all
to authenticated
using (public.current_member_role() = 'admin')
with check (public.current_member_role() = 'admin');

-- DIET PLANS
alter table if exists public.diet_plans enable row level security;

drop policy if exists diet_plans_read_all on public.diet_plans;
create policy diet_plans_read_all
on public.diet_plans
for select
to authenticated
using (true);

drop policy if exists diet_plans_write_admin on public.diet_plans;
create policy diet_plans_write_admin
on public.diet_plans
for all
to authenticated
using (public.current_member_role() = 'admin')
with check (public.current_member_role() = 'admin');

-- PAYMENTS
alter table if exists public.payments enable row level security;

drop policy if exists payments_select_admin_or_self on public.payments;
create policy payments_select_admin_or_self
on public.payments
for select
to authenticated
using (
  public.current_member_role() = 'admin'
  or member_id = public.current_member_id()
);

drop policy if exists payments_write_admin on public.payments;
create policy payments_write_admin
on public.payments
for all
to authenticated
using (public.current_member_role() = 'admin')
with check (public.current_member_role() = 'admin');

