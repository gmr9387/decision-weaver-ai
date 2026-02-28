
-- Add hit_count column to rules table for tracking
ALTER TABLE public.rules ADD COLUMN IF NOT EXISTS hit_count integer NOT NULL DEFAULT 0;

-- Allow updating hit_count via RLS (already have admin update policy)
