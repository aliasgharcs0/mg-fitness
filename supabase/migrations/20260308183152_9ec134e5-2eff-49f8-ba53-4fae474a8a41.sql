CREATE POLICY "Students can read own billing_records"
ON public.billing_records
FOR SELECT
TO authenticated
USING (user_id = auth.uid());