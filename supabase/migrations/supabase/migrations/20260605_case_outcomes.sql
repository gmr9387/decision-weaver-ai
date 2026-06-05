CREATE TABLE IF NOT EXISTS public.case_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  expected_decision TEXT,
  actual_outcome TEXT NOT NULL CHECK (
    actual_outcome IN (
      'confirmed_correct',
      'incorrect',
      'partially_correct',
      'needs_more_info',
      'overturned'
    )
  ),
  confidence_at_label NUMERIC,
  notes TEXT,
  labeled_by UUID REFERENCES auth.users(id),
  labeled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT case_outcomes_unique_case UNIQUE (case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_outcomes_org
  ON public.case_outcomes(organization_id);

CREATE INDEX IF NOT EXISTS idx_case_outcomes_case
  ON public.case_outcomes(case_id);

ALTER TABLE public.case_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view case outcomes" ON public.case_outcomes;
DROP POLICY IF EXISTS "Org members can write case outcomes" ON public.case_outcomes;

CREATE POLICY "Org members can view case outcomes"
ON public.case_outcomes
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can write case outcomes"
ON public.case_outcomes
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update case outcomes"
ON public.case_outcomes
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);