BEGIN;
CREATE TABLE public.regional_units(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),enabled boolean NOT NULL DEFAULT true);
CREATE UNIQUE INDEX regional_unit_name ON public.regional_units(lower(btrim(name)));
INSERT INTO public.regional_units(name) VALUES ('Blumenau'),('Timbó'),('Indaial'),('Pomerode');
CREATE TABLE public.regional_courses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),enabled boolean NOT NULL DEFAULT true);
CREATE UNIQUE INDEX regional_course_name ON public.regional_courses(lower(btrim(name)));
CREATE TABLE public.regional_offerings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),unit_id uuid NOT NULL REFERENCES public.regional_units(id) ON DELETE RESTRICT,course_id uuid NOT NULL REFERENCES public.regional_courses(id) ON DELETE RESTRICT,enabled boolean NOT NULL DEFAULT true,UNIQUE(unit_id,course_id));
CREATE TABLE public.regional_classes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),offering_id uuid NOT NULL REFERENCES public.regional_offerings(id) ON DELETE RESTRICT,code text NOT NULL CHECK(length(btrim(code)) BETWEEN 1 AND 80),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),department text NOT NULL REFERENCES public.departments(name) ON DELETE RESTRICT,enabled boolean NOT NULL DEFAULT true);
CREATE UNIQUE INDEX regional_class_code ON public.regional_classes(offering_id,lower(btrim(code)));
CREATE INDEX regional_class_department ON public.regional_classes(department,offering_id);
CREATE INDEX regional_offering_course ON public.regional_offerings(course_id,unit_id);
CREATE TABLE public.regional_supervisors(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),class_id uuid NOT NULL REFERENCES public.regional_classes(id) ON DELETE RESTRICT,profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,profile_name text NOT NULL,enabled boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(class_id,profile_id));
CREATE INDEX regional_supervisors_profile ON public.regional_supervisors(profile_id,class_id);
ALTER TABLE public.action_plans ADD COLUMN class_id uuid REFERENCES public.regional_classes(id) ON DELETE RESTRICT;
CREATE INDEX plan_class_idx ON public.action_plans(class_id);

CREATE FUNCTION private.regional_class_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.ready() AND EXISTS(SELECT 1 FROM public.regional_classes c WHERE c.id=target AND private.department_access(c.department));$$;
CREATE FUNCTION private.regional_offering_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.ready() AND (private.caller_role()='admin' OR EXISTS(SELECT 1 FROM public.regional_classes c WHERE c.offering_id=target AND private.department_access(c.department)));$$;
CREATE FUNCTION private.regional_unit_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.ready() AND (private.caller_role()='admin' OR EXISTS(SELECT 1 FROM public.regional_offerings o JOIN public.regional_classes c ON c.offering_id=o.id WHERE o.unit_id=target AND private.department_access(c.department)));$$;
CREATE FUNCTION private.regional_course_access(target uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.ready() AND (private.caller_role()='admin' OR EXISTS(SELECT 1 FROM public.regional_offerings o JOIN public.regional_classes c ON c.offering_id=o.id WHERE o.course_id=target AND private.department_access(c.department)));$$;
REVOKE ALL ON FUNCTION private.regional_class_access(uuid),private.regional_offering_access(uuid),private.regional_unit_access(uuid),private.regional_course_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.regional_class_access(uuid),private.regional_offering_access(uuid),private.regional_unit_access(uuid),private.regional_course_access(uuid) TO authenticated;

ALTER TABLE public.regional_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_supervisors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.regional_units,public.regional_courses,public.regional_offerings,public.regional_classes,public.regional_supervisors FROM PUBLIC,anonymous,authenticated;
GRANT SELECT ON public.regional_units,public.regional_courses,public.regional_offerings,public.regional_classes,public.regional_supervisors TO authenticated;
CREATE POLICY unit_read ON public.regional_units FOR SELECT TO authenticated USING(private.regional_unit_access(id));
CREATE POLICY course_read ON public.regional_courses FOR SELECT TO authenticated USING(private.regional_course_access(id));
CREATE POLICY offering_read ON public.regional_offerings FOR SELECT TO authenticated USING(private.regional_offering_access(id));
CREATE POLICY class_read ON public.regional_classes FOR SELECT TO authenticated USING(private.regional_class_access(id));
CREATE POLICY supervisor_read ON public.regional_supervisors FOR SELECT TO authenticated USING(private.regional_class_access(class_id));

CREATE FUNCTION public.regional_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('units',COALESCE((SELECT jsonb_agg(u ORDER BY u.name) FROM public.regional_units u),'[]'::jsonb),'courses',COALESCE((SELECT jsonb_agg(c ORDER BY c.name) FROM public.regional_courses c),'[]'::jsonb),'offerings',COALESCE((SELECT jsonb_agg(o ORDER BY o.id) FROM public.regional_offerings o),'[]'::jsonb),'classes',COALESCE((SELECT jsonb_agg(c ORDER BY c.code) FROM public.regional_classes c),'[]'::jsonb),'supervisors',COALESCE((SELECT jsonb_agg(s ORDER BY s.created_at) FROM public.regional_supervisors s),'[]'::jsonb));$$;

CREATE FUNCTION public.save_regional_entry(kind text,details jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid := NULLIF(details->>'id','')::uuid; saved uuid; active boolean := COALESCE((details->>'enabled')::boolean,true); linked_class uuid; linked_profile uuid;
BEGIN
 IF NOT private.ready() OR private.caller_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';END IF;
 IF kind='unit' THEN
  IF target IS NULL THEN INSERT INTO public.regional_units(name) VALUES(btrim(details->>'name')) RETURNING id INTO saved;
  ELSE UPDATE public.regional_units SET name=COALESCE(btrim(details->>'name'),name),enabled=active WHERE id=target RETURNING id INTO saved;END IF;
 ELSIF kind='course' THEN
  IF target IS NULL THEN INSERT INTO public.regional_courses(name) VALUES(btrim(details->>'name')) RETURNING id INTO saved;
  ELSE UPDATE public.regional_courses SET name=COALESCE(btrim(details->>'name'),name),enabled=active WHERE id=target RETURNING id INTO saved;END IF;
 ELSIF kind='offering' THEN
  IF target IS NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.regional_units WHERE id=(details->>'unit_id')::uuid AND enabled) OR NOT EXISTS(SELECT 1 FROM public.regional_courses WHERE id=(details->>'course_id')::uuid AND enabled) THEN RAISE EXCEPTION 'Cadastro inativo';END IF;
   INSERT INTO public.regional_offerings(unit_id,course_id) VALUES((details->>'unit_id')::uuid,(details->>'course_id')::uuid) RETURNING id INTO saved;
  ELSE UPDATE public.regional_offerings SET enabled=active WHERE id=target RETURNING id INTO saved;END IF;
 ELSIF kind='class' THEN
  IF target IS NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.regional_offerings o JOIN public.regional_units u ON u.id=o.unit_id JOIN public.regional_courses c ON c.id=o.course_id WHERE o.id=(details->>'offering_id')::uuid AND o.enabled AND u.enabled AND c.enabled) THEN RAISE EXCEPTION 'Oferta inativa';END IF;
   INSERT INTO public.regional_classes(offering_id,code,name,department) VALUES((details->>'offering_id')::uuid,btrim(details->>'code'),btrim(details->>'name'),details->>'department') RETURNING id INTO saved;
  ELSE UPDATE public.regional_classes SET code=COALESCE(btrim(details->>'code'),code),name=COALESCE(btrim(details->>'name'),name),enabled=active WHERE id=target RETURNING id INTO saved;END IF;
 ELSIF kind='supervisor' THEN
  IF target IS NULL THEN linked_class:=(details->>'class_id')::uuid;linked_profile:=(details->>'profile_id')::uuid;
  ELSE SELECT class_id,profile_id INTO linked_class,linked_profile FROM public.regional_supervisors WHERE id=target;END IF;
  IF target IS NULL OR active THEN
   IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.regional_classes c ON c.department=p.department WHERE p.id=linked_profile AND c.id=linked_class AND p.enabled AND p.role='coordenador' AND c.enabled) THEN RAISE EXCEPTION 'Supervisor incompatível';END IF;
  END IF;
  IF target IS NULL THEN INSERT INTO public.regional_supervisors(class_id,profile_id,profile_name) SELECT linked_class,p.id,p.full_name FROM public.profiles p WHERE p.id=linked_profile RETURNING id INTO saved;
  ELSE UPDATE public.regional_supervisors SET enabled=active WHERE id=target RETURNING id INTO saved;END IF;
 ELSE RAISE EXCEPTION 'Tipo inválido';END IF;
 IF saved IS NULL THEN RAISE EXCEPTION 'Cadastro indisponível';END IF;
 RETURN saved;
END;$$;
REVOKE ALL ON FUNCTION public.regional_catalog(),public.save_regional_entry(text,jsonb) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION public.regional_catalog(),public.save_regional_entry(text,jsonb) TO authenticated;

CREATE FUNCTION private.validate_plan_class() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.class_id IS NULL THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' AND NEW.class_id IS NOT DISTINCT FROM OLD.class_id AND NEW.department IS NOT DISTINCT FROM OLD.department THEN RETURN NEW;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.regional_classes c JOIN public.regional_offerings o ON o.id=c.offering_id JOIN public.regional_units u ON u.id=o.unit_id JOIN public.regional_courses r ON r.id=o.course_id WHERE c.id=NEW.class_id AND c.department=NEW.department AND c.enabled AND o.enabled AND u.enabled AND r.enabled) THEN RAISE EXCEPTION 'Turma incompatível ou inativa' USING ERRCODE='23514';END IF;
 RETURN NEW;
END;$$;
REVOKE ALL ON FUNCTION private.validate_plan_class() FROM PUBLIC;
CREATE TRIGGER validate_plan_class BEFORE INSERT OR UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION private.validate_plan_class();
CREATE OR REPLACE FUNCTION public.save_department_plan(details jsonb, participant_ids uuid[], target_plan_id uuid DEFAULT NULL)
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
 IF details ? 'class_id' THEN UPDATE public.action_plans SET class_id=NULLIF(details->>'class_id','')::uuid WHERE id=saved_id;END IF;
 RETURN saved_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_department_plan(jsonb,uuid[],uuid) FROM PUBLIC,anonymous;
GRANT EXECUTE ON FUNCTION public.save_department_plan(jsonb,uuid[],uuid) TO authenticated;

COMMIT;
