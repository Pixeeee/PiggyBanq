import importlib.util
import io
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid


class BackupVerificationTest(unittest.TestCase):
    def test_comparison_preserves_tables_rows_duplicates_and_sequences(self):
        path = Path(__file__).resolve().parents[1] / 'scripts/database_backup.py'
        self.assertTrue(path.is_file(), 'database backup implementation is missing')
        spec = importlib.util.spec_from_file_location('database_backup', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        original = 'COPY public."User" (id, name) FROM stdin;\n1\tAlice\n2\tBob\\nSmith\n\\.\n'
        shuffled = 'COPY public."User" (id, name) FROM stdin;\n2\tBob\\nSmith\n1\tAlice\n\\.\n'
        signature = lambda text: module.data_signature(io.StringIO(text))
        self.assertEqual(signature(original), signature(shuffled))
        self.assertNotEqual(signature(original), signature(original.replace('Alice', 'Mallory')))
        self.assertNotEqual(signature(original), signature(original.replace('1\tAlice\n', '')))
        self.assertNotEqual(signature(original), signature(original.replace('1\tAlice\n', '1\tAlice\n1\tAlice\n')))
        self.assertNotEqual(signature(original), signature(original.replace('public."User"', 'public."Session"')))
        self.assertNotEqual(signature(original), signature(original.replace('(id, name)', '(id, password)')))
        sequence = "SELECT pg_catalog.setval('public.sample_id_seq', 42, true);\n"
        self.assertNotEqual(signature(original), signature(original + sequence))
        with self.assertRaises(ValueError):
            signature(original.replace('\\.\n', ''))
        with self.assertRaises(ValueError):
            signature('-- an empty or invalid dump\n')

    def test_supabase_backup_requires_private_configuration_verified_tls_and_session_pooling(self):
        path = Path(__file__).resolve().parents[1] / 'scripts/database_backup.py'
        spec = importlib.util.spec_from_file_location('database_backup_remote', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertTrue(hasattr(module, 'load_supabase_config'), 'Supabase backup support must be implemented')
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / 'supabase-backup.env'
            valid = 'SUPABASE_BACKUP_URL="postgresql://piggybanq_backup.project:encoded%40password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=verify-full"\n'
            config.write_text(valid)
            config.chmod(0o600)
            result = module.load_supabase_config(config)
            self.assertEqual(result['environment']['PGPASSWORD'], 'encoded@password')
            self.assertEqual(result['environment']['PGSSLMODE'], 'verify-full')
            self.assertEqual(result['schema'], 'piggybanq')
            self.assertEqual(result['image'], 'postgres:17-alpine')
            for invalid in [valid.replace('verify-full', 'require'), valid.replace(':5432/', ':6543/'),
                            valid.replace('aws-0-ap-southeast-1.pooler.supabase.com', 'attacker.example'),
                            valid + 'SUPABASE_BACKUP_SCHEMA="public; DROP SCHEMA public"\n',
                            valid + 'SUPABASE_BACKUP_PG_MAJOR="17; arbitrary-command"\n']:
                config.write_text(invalid)
                with self.assertRaises(ValueError):
                    module.load_supabase_config(config)
            config.write_text(valid)
            config.chmod(0o644)
            with self.assertRaises(PermissionError):
                module.load_supabase_config(config)

    @unittest.skipUnless(os.environ.get('RUN_DATABASE_BACKUP_TESTS') == '1', 'requires local Docker PostgreSQL')
    def test_encrypted_backup_restores_populated_database_and_rejects_corruption(self):
        path = Path(__file__).resolve().parents[1] / 'scripts/database_backup.py'
        spec = importlib.util.spec_from_file_location('database_backup_integration', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        database = 'piggybanq_backup_fixture_' + uuid.uuid4().hex
        module.postgres('createdb', '-U', 'postgres', '--template=template0', database)
        try:
            module.postgres('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database,
                input='''CREATE TABLE users (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name text);
                  CREATE TABLE allocations (user_id bigint REFERENCES users(id), amount bigint, details jsonb);
                  INSERT INTO users(name) VALUES ('Savings 🐷'), (E'Name\\nwith newline');
                  INSERT INTO allocations VALUES (1, 9007199254740993, '{"tags":["PHP",null]}'),
                    (1, 9007199254740993, '{"tags":["PHP",null]}'), (2, -42, null);''', text=True,
                stdout=subprocess.DEVNULL)
            with tempfile.TemporaryDirectory() as directory:
                module.BACKUPS = Path(directory)
                module.DATABASE = database
                work = Path(directory) / 'work'
                work.mkdir(mode=0o700)
                module.backup(work)
                archives = list(Path(directory).glob('*.dump.gpg'))
                self.assertEqual(len(archives), 1)
                self.assertTrue(Path(str(archives[0]) + '.verified').is_file())
                corrupt = Path(directory) / 'corrupt.dump.gpg'
                corrupt.write_bytes(archives[0].read_bytes()[:24])
                corrupt_work = Path(directory) / 'corrupt-work'
                corrupt_work.mkdir(mode=0o700)
                with self.assertRaises(subprocess.CalledProcessError):
                    module.verify(corrupt, corrupt_work)
        finally:
            module.postgres('dropdb', '-U', 'postgres', database)

    @unittest.skipUnless(os.environ.get('RUN_DATABASE_BACKUP_TESTS') == '1', 'requires Docker PostgreSQL 17')
    def test_remote_transport_encrypts_and_restores_to_isolated_matching_server(self):
        import time
        path = Path(__file__).resolve().parents[1] / 'scripts/database_backup.py'
        spec = importlib.util.spec_from_file_location('database_backup_remote_integration', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        name = 'piggybanq-backup-source-' + uuid.uuid4().hex
        password = uuid.uuid4().hex
        subprocess.run(['docker', 'run', '--detach', '--rm', '--name', name,
                        '-p', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', 'postgres:17-alpine'],
                       env=dict(os.environ, POSTGRES_PASSWORD=password), check=True, stdout=subprocess.DEVNULL)
        try:
            for _ in range(60):
                if subprocess.run(['docker', 'exec', name, 'pg_isready', '-U', 'postgres'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                    break
                time.sleep(1)
            port = subprocess.check_output(['docker', 'port', name, '5432'], text=True).strip().split(':')[-1]
            root = path.parents[1]
            role_environment = dict(os.environ, PIGGYBANQ_APP_PASSWORD=uuid.uuid4().hex,
                                    PIGGYBANQ_BACKUP_PASSWORD=uuid.uuid4().hex)
            subprocess.run(['docker', 'exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                           input='CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;',
                           text=True, check=True, stdout=subprocess.DEVNULL)
            roles = (root / 'server/prisma/supabase-roles.sql').read_text()
            def provision_roles():
                subprocess.run(['docker', 'exec', '-i', '--env', 'PIGGYBANQ_APP_PASSWORD',
                                '--env', 'PIGGYBANQ_BACKUP_PASSWORD', name, 'psql', '-U', 'postgres'],
                               input=roles, text=True, env=role_environment, check=True, stdout=subprocess.DEVNULL)
            provision_roles()
            url = f'postgresql://postgres:{password}@127.0.0.1:{port}/postgres?schema=piggybanq'
            subprocess.run(['node', 'server/node_modules/prisma/build/index.js', 'migrate', 'deploy',
                            '--schema', 'server/prisma/schema.prisma'], cwd=root,
                           env=dict(os.environ, DATABASE_URL=url, DIRECT_URL=url), check=True, stdout=subprocess.DEVNULL)
            provision_roles()
            subprocess.run(['docker', 'exec', '-i', name, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                           input='CREATE TABLE piggybanq.fixture (id serial, value text); '
                                 "INSERT INTO piggybanq.fixture(value) VALUES ('encrypted remote fixture');",
                           text=True, check=True, stdout=subprocess.DEVNULL)
            checks = """SELECT
              has_table_privilege('piggybanq_app', 'piggybanq."User"', 'SELECT,INSERT,UPDATE,DELETE'),
              NOT has_table_privilege('piggybanq_app', 'piggybanq."_prisma_migrations"', 'SELECT'),
              NOT has_table_privilege('piggybanq_app', 'piggybanq."AuditLogEntry"', 'DELETE'),
              has_table_privilege('piggybanq_backup', 'piggybanq."User"', 'SELECT'),
              NOT has_table_privilege('piggybanq_backup', 'piggybanq."User"', 'INSERT'),
              NOT has_schema_privilege('anon', 'piggybanq', 'USAGE'),
              (SELECT count(*) = 0 FROM pg_tables WHERE schemaname = 'public');"""
            result = subprocess.check_output(['docker', 'exec', '-i', name, 'psql', '-At', '-U', 'postgres'],
                                             input=checks, text=True).strip()
            self.assertEqual(result, 't|t|t|t|t|t|t')
            # Only this disposable loopback fixture bypasses the production TLS/hostname parser.
            config = dict(image='postgres:17-alpine', schema='piggybanq', environment=dict(
                PGHOST='127.0.0.1', PGPORT=port, PGDATABASE='postgres', PGUSER='postgres',
                PGPASSWORD=password, PGSSLMODE='disable'))
            with tempfile.TemporaryDirectory() as directory:
                module.BACKUPS = Path(directory)
                work = Path(directory) / 'work'
                work.mkdir(mode=0o700)
                module.backup(work, config)
                archive, = Path(directory).glob('piggybanq_supabase_*.dump.gpg')
                self.assertTrue(Path(str(archive) + '.verified').is_file())
                self.assertNotIn(b'encrypted remote fixture', archive.read_bytes())
        finally:
            subprocess.run(['docker', 'rm', '--force', name], check=True, stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    unittest.main()
