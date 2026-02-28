
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_org_api_key(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  new_key text;
BEGIN
  new_key := 'ic_' || encode(extensions.gen_random_bytes(24), 'hex');
  UPDATE public.organizations
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{api_key}',
    to_jsonb(new_key)
  )
  WHERE id = org_id;
  RETURN new_key;
END;
$$;
