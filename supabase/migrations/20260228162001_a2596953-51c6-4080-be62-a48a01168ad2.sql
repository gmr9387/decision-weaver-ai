
-- Create a function to generate API keys for organizations
CREATE OR REPLACE FUNCTION public.generate_org_api_key(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_key text;
BEGIN
  new_key := 'ic_' || encode(gen_random_bytes(24), 'hex');
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

-- Create RLS policy to allow the ingest function (using service role) to insert cases and facts
-- The service role bypasses RLS, so no additional policies needed for the edge function.
