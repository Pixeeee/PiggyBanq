-- Local Docker setup. Pass PIGGYBANQ_APP_PASSWORD through the environment,
-- never a command-line argument. Run as the migration owner (postgres).
\set ON_ERROR_STOP on
\getenv app_password PIGGYBANQ_APP_PASSWORD
SELECT length(:'app_password') >= 32 AS valid_password \gset
\if :valid_password
\else
  \echo 'PIGGYBANQ_APP_PASSWORD must contain at least 32 characters.'
  \quit 1
\endif
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'piggybanq_app') THEN
    CREATE ROLE piggybanq_app LOGIN;
  END IF;
END $$;
ALTER ROLE piggybanq_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
ALTER ROLE piggybanq_app SET search_path = pg_catalog, public;
ALTER ROLE piggybanq_app SET statement_timeout = '30s';
ALTER ROLE piggybanq_app SET idle_in_transaction_session_timeout = '30s';

REVOKE ALL ON DATABASE piggybanq FROM PUBLIC;
REVOKE ALL ON DATABASE piggybanq FROM piggybanq_app;
GRANT CONNECT ON DATABASE piggybanq TO piggybanq_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM piggybanq_app;
GRANT USAGE ON SCHEMA public TO piggybanq_app;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM piggybanq_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO piggybanq_app;
REVOKE ALL ON TABLE "_prisma_migrations" FROM piggybanq_app;
REVOKE UPDATE, DELETE ON TABLE "AuditLogEntry" FROM piggybanq_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM piggybanq_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO piggybanq_app;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO piggybanq_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO piggybanq_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
