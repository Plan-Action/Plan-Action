CREATE OR REPLACE FUNCTION private.caller_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid();$$;
REVOKE ALL ON FUNCTION private.caller_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.caller_id() TO authenticated;
ALTER POLICY profile_read ON public.profiles USING(private.ready() AND enabled AND (id=private.caller_id() OR private.department_access(department)));
ALTER POLICY profile_write ON public.profiles USING(private.ready() AND id=private.caller_id() AND NOT is_absolute_admin) WITH CHECK(id=private.caller_id());
ALTER POLICY plan_insert ON public.action_plans WITH CHECK(private.ready() AND private.caller_role() IN ('admin','coordenador') AND private.department_access(department) AND created_by=private.caller_id());
CREATE FUNCTION private.participant(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.plan_assignments WHERE plan_id=target AND professor_id=auth.uid());$$;
REVOKE ALL ON FUNCTION private.participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.participant(uuid) TO authenticated;
ALTER POLICY plan_read ON public.action_plans USING(private.ready() AND private.department_access(department) AND (private.caller_role() IN ('admin','coordenador') OR private.participant(id)));
CREATE FUNCTION private.protect_auth_principal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF EXISTS(SELECT 1 FROM public.profiles WHERE id=OLD.id AND is_absolute_admin) THEN
 IF TG_OP='DELETE' OR NEW.email IS DISTINCT FROM OLD.email OR NEW.role IS DISTINCT FROM OLD.role OR NEW.banned IS DISTINCT FROM OLD.banned THEN RAISE EXCEPTION 'O Admin principal é protegido' USING ERRCODE='42501';END IF;
END IF;IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;END;$$;
REVOKE ALL ON FUNCTION private.protect_auth_principal() FROM PUBLIC;
CREATE TRIGGER protect_plan_action_admin BEFORE DELETE OR UPDATE ON neon_auth.user FOR EACH ROW EXECUTE FUNCTION private.protect_auth_principal();
