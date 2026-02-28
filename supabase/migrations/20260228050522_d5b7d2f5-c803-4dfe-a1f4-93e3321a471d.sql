
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'reviewer', 'analyst', 'executive');
CREATE TYPE public.case_status AS ENUM ('open', 'processing', 'resolved', 'escalated', 'pending_info');
CREATE TYPE public.decision_type AS ENUM ('approve', 'deny', 'flag', 'escalate', 'review', 'request_info', 'route', 'monitor', 'unresolved');
CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.confidence_band AS ENUM ('low', 'medium', 'high', 'very_high');
CREATE TYPE public.inference_mode AS ENUM ('instant', 'deep', 'assisted');
CREATE TYPE public.review_state AS ENUM ('pending', 'in_review', 'completed', 'reopened');
CREATE TYPE public.rule_type AS ENUM ('deterministic', 'heuristic', 'derived_fact', 'routing', 'explainability');

-- =============================================
-- ORGANIZATIONS
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES (separate table per security requirements)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- CASES
-- =============================================
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  case_number TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  source TEXT NOT NULL DEFAULT 'Manual Entry',
  status public.case_status NOT NULL DEFAULT 'open',
  severity public.severity_level NOT NULL DEFAULT 'medium',
  owner TEXT,
  review_state public.review_state NOT NULL DEFAULT 'pending',
  amount NUMERIC,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cases_org ON public.cases(organization_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_severity ON public.cases(severity);

-- =============================================
-- CASE FACTS
-- =============================================
CREATE TABLE public.case_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value JSONB NOT NULL,
  source TEXT,
  quality TEXT NOT NULL DEFAULT 'unverified',
  is_derived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_facts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_case_facts_case ON public.case_facts(case_id);

-- =============================================
-- RULES
-- =============================================
CREATE TABLE public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  rule_type public.rule_type NOT NULL DEFAULT 'deterministic',
  priority INT NOT NULL DEFAULT 5,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  conditions JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  confidence_impact NUMERIC DEFAULT 0,
  explanation_template TEXT,
  version INT NOT NULL DEFAULT 1,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rules_org ON public.rules(organization_id);

-- =============================================
-- INFERENCE RUNS
-- =============================================
CREATE TABLE public.inference_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  mode public.inference_mode NOT NULL DEFAULT 'instant',
  decision public.decision_type,
  confidence NUMERIC,
  confidence_band public.confidence_band,
  severity public.severity_level,
  explanation TEXT,
  confidence_breakdown JSONB DEFAULT '{}',
  candidate_decisions JSONB DEFAULT '[]',
  fired_rules JSONB DEFAULT '[]',
  missing_facts TEXT[] DEFAULT '{}',
  contradictions TEXT[] DEFAULT '{}',
  evidence_refs TEXT[] DEFAULT '{}',
  input_snapshot JSONB DEFAULT '{}',
  normalized_facts JSONB DEFAULT '{}',
  version_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inference_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inference_runs_case ON public.inference_runs(case_id);
CREATE INDEX idx_inference_runs_org ON public.inference_runs(organization_id);

-- =============================================
-- RECOMMENDATIONS
-- =============================================
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inference_run_id UUID REFERENCES public.inference_runs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  urgency public.severity_level DEFAULT 'medium',
  suggested_owner TEXT,
  expected_impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- QUEUES
-- =============================================
CREATE TABLE public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CASE ASSIGNMENTS
-- =============================================
CREATE TABLE public.case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- DAILY METRICS (for analytics)
-- =============================================
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  processed INT DEFAULT 0,
  auto_resolved INT DEFAULT 0,
  escalated INT DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0,
  avg_time_to_decision NUMERIC DEFAULT 0,
  UNIQUE(organization_id, date)
);
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Organizations: users can see their own org
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Profiles: users see own profile, admins see org profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view org profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_org_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- User roles: users can view own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Cases: org-scoped access
CREATE POLICY "Users can view org cases"
  ON public.cases FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert org cases"
  ON public.cases FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can update org cases"
  ON public.cases FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can delete org cases"
  ON public.cases FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Case facts: access through case org
CREATE POLICY "Users can view case facts"
  ON public.case_facts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.organization_id = public.get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert case facts"
  ON public.case_facts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- Rules: org-scoped
CREATE POLICY "Users can view org rules"
  ON public.rules FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can insert org rules"
  ON public.rules FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update org rules"
  ON public.rules FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete org rules"
  ON public.rules FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Inference runs: org-scoped
CREATE POLICY "Users can view org inference runs"
  ON public.inference_runs FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can insert org inference runs"
  ON public.inference_runs FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

-- Recommendations: through inference run
CREATE POLICY "Users can view recommendations"
  ON public.recommendations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inference_runs ir
      WHERE ir.id = inference_run_id AND ir.organization_id = public.get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert recommendations"
  ON public.recommendations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inference_runs ir
      WHERE ir.id = inference_run_id AND ir.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- Queues: org-scoped
CREATE POLICY "Users can view org queues"
  ON public.queues FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can manage queues"
  ON public.queues FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Case assignments: through case org
CREATE POLICY "Users can view case assignments"
  ON public.case_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.organization_id = public.get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert case assignments"
  ON public.case_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- Daily metrics: org-scoped
CREATE POLICY "Users can view org metrics"
  ON public.daily_metrics FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "System can insert metrics"
  ON public.daily_metrics FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
