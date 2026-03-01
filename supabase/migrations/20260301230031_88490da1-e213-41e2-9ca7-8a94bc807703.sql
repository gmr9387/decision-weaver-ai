
-- case_facts: UPDATE and DELETE
CREATE POLICY "Users can update case facts"
ON public.case_facts FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_facts.case_id AND c.organization_id = get_user_org_id(auth.uid())));

CREATE POLICY "Users can delete case facts"
ON public.case_facts FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_facts.case_id AND c.organization_id = get_user_org_id(auth.uid())));

-- inference_runs: UPDATE and DELETE (admin only)
CREATE POLICY "Admins can update org inference runs"
ON public.inference_runs FOR UPDATE
USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete org inference runs"
ON public.inference_runs FOR DELETE
USING (organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- recommendations: UPDATE and DELETE
CREATE POLICY "Users can update recommendations"
ON public.recommendations FOR UPDATE
USING (EXISTS (SELECT 1 FROM inference_runs ir WHERE ir.id = recommendations.inference_run_id AND ir.organization_id = get_user_org_id(auth.uid())));

CREATE POLICY "Users can delete recommendations"
ON public.recommendations FOR DELETE
USING (EXISTS (SELECT 1 FROM inference_runs ir WHERE ir.id = recommendations.inference_run_id AND ir.organization_id = get_user_org_id(auth.uid())));

-- case_assignments: UPDATE and DELETE
CREATE POLICY "Users can update case assignments"
ON public.case_assignments FOR UPDATE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_assignments.case_id AND c.organization_id = get_user_org_id(auth.uid())));

CREATE POLICY "Users can delete case assignments"
ON public.case_assignments FOR DELETE
USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_assignments.case_id AND c.organization_id = get_user_org_id(auth.uid())));
