-- Fresh start: clear existing data
DELETE FROM public.meal_bookings;
DELETE FROM public.users;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Remove role and pin from users, add FK to auth.users
ALTER TABLE public.users DROP COLUMN IF EXISTS role;
ALTER TABLE public.users DROP COLUMN IF EXISTS pin;
ALTER TABLE public.users ADD CONSTRAINT users_id_auth_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop old permissive RLS policies
DROP POLICY IF EXISTS "Allow read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow insert users" ON public.users;
DROP POLICY IF EXISTS "Allow update users" ON public.users;
DROP POLICY IF EXISTS "Allow delete users" ON public.users;
DROP POLICY IF EXISTS "Allow read access to meal_bookings" ON public.meal_bookings;
DROP POLICY IF EXISTS "Allow insert meal_bookings" ON public.meal_bookings;
DROP POLICY IF EXISTS "Allow update meal_bookings" ON public.meal_bookings;
DROP POLICY IF EXISTS "Allow delete meal_bookings" ON public.meal_bookings;
DROP POLICY IF EXISTS "Allow read access to hostels" ON public.hostels;
DROP POLICY IF EXISTS "Allow insert hostels" ON public.hostels;
DROP POLICY IF EXISTS "Allow update hostels" ON public.hostels;
DROP POLICY IF EXISTS "Allow delete hostels" ON public.hostels;
DROP POLICY IF EXISTS "Allow read access to weekly_menu" ON public.weekly_menu;
DROP POLICY IF EXISTS "Allow insert weekly_menu" ON public.weekly_menu;
DROP POLICY IF EXISTS "Allow update weekly_menu" ON public.weekly_menu;

-- user_roles: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- users: authenticated can read all, admins can manage
CREATE POLICY "Authenticated can read users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hostels: authenticated can read, admins can manage
CREATE POLICY "Authenticated can read hostels" ON public.hostels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert hostels" ON public.hostels FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update hostels" ON public.hostels FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete hostels" ON public.hostels FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- meal_bookings: users manage own, admins read all
CREATE POLICY "Users can read own bookings" ON public.meal_bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all bookings" ON public.meal_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own bookings" ON public.meal_bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookings" ON public.meal_bookings FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own bookings" ON public.meal_bookings FOR DELETE TO authenticated USING (user_id = auth.uid());

-- weekly_menu: authenticated can read, admins can manage
CREATE POLICY "Authenticated can read menu" ON public.weekly_menu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert menu" ON public.weekly_menu FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update menu" ON public.weekly_menu FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));