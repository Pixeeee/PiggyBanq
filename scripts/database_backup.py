#!/usr/bin/env python3
"""Encrypted local and Supabase PostgreSQL backups, with a full isolated restore check."""

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
from pathlib import Path
import os
import re
import shlex
import ssl
import time
from urllib.parse import urlsplit, unquote, parse_qs
import subprocess
import tempfile
import uuid

CONTAINER = 'piggybanq-local-postgres'
DATABASE = os.environ.get('PIGGYBANQ_DATABASE', 'piggybanq')
BACKUPS = Path.home() / '.local/share/piggybanq-backups'
KEY = Path.home() / '.config/piggybanq/backup.passphrase'


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def postgres(*args, **kwargs):
    return run('docker', 'exec', '-i', CONTAINER, *args, **kwargs)


SUPABASE_CONFIG = Path.home() / '.config/piggybanq/supabase-backup.env'


def load_supabase_config(path=SUPABASE_CONFIG):
    if not path.is_file() or path.stat().st_mode & 0o077:
        raise PermissionError('Supabase backup configuration must exist with mode 600')
    values = {}
    allowed = {'SUPABASE_BACKUP_URL', 'SUPABASE_BACKUP_SCHEMA', 'SUPABASE_BACKUP_PG_MAJOR', 'SUPABASE_BACKUP_CA_FILE'}
    for line in path.read_text().splitlines():
        tokens = shlex.split(line, comments=True)
        if not tokens:
            continue
        if len(tokens) != 1 or '=' not in tokens[0]:
            raise ValueError('Invalid backup configuration line')
        key, value = tokens[0].split('=', 1)
        if key not in allowed or key in values:
            raise ValueError('Unknown or duplicate backup configuration key')
        values[key] = value
    try:
        url = urlsplit(values['SUPABASE_BACKUP_URL'])
        query = parse_qs(url.query, strict_parsing=True)
        host = url.hostname or ''
        if (url.scheme not in ('postgres', 'postgresql') or not url.username or not url.password
                or not host.endswith(('.supabase.com', '.supabase.co'))
                or url.port not in (None, 5432) or not url.path.strip('/') or url.fragment
                or query != {'sslmode': ['verify-full']}):
            raise ValueError()
    except (KeyError, ValueError):
        raise ValueError('Supabase backup requires a Supabase direct/session URL on port 5432 with sslmode=verify-full') from None
    schema = values.get('SUPABASE_BACKUP_SCHEMA', 'piggybanq')
    major = values.get('SUPABASE_BACKUP_PG_MAJOR', '17')
    if not re.fullmatch('[a-z][a-z0-9_]{0,62}', schema) or major not in ('17', '18'):
        raise ValueError('Invalid backup schema or PostgreSQL major version')
    environment = dict(PGHOST=host, PGPORT='5432', PGDATABASE=unquote(url.path[1:]),
                       PGUSER=unquote(url.username), PGPASSWORD=unquote(url.password),
                       PGSSLMODE='verify-full', PGSSLROOTCERT='system', PGCONNECT_TIMEOUT='20')
    result = dict(environment=environment, schema=schema, image=f'postgres:{major}-alpine')
    if values.get('SUPABASE_BACKUP_CA_FILE'):
        ca = Path(values['SUPABASE_BACKUP_CA_FILE']).resolve(strict=True)
        if ',' in str(ca):
            raise ValueError('CA file path must not contain commas')
        ssl.create_default_context(cafile=str(ca))
        environment['PGSSLROOTCERT'] = '/supabase-ca.crt'
        result['ca_file'] = str(ca)
    return result


@contextmanager
def isolated_postgres(image):
    name = 'piggybanq-restore-' + uuid.uuid4().hex
    environment = dict(os.environ, POSTGRES_PASSWORD=uuid.uuid4().hex)
    run('docker', 'run', '--detach', '--rm', '--network', 'none', '--name', name,
        '--env', 'POSTGRES_PASSWORD', image, env=environment, stdout=subprocess.DEVNULL)
    def execute(*args, **kwargs):
        return run('docker', 'exec', '-i', name, *args, **kwargs)
    try:
        for _ in range(60):
            ready = subprocess.run(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise TimeoutError('Isolated restore database did not become ready')
        yield execute
    finally:
        run('docker', 'rm', '--force', name, stdout=subprocess.DEVNULL)


def data_signature(stream):
    """Compare COPY data independently of physical row order, including duplicates."""
    tables = {}
    sequences = []
    header = None
    rows = []
    for line in stream:
        if header is not None:
            if line.rstrip('\n') == '\\.':
                if header in tables:
                    raise ValueError('Duplicate COPY section')
                digest = hashlib.sha256(b''.join(sorted(rows))).hexdigest()
                tables[header] = (len(rows), digest)
                header = None
            else:
                rows.append(hashlib.sha256(line.encode()).digest())
        elif line.startswith('COPY ') and line.rstrip().endswith('FROM stdin;'):
            header = line.rstrip('\n')
            rows = []
        elif line.startswith('SELECT pg_catalog.setval('):
            sequences.append(line.rstrip('\n'))
    if header is not None or not tables:
        raise ValueError('Incomplete dump or no table data sections')
    return tables, sorted(sequences)


def verify(archive, work, execute=None):
    execute = execute or postgres
    restored = 'piggybanq_restore_check_' + uuid.uuid4().hex
    plain = work / 'restore.dump'
    run('gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase-file', str(KEY),
        '--output', str(plain), '--decrypt', str(archive))
    created = False
    try:
        execute('createdb', '-U', 'postgres', '--template=template0', restored)
        created = True
        with plain.open('rb') as source:
            execute('pg_restore', '-U', 'postgres', '-d', restored,
                     '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', stdin=source)
        expected = work / 'expected.sql'
        actual = work / 'actual.sql'
        with plain.open('rb') as source, expected.open('wb') as output:
            execute('pg_restore', '--data-only', '--no-owner', '--no-acl',
                     '--file=-', stdin=source, stdout=output)
        with actual.open('wb') as output:
            execute('pg_dump', '-U', 'postgres', '-d', restored,
                     '--data-only', '--no-owner', '--no-acl', stdout=output)
        with expected.open(encoding='utf-8') as left, actual.open(encoding='utf-8') as right:
            expected_data = data_signature(left)
            if expected_data != data_signature(right):
                raise ValueError('Restore data does not match the backup')
        tables = expected_data[0]
        print(f'Restore verified: {len(tables)} tables, {sum(count for count, _ in tables.values())} rows.')
    finally:
        if created:
            execute('dropdb', '-U', 'postgres', restored)


def backup(work, config=None):
    plain = work / 'backup.dump'
    with plain.open('wb') as output:
        if config:
            environment = dict(os.environ, **config['environment'])
            command = ['docker', 'run', '--rm', '-i', '--network', 'host']
            if config.get('ca_file'):
                command.extend(['--mount', f"type=bind,source={config['ca_file']},target=/supabase-ca.crt,readonly"])
            for name in config['environment']:
                command.extend(['--env', name])
            run(*command, config['image'], 'pg_dump', '--format=custom', '--no-owner',
                '--no-acl', '--schema=' + config['schema'], env=environment, stdout=output)
        else:
            postgres('pg_dump', '-U', 'postgres', '-d', DATABASE, '--format=custom', stdout=output)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    prefix = 'piggybanq_supabase' if config else DATABASE
    archive = BACKUPS / f'{prefix}_{stamp}.dump.gpg'
    encrypted = work / 'backup.dump.gpg'
    run('gpg', '--batch', '--pinentry-mode', 'loopback', '--passphrase-file', str(KEY),
        '--symmetric', '--cipher-algo', 'AES256', '--output', str(encrypted), str(plain))
    encrypted.replace(archive)
    print(f'Backup saved: {archive}', flush=True)
    if config:
        with isolated_postgres(config['image']) as execute:
            verify(archive, work, execute)
    else:
        verify(archive, work)
    report = archive.with_suffix(archive.suffix + '.verified')
    with archive.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    report.write_text(f'SHA256 {digest}\n'
                      f'Restored and compared successfully at {datetime.now(timezone.utc).isoformat()}\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore-test'])
    parser.add_argument('archive', nargs='?', type=Path)
    parser.add_argument('--target', choices=['local', 'supabase', 'all'], default='local')
    args = parser.parse_args()
    if (args.action == 'restore-test') != (args.archive is not None):
        parser.error('restore-test requires an archive; backup takes no archive')
    if args.action == 'restore-test' and args.target == 'all':
        parser.error('restore-test requires one target')
    config = load_supabase_config() if args.target in ('supabase', 'all') else None
    os.umask(0o077)
    if not KEY.is_file() or KEY.stat().st_mode & 0o077:
        raise PermissionError(f'A private encryption key file (mode 600) is required: {KEY}')
    BACKUPS.mkdir(parents=True, exist_ok=True, mode=0o700)
    if BACKUPS.stat().st_mode & 0o077:
        raise PermissionError(f'Backup directory must be private (mode 700): {BACKUPS}')
    with (BACKUPS / '.backup.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with tempfile.TemporaryDirectory(prefix='.working-', dir=BACKUPS) as directory:
            work = Path(directory)
            if args.action == 'backup':
                if args.target in ('local', 'all'):
                    local = work / 'local'
                    local.mkdir()
                    backup(local)
                if config:
                    remote = work / 'supabase'
                    remote.mkdir()
                    backup(remote, config)
            elif config:
                with isolated_postgres(config['image']) as execute:
                    verify(args.archive.resolve(strict=True), work, execute)
            else:
                verify(args.archive.resolve(strict=True), work)


if __name__ == '__main__':
    main()
