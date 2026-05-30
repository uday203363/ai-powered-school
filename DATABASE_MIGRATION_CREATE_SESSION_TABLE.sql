-- Create the session table required by connect-pg-simple
-- This matches the default table name used by backend/src/app.ts

CREATE TABLE IF NOT EXISTS public."session" (
  sid varchar NOT NULL,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

ALTER TABLE public."session"
  ADD CONSTRAINT session_pkey PRIMARY KEY (sid);

CREATE INDEX IF NOT EXISTS "IDX_session_expire"
  ON public."session" (expire);
