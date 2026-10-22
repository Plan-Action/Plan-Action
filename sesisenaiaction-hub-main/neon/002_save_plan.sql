CREATE FUNCTION public.save_department_plan(details jsonb, participant_ids uuid[], target_plan_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved_id uuid;
BEGIN
 IF target_plan_id IS NULL THEN
 INSERT INTO public.action_plans (title,description,objective,expected_result,where_location,how_to_execute,
 estimated_cost,start_date,end_date,status,priority,category,department,created_by)
 VALUES (details->>'title',details->>'description',details->>'objective',details->>'expected_result',details->>'where_location',details->>'how_to_execute',
 (details->>'estimated_cost')::numeric,(details->>'start_date')::date,(details->>'end_date')::date,
 details->>'status',details->>'priority',details->>'category',details->>'department',private.caller_id()) RETURNING id INTO saved_id;
 ELSE
 UPDATE public.action_plans SET title=details->>'title',description=details->>'description',objective=details->>'objective',
 expected_result=details->>'expected_result',where_location=details->>'where_location',how_to_execute=details->>'how_to_execute',
 estimated_cost=(details->>'estimated_cost')::numeric,start_date=(details->>'start_date')::date,end_date=(details->>'end_date')::date,
 status=details->>'status',priority=details->>'priority',category=details->>'category',department=details->>'department'
 WHERE id=target_plan_id RETURNING id INTO saved_id;
 IF saved_id IS NULL THEN RAISE EXCEPTION 'Plano indisponível ou sem permissão' USING ERRCODE='42501'; END IF;
 END IF;
 DELETE FROM public.plan_assignments WHERE plan_id=saved_id;
 INSERT INTO public.plan_assignments(plan_id,professor_id) SELECT saved_id,member_id FROM unnest(participant_ids) AS member_id;
 RETURN saved_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_department_plan(jsonb,uuid[],uuid) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION public.save_department_plan(jsonb,uuid[],uuid) TO authenticated;
