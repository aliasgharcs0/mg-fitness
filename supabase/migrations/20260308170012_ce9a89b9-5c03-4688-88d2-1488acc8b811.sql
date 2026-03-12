CREATE TABLE public.weekly_menu (
  id integer PRIMARY KEY DEFAULT 1,
  menu_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);