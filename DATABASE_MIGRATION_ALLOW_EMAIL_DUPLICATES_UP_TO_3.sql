-- Allow the same email to be used up to three times in users registration.
-- Run this in your database before relying on the new application-level limit.

DO $$
DECLARE
  constraint_record record;
  index_record record;
BEGIN
  -- Drop unique constraints that enforce email uniqueness on users.
  FOR constraint_record IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'users'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'email'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
  END LOOP;

  -- Drop unique indexes on email if they exist outside a named constraint.
  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(email)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
  END LOOP;
END $$;