
-- Function to increment rule hit count
CREATE OR REPLACE FUNCTION public.increment_rule_hit_count(rule_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE public.rules SET hit_count = hit_count + 1 WHERE id = rule_id;
$$;

-- Unique constraint for daily_metrics upsert
ALTER TABLE public.daily_metrics ADD CONSTRAINT daily_metrics_org_date_unique UNIQUE (organization_id, date);
