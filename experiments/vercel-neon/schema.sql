-- Apply only to jolly-term-63095863 / br-spring-cloud-b7sa5137 / plan_action_test.
CREATE TABLE IF NOT EXISTS public.migration_probe (id uuid PRIMARY KEY, label text NOT NULL CHECK (label = 'synthetic-connectivity-test'), created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.migration_probe(id,label) VALUES ('8aa83f1f-9c35-46b8-a456-193bd6e5960b','synthetic-connectivity-test') ON CONFLICT (id) DO NOTHING;
