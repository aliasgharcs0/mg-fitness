
-- Billing records: stores paid amounts and manual overrides per student per month
CREATE TABLE public.billing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_label text NOT NULL,
  meals_override integer,
  bill_override integer,
  paid integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_label)
);

-- Billing history: archived monthly snapshots
CREATE TABLE public.billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_label text NOT NULL UNIQUE,
  snapshot jsonb NOT NULL DEFAULT '[]',
  archived_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write billing
CREATE POLICY "Admins manage billing_records" ON public.billing_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage billing_history" ON public.billing_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
