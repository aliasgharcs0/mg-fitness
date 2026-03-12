-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_menu ENABLE ROW LEVEL SECURITY;

-- USERS: anyone can read (for login), only anon can insert/update/delete (admin operations)
CREATE POLICY "Allow read access to users" ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert users" ON public.users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update users" ON public.users FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete users" ON public.users FOR DELETE TO anon USING (true);

-- HOSTELS: full access for anon (admin manages, students read)
CREATE POLICY "Allow read access to hostels" ON public.hostels FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert hostels" ON public.hostels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update hostels" ON public.hostels FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete hostels" ON public.hostels FOR DELETE TO anon USING (true);

-- MEAL_BOOKINGS: full access for anon (students book, admin reads)
CREATE POLICY "Allow read access to meal_bookings" ON public.meal_bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert meal_bookings" ON public.meal_bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update meal_bookings" ON public.meal_bookings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete meal_bookings" ON public.meal_bookings FOR DELETE TO anon USING (true);

-- WEEKLY_MENU: read for everyone, upsert for admin
CREATE POLICY "Allow read access to weekly_menu" ON public.weekly_menu FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert weekly_menu" ON public.weekly_menu FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow update weekly_menu" ON public.weekly_menu FOR UPDATE TO anon USING (true) WITH CHECK (true);