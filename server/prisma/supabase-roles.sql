-- Run as postgres through the session connection, before AND after migrations.
-- Supply generated passwords through the environment, never command-line args.
\set ON_ERROR_STOP on
\getenv app_password PIGGYBANQ_APP_PASSWORD
\getenv backup_password PIGGYBANQ_BACKUP_PASSWORD
SELECT length(:'app_password') >= 32 AND length(:'backup_password') >= 32
  AND :'app_password' <> :'backup_password' AS valid_passwords \gset
\if :valid_passwords
\else
  \echo 'Two distinct passwords of at least 32 characters are required.'
  \quit 1
\endif
BEGIN;
CREATE SCHEMA IF NOT EXISTS piggybanq AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA piggybanq FROM PUBLIC;
-- Supabase browser roles must never reach the application schema.
REVOKE ALL ON SCHEMA piggybanq FROM anon, authenticated, service_role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'piggybanq_app') THEN
    CREATE ROLE piggybanq_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'piggybanq_backup') THEN
    CREATE ROLE piggybanq_backup LOGIN;
  END IF;
END $$;
ALTER ROLE piggybanq_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
ALTER ROLE piggybanq_backup WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS PASSWORD :'backup_password';
ALTER ROLE piggybanq_app SET search_path = pg_catalog, piggybanq;
ALTER ROLE piggybanq_app SET statement_timeout = '30s';
ALTER ROLE piggybanq_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE piggybanq_backup SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE postgres TO piggybanq_app, piggybanq_backup;
GRANT USAGE ON SCHEMA piggybanq TO piggybanq_app, piggybanq_backup;
REVOKE ALL ON ALL TABLES IN SCHEMA piggybanq FROM piggybanq_app, piggybanq_backup, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA piggybanq TO piggybanq_app;
GRANT SELECT ON ALL TABLES IN SCHEMA piggybanq TO piggybanq_backup;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA piggybanq FROM piggybanq_app, piggybanq_backup;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA piggybanq TO piggybanq_app;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA piggybanq TO piggybanq_backup;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA piggybanq FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA piggybanq
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO piggybanq_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA piggybanq
  GRANT SELECT ON TABLES TO piggybanq_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA piggybanq
  GRANT USAGE ON SEQUENCES TO piggybanq_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA piggybanq
  GRANT SELECT ON SEQUENCES TO piggybanq_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA piggybanq REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- Migrations create these tables after initial role provisioning.
SELECT 'REVOKE ALL ON piggybanq."_prisma_migrations" FROM piggybanq_app'
  WHERE to_regclass('piggybanq."_prisma_migrations"') IS NOT NULL \gexec
SELECT 'REVOKE UPDATE, DELETE ON piggybanq."AuditLogEntry" FROM piggybanq_app'
  WHERE to_regclass('piggybanq."AuditLogEntry"') IS NOT NULL \gexec
COMMIT;
