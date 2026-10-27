import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));

test('runtime role can use application records but cannot administer the database', {
  skip: process.env.RUN_DATABASE_SECURITY_TESTS !== '1'
}, async () => {
  const { PrismaClient } = require('@prisma/client');
  const env = readFileSync(new URL('../server/.env', import.meta.url), 'utf8');
  const datasourceUrl = env.match(/^DATABASE_URL="([^"]+)"/m)?.[1];
  assert.ok(datasourceUrl, 'local runtime DATABASE_URL must be configured');
  const client = new PrismaClient({ datasourceUrl });
  try {
    const [role] = await client.$queryRaw`
      SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
        pg_has_role(current_user, 'pg_database_owner', 'MEMBER') AS database_owner,
        has_database_privilege(current_database(), 'CREATE') AS create_schema,
        has_database_privilege(current_database(), 'TEMP') AS create_temp,
        has_schema_privilege('public', 'CREATE') AS create_table
      FROM pg_roles WHERE rolname = current_user`;
    assert.equal(role.name, 'piggybanq_app');
    for (const [permission, value] of Object.entries(role)) {
      if (permission !== 'name') assert.equal(value, false, permission);
    }
    const tables = await client.$queryRaw`
      SELECT tablename,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'SELECT') AS read,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'INSERT') AS insert,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'UPDATE') AS update,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'DELETE') AS delete,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'TRUNCATE') AS truncate,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'TRIGGER') AS trigger,
        has_table_privilege(format('%I.%I', schemaname, tablename), 'REFERENCES') AS references
      FROM pg_tables WHERE schemaname = 'public'`;
    assert.ok(tables.length >= 27);
    for (const table of tables) {
      for (const permission of ['read', 'insert', 'update', 'delete']) {
        const expected = table.tablename !== '_prisma_migrations'
          && !(table.tablename === 'AuditLogEntry' && ['update', 'delete'].includes(permission));
        assert.equal(table[permission], expected, `${table.tablename}: ${permission}`);
      }
      for (const permission of ['truncate', 'trigger', 'references']) {
        assert.equal(table[permission], false, `${table.tablename}: ${permission}`);
      }
    }
    await assert.rejects(client.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { displayName: 'Runtime permission check' } });
      await tx.user.update({ where: { id: user.id }, data: { displayName: 'Updated' } });
      assert.equal((await tx.user.findUnique({ where: { id: user.id } })).displayName, 'Updated');
      await tx.auditLogEntry.create({ data: { action: 'runtime.permission.check' } });
      await tx.user.delete({ where: { id: user.id } });
      throw new Error('rollback permission check');
    }), /rollback permission check/);
  } finally {
    await client.$disconnect();
  }
});
