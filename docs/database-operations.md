# Local database security and recovery

This setup secures the existing local `piggybanq` database in Docker container
`piggybanq-local-postgres`. It does not rename tables, change wallet authentication,
or configure a hosted production database.

## Database accounts

- `piggybanq_app` is the API login. It can select, insert, update and delete
  application records. Audit events allow only select and insert. It cannot access
  `_prisma_migrations`, truncate tables, create schemas/tables, manage roles or
  databases, replicate, or bypass row-level security. Application ownership checks
  remain necessary: this role is shared by API requests, not individual users.
- `postgres` remains the local migration owner. Credentials live in the ignored
  `server/.env.migrations` file, separate from `server/.env`. Both files have mode
  `600`. The runtime environment contains only restricted database URLs.
- Existing data, ownership, constraints and migration history are unchanged.

`server/prisma/runtime-role.sql` provisions the permissions as `postgres`, inside
one transaction. It expects a generated password of at least 32 characters in
`PIGGYBANQ_APP_PASSWORD`. For this local container, run it with:

```sh
docker exec -i -e PIGGYBANQ_APP_PASSWORD piggybanq-local-postgres \
  psql -X -U postgres -d piggybanq < server/prisma/runtime-role.sql
```

For a fresh installation, first copy `server/.env.migrations.example` to
`server/.env.migrations`, replace both URLs with the database owner's credentials,
restrict the file to mode `600`, and run `db:migrate` to create the application
tables. Only then apply `runtime-role.sql` and configure the runtime URLs.

Keep the password in a private environment rather than command-line arguments,
and configure the matching URL in `server/.env`. Do not copy real credentials
into documentation or commit them. Future objects created by `postgres` receive
runtime data permissions through default privileges; review grants after migrations,
especially for new sensitive tables or objects created by a different owner.

Run migrations with the separate administrator environment:

```sh
pnpm --filter @piggybanq/server db:migrate
```

Coordinate later table renames with this role script and the security test.
For an operational rollback of the role switch, stop the API, restore its previous
database URLs from the migration environment, then restart. This temporarily
restores administrator access to the API; it is recovery only, not normal operation.

## Encrypted backups

```sh
python3 scripts/database_backup.py backup
python3 scripts/database_backup.py restore-test /absolute/path/to/backup.dump.gpg
```

The backup command also performs a full restore test. It:

1. Takes a consistent PostgreSQL custom-format dump.
2. Encrypts it using GnuPG AES-256, then publishes the archive atomically.
3. Decrypts and restores into a new `piggybanq_restore_check_<random>` database
   using `--exit-on-error --single-transaction`.
4. Compares every COPY section's columns and row contents, preserving duplicate
   counts and ignoring physical row order, and compares sequence values.
5. Drops only that disposable database and removes temporary decrypted files.
6. Writes a `.verified` report with the encrypted file's SHA-256 after success.

No restore command targets the live database. Failures return a nonzero exit code;
an archive without its `.verified` report must not be treated as verified. A lock
prevents concurrent maintenance runs. Temporary restore databases can remain if
the machine or process is forcibly stopped; inspect those individually before cleanup.

Locations:

- Archives/reports: `~/.local/share/piggybanq-backups/` (directory mode `700`).
- Encryption passphrase: `~/.config/piggybanq/backup.passphrase` (file mode `600`).
- No backup expiry is configured; monitor disk usage and set retention deliberately.

Store a separate recovery copy of the encryption passphrase in a password manager
and copy encrypted archives to independent storage. Losing this computer can lose
both its backups and its key. PostgreSQL dumps do not include login roles; recovery
also needs the role SQL, private credentials, and application version. The current
local admin login and loopback HTTP/database settings are not production credentials.

## Schedule

The active Codex heartbeat **PiggyBanq daily backup and restore check** runs the
backup command daily at **02:00 Asia/Manila**, and stays quiet on routine success.
It reports failures or required action. This is an app automation: it requires the
Codex host to be available and Docker/PostgreSQL running. It is not an independent
server backup service or point-in-time recovery. For a hosted release, use managed
database backup scheduling, encrypted independent storage and point-in-time recovery.

## Verification

```sh
RUN_DATABASE_SECURITY_TESTS=1 RUN_DATABASE_BACKUP_TESTS=1 \
  pnpm exec node --test tests/database-security.test.mjs tests/database-backup.test.mjs
pnpm test
```

The security test rolls its application CRUD checks back. The backup integration
test uses a disposable database with foreign keys, duplicate rows, Unicode,
large integer amounts, JSON, nulls and an identity sequence, and rejects a damaged
encrypted archive. Neither test inserts fixture records into the live database.

## Supabase encrypted exports

Cloud access is not configured yet. The daily automation continues local backups and
will also run the Supabase target once its private configuration exists; until then
there is no verified Supabase backup coverage.

Copy `config/supabase-backup.env.example` to
`~/.config/piggybanq/supabase-backup.env` (directory700, file600). Use the separate
read-only `piggybanq_backup` login from `server/prisma/supabase-roles.sql`, the actual
project's direct/session endpoint on port5432, and URL-encode the password. The
script rejects transaction pooling, unknown hosts, and TLS verification downgrades.
PostgreSQL17/18 clients use the container's system trust store; if the project's
certificate is not trusted, the export fails. Resolve the CA configuration before
activation; do not change to `sslmode=require` to bypass verification.

```sh
python3 scripts/database_backup.py backup --target supabase
python3 scripts/database_backup.py backup --target all
python3 scripts/database_backup.py restore-test /absolute/path/to/piggybanq_supabase_TIMESTAMP.dump.gpg --target supabase
```

Set the configured major version to the source server's version (17 or18 supported).
Only the private `piggybanq` application schema is exported, including Prisma history;
Supabase-managed Auth, Storage, roles and project settings are outside this export.
These application features do not use Supabase Auth/Storage. Archives use a separate
`piggybanq_supabase_` prefix. Every export is encrypted and restored into a fresh
matching-version container with no network and no published port. All table data and
sequence values must match before a `.verified` report is written. Supabase is never
a restore-test destination. Dump credentials travel through process environment,
not command arguments. Treat Docker access as administrator access to the host.

A local PostgreSQL17 fixture proved remote TCP export, all seven migrations in the
private schema, restricted runtime/backup permissions and encrypted isolated restore.
This is not evidence of a backup from the user's live Supabase project. The host
must be awake with Docker running for automation. Keep an encrypted offsite copy
and a separately secured copy of the encryption key for machine-loss recovery;
this workflow does not yet provision offsite storage or a retention policy.
