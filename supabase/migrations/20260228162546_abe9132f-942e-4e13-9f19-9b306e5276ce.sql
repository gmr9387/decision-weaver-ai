
-- Request logging table for API ingest
CREATE TABLE public.api_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  ip_address text,
  user_agent text,
  request_body jsonb DEFAULT '{}'::jsonb,
  response_summary text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for rate limiting lookups (org + recent time window)
CREATE INDEX idx_api_request_logs_rate_limit ON public.api_request_logs (organization_id, created_at DESC);

-- Index for analytics queries
CREATE INDEX idx_api_request_logs_endpoint ON public.api_request_logs (endpoint, created_at DESC);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's logs
CREATE POLICY "Admins can view org request logs"
ON public.api_request_logs
FOR SELECT
USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- Auto-cleanup: delete logs older than 90 days (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH deleted AS (
    DELETE FROM public.api_request_logs
    WHERE created_at < now() - interval '90 days'
    RETURNING id
  )
  SELECT count(*)::integer FROM deleted;
$$;
