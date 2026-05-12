-- Prerequisite for supabase-realtime service.
-- The supabase/postgres image creates the 'realtime' schema but NOT '_realtime'
-- (with underscore), which is the internal schema used by the realtime binary
-- for its own Ecto migrations. This must exist before supabase-realtime starts.
CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
