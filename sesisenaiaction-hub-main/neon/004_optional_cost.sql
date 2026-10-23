-- Apply only to the experimental Neon branch after 001..003.
-- Existing zero values stay unchanged: their original meaning is unknown.
BEGIN;
ALTER TABLE public.action_plans ALTER COLUMN estimated_cost DROP NOT NULL;
ALTER TABLE public.action_plans ALTER COLUMN estimated_cost DROP DEFAULT;
COMMIT;
