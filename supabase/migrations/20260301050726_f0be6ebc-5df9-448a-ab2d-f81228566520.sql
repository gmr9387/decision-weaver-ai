
-- Create webhook delivery logs table
CREATE TABLE public.webhook_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event TEXT NOT NULL DEFAULT 'case.ingested',
  status TEXT NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view delivery logs for their org
CREATE POLICY "Admins can view org delivery logs"
  ON public.webhook_delivery_logs
  FOR SELECT
  USING (
    organization_id = get_user_org_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Index for fast lookups
CREATE INDEX idx_webhook_delivery_logs_webhook_id ON public.webhook_delivery_logs(webhook_id);
CREATE INDEX idx_webhook_delivery_logs_org_created ON public.webhook_delivery_logs(organization_id, created_at DESC);
