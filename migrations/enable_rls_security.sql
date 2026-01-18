-- Enable Row Level Security (RLS) for all tables in the public schema
-- This prevents unauthorized access via the Supabase Public API (anon key)
-- while allowing the Express server (direct Postgres connection) to function normally.

DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        -- Skip system tables if any was caught, but pg_tables already filters by schemaname
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', row.tablename);
        RAISE NOTICE 'RLS enabled for table: public.%', row.tablename;
    END LOOP;
END $$;

-- IMPORTANT: By enabling RLS without adding any policies, all access via the 
-- public Supabase API is denied by default. This is exactly what we want since 
-- the frontend communicates through the Express server, not directly with Supabase.
