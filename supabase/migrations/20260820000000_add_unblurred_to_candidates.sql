-- Add unblurred column to candidates table (allows admin to manually reveal git details)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS unblurred boolean DEFAULT false;
