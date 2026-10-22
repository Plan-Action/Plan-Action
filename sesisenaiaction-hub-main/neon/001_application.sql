-- Neon-only migration. Never apply to the original Supabase instance.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE TABLE public.departments(name text PRIMARY KEY CHECK(btrim(name)<>''));
INSERT INTO public.departments VALUES ('Administração'),('Tecnologia da Informação'),('Recursos Humanos'),('Educação'),('Segurança do Trabalho'),('Mecânica'),('Eletrônica'),('Automação'),('Logística'),('Gestão');
CREATE TABLE public.profiles(
 id uuid PRIMARY KEY REFERENCES neon_auth.user(id) ON DELETE RESTRICT,
 full_name text NOT NULL CHECK(length(btrim(full_name)) BETWEEN 1 AND 200), email text NOT NULL UNIQUE,
 role text NOT NULL CHECK(role IN ('admin','coordenador','professor')),
 is_absolute_admin boolean NOT NULL DEFAULT false,
 department text REFERENCES public.departments(name),avatar_url text,phone text,school text DEFAULT 'Blumenau - SC/BR',
 enabled boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT is_absolute_admin OR (role='admin' AND enabled)),CHECK(role<>'admin' OR department IS NULL));
CREATE UNIQUE INDEX only_one_absolute_admin ON public.profiles(is_absolute_admin) WHERE is_absolute_admin;
CREATE TABLE private.password_onboarding(user_id uuid PRIMARY KEY REFERENCES public.profiles(id),initial_hash text NOT NULL);
CREATE TABLE public.action_plans(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 300),
 description text NOT NULL,objective text NOT NULL,expected_result text NOT NULL DEFAULT '',where_location text NOT NULL DEFAULT '',how_to_execute text NOT NULL DEFAULT '',
 estimated_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK(estimated_cost>=0),start_date date NOT NULL,end_date date NOT NULL CHECK(end_date>=start_date),
 status text NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','in_progress','completed','cancelled')),
 priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
 category text CHECK(category IS NULL OR category IN ('infraestrutura','pedagogico','qualidade','recursos_humanos','manutencao','ti')),
 department text NOT NULL REFERENCES public.departments(name),created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.plan_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),plan_id uuid NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
 professor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,assigned_at timestamptz NOT NULL DEFAULT now(),UNIQUE(plan_id,professor_id));
CREATE INDEX profiles_department_idx ON public.profiles(department);
CREATE INDEX plans_department_idx ON public.action_plans(department);
CREATE INDEX assignments_member_idx ON public.plan_assignments(professor_id,plan_id);

CREATE FUNCTION private.caller_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid();$$;
CREATE FUNCTION private.principal() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND enabled AND is_absolute_admin AND role='admin');$$;
CREATE FUNCTION private.caller_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT role FROM public.profiles WHERE id=auth.uid() AND enabled;$$;
CREATE FUNCTION private.ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND enabled)
 AND NOT EXISTS(SELECT 1 FROM private.password_onboarding o WHERE o.user_id=auth.uid() AND NOT EXISTS(
 SELECT 1 FROM neon_auth.account a WHERE a."userId"=o.user_id AND a."providerId"='credential' AND a.password IS DISTINCT FROM o.initial_hash
 AND to_timestamp(COALESCE((auth.session()->>'iat')::double precision,0)) >= date_trunc('second',a."updatedAt") ));$$;
CREATE FUNCTION private.department_access(target text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND enabled AND (role='admin' OR (target IS NOT NULL AND department=target)));$$;
CREATE FUNCTION private.plan_access(target uuid,manage boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.ready() AND EXISTS(SELECT 1 FROM public.action_plans p WHERE p.id=target AND private.department_access(p.department)
 AND (private.caller_role() IN ('admin','coordenador') OR (NOT manage AND EXISTS(SELECT 1 FROM public.plan_assignments WHERE plan_id=p.id AND professor_id=auth.uid()))));$$;
CREATE FUNCTION public.password_setup_complete() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.ready();$$;
CREATE FUNCTION public.profile_auth_state() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND enabled)
 THEN jsonb_build_object('enrolled',true,'must_change_password',NOT private.ready()) ELSE jsonb_build_object('enrolled',false) END;$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.departments,public.action_plans,public.plan_assignments FROM PUBLIC,anonymous,authenticated;
GRANT SELECT ON public.profiles,public.departments,public.action_plans,public.plan_assignments TO authenticated;
GRANT UPDATE(full_name) ON public.profiles TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.action_plans,public.plan_assignments TO authenticated;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING(private.ready() AND enabled AND (id=auth.uid() OR private.department_access(department)));
CREATE POLICY profile_write ON public.profiles FOR UPDATE TO authenticated USING(private.ready() AND id=auth.uid() AND NOT is_absolute_admin) WITH CHECK(id=auth.uid());
CREATE POLICY department_read ON public.departments FOR SELECT TO authenticated USING(private.ready() AND private.department_access(name));
CREATE POLICY plan_read ON public.action_plans FOR SELECT TO authenticated USING(private.plan_access(id));
CREATE POLICY plan_insert ON public.action_plans FOR INSERT TO authenticated WITH CHECK(private.ready() AND private.caller_role() IN ('admin','coordenador') AND private.department_access(department) AND created_by=auth.uid());
CREATE POLICY plan_update ON public.action_plans FOR UPDATE TO authenticated USING(private.plan_access(id,true)) WITH CHECK(private.department_access(department));
CREATE POLICY plan_delete ON public.action_plans FOR DELETE TO authenticated USING(private.plan_access(id,true));
CREATE POLICY assignment_read ON public.plan_assignments FOR SELECT TO authenticated USING(private.plan_access(plan_id));
CREATE POLICY assignment_insert ON public.plan_assignments FOR INSERT TO authenticated WITH CHECK(private.plan_access(plan_id,true));
CREATE POLICY assignment_update ON public.plan_assignments FOR UPDATE TO authenticated USING(private.plan_access(plan_id,true)) WITH CHECK(private.plan_access(plan_id,true));
CREATE POLICY assignment_delete ON public.plan_assignments FOR DELETE TO authenticated USING(private.plan_access(plan_id,true));

CREATE FUNCTION private.protect_profile() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
 BEGIN IF OLD.is_absolute_admin AND (TG_OP='DELETE' OR NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'O Admin principal é protegido' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.department IS DISTINCT FROM OLD.department AND EXISTS(SELECT 1 FROM public.plan_assignments a JOIN public.action_plans p ON p.id=a.plan_id WHERE a.professor_id=OLD.id AND p.department IS DISTINCT FROM NEW.department) THEN RAISE EXCEPTION 'Remova as participações incompatíveis antes de transferir o usuário'; END IF;
 NEW.updated_at=now();RETURN NEW; END;$$;
CREATE TRIGGER protect_profile BEFORE UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.protect_profile();
CREATE FUNCTION private.check_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN IF NOT EXISTS(SELECT 1 FROM public.action_plans a JOIN public.profiles p ON p.department=a.department WHERE a.id=NEW.plan_id AND p.id=NEW.professor_id AND p.enabled) THEN RAISE EXCEPTION 'Participante de outro departamento'; END IF; RETURN NEW; END;$$;
CREATE TRIGGER check_assignment BEFORE INSERT OR UPDATE ON public.plan_assignments FOR EACH ROW EXECUTE FUNCTION private.check_assignment();
CREATE FUNCTION private.protect_plan() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
 BEGIN IF NEW.department IS DISTINCT FROM OLD.department OR NEW.created_by<>OLD.created_by THEN RAISE EXCEPTION 'Departamento e autor do plano não podem mudar';END IF;NEW.updated_at=now();RETURN NEW;END;$$;
CREATE TRIGGER protect_plan BEFORE UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION private.protect_plan();

CREATE FUNCTION public.set_user_department(target_user_id uuid,new_department text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN IF NOT private.ready() OR NOT private.principal() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';END IF;
 UPDATE public.profiles SET department=new_department WHERE id=target_user_id AND role<>'admin' AND NOT is_absolute_admin;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuário indisponível';END IF;END;$$;
CREATE FUNCTION public.enroll_user(target_user_id uuid,full_name text,user_role text,user_department text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN IF NOT private.ready() OR NOT private.principal() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';END IF;
 INSERT INTO public.profiles(id,full_name,email,role,department) SELECT id,enroll_user.full_name,email,user_role,CASE WHEN user_role='admin' THEN NULL ELSE user_department END FROM neon_auth.user WHERE id=target_user_id;
 INSERT INTO private.password_onboarding SELECT target_user_id,password FROM neon_auth.account WHERE "userId"=target_user_id AND "providerId"='credential';END;$$;
CREATE FUNCTION public.deactivate_user(target_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN IF NOT private.ready() OR private.caller_role()<>'admin' OR target_user_id=auth.uid() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';END IF;
 UPDATE public.profiles SET enabled=false WHERE id=target_user_id AND NOT is_absolute_admin AND (private.principal() OR role IN ('coordenador','professor'));
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuário protegido ou indisponível' USING ERRCODE='42501';END IF;END;$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.caller_id(),private.principal(),private.caller_role(),private.ready(),private.department_access(text),private.plan_access(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.profile_auth_state(),public.password_setup_complete(),public.set_user_department(uuid,text),public.enroll_user(uuid,text,text,text),public.deactivate_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_auth_state(),public.password_setup_complete(),public.set_user_department(uuid,text),public.enroll_user(uuid,text,text,text),public.deactivate_user(uuid) TO authenticated;
COMMIT;
