import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('backup verification detects changed, missing and duplicated data', () => {
  execFileSync('python3', ['tests/database_backup_test.py'], { stdio: 'pipe' });
});
