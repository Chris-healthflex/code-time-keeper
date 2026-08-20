ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS selected_at timestamptz DEFAULT NULL;
