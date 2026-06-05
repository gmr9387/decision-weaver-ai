CREATE TABLE IF NOT EXISTS public.rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  rule_id UUID NOT NULL REFERENCES public.rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  rule_type public.rule_type NOT NULL,
  priority INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_impact NUMERIC NOT NULL DEFAULT 0,
  explanation_template TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rule_versions_unique_rule_version UNIQUE (rule_id, version)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_rule_id
  ON public.rule_versions(rule_id);

CREATE INDEX IF NOT EXISTS idx_rule_versions_org_rule_version
  ON public.rule_versions(organization_id, rule_id, version DESC);

ALTER TABLE public.rule_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view rule versions" ON public.rule_versions;

CREATE POLICY "Org members can view rule versions"
ON public.rule_versions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
  )
);

REVOKE UPDATE, DELETE ON public.rule_versions FROM authenticated;
REVOKE UPDATE, DELETE ON public.rule_versions FROM anon;

INSERT INTO public.rule_versions (
  organization_id,
  rule_id,
  version,
  name,
  description,
  category,
  rule_type,
  priority,
  enabled,
  conditions,
  output,
  confidence_impact,
  explanation_template,
  created_by,
  created_at
)
SELECT
  rules.organization_id,
  rules.id,
  COALESCE(rules.version, 1),
  rules.name,
  COALESCE(rules.description, ''),
  rules.category,
  rules.rule_type,
  rules.priority,
  rules.enabled,
  COALESCE(rules.conditions, '{}'::jsonb),
  COALESCE(rules.output, '{}'::jsonb),
  COALESCE(rules.confidence_impact, 0),
  rules.explanation_template,
  rules.created_by,
  COALESCE(rules.created_at, now())
FROM public.rules
ON CONFLICT (rule_id, version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.rule_meaningful_fields_changed(
  old_rule public.rules,
  new_rule public.rules
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN
    old_rule.name IS DISTINCT FROM new_rule.name OR
    old_rule.description IS DISTINCT FROM new_rule.description OR
    old_rule.category IS DISTINCT FROM new_rule.category OR
    old_rule.rule_type IS DISTINCT FROM new_rule.rule_type OR
    old_rule.priority IS DISTINCT FROM new_rule.priority OR
    old_rule.enabled IS DISTINCT FROM new_rule.enabled OR
    old_rule.conditions IS DISTINCT FROM new_rule.conditions OR
    old_rule.output IS DISTINCT FROM new_rule.output OR
    old_rule.confidence_impact IS DISTINCT FROM new_rule.confidence_impact OR
    old_rule.explanation_template IS DISTINCT FROM new_rule.explanation_template;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_rule_version_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT public.rule_meaningful_fields_changed(OLD, NEW) THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(MAX(rule_versions.version), 0) + 1
    INTO next_version
    FROM public.rule_versions
    WHERE rule_versions.rule_id = NEW.id;

    NEW.version := GREATEST(COALESCE(NEW.version, 1), next_version);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_rule_version_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT public.rule_meaningful_fields_changed(OLD, NEW) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.rule_versions (
    organization_id,
    rule_id,
    version,
    name,
    description,
    category,
    rule_type,
    priority,
    enabled,
    conditions,
    output,
    confidence_impact,
    explanation_template,
    created_by,
    created_at
  )
  VALUES (
    NEW.organization_id,
    NEW.id,
    COALESCE(NEW.version, 1),
    NEW.name,
    COALESCE(NEW.description, ''),
    NEW.category,
    NEW.rule_type,
    NEW.priority,
    NEW.enabled,
    COALESCE(NEW.conditions, '{}'::jsonb),
    COALESCE(NEW.output, '{}'::jsonb),
    COALESCE(NEW.confidence_impact, 0),
    NEW.explanation_template,
    NEW.created_by,
    now()
  )
  ON CONFLICT (rule_id, version) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_rule_version_before_update_trigger ON public.rules;
DROP TRIGGER IF EXISTS snapshot_rule_version_after_change_trigger ON public.rules;

CREATE TRIGGER set_rule_version_before_update_trigger
BEFORE UPDATE ON public.rules
FOR EACH ROW
EXECUTE FUNCTION public.set_rule_version_before_update();

CREATE TRIGGER snapshot_rule_version_after_change_trigger
AFTER INSERT OR UPDATE ON public.rules
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_rule_version_after_change();