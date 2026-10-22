import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function check(env, code = "require('./dist/config')") {
  return spawnSync(process.execPath, ['-e', code], {
    cwd: process.cwd(), env: { ...process.env, ...env }, encoding: 'utf8'
  });
}

test('production rejects absent and short JWT signing secrets', () => {
  for (const JWT_SECRET of ['', 'short', 'your-super-secret-jwt-key']) {
    const result = check({ NODE_ENV: 'production', JWT_SECRET });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Set JWT_SECRET/);
  }
});
test('production accepts a sufficiently long configured test secret', () => {
  assert.equal(check({ NODE_ENV: 'production', JWT_SECRET: 'test-only-not-a-real-secret-1234567890' }).status, 0);
});
test('development creates a key without the public fallback', () => {
  const result = check({ NODE_ENV: 'development', JWT_SECRET: '' },
    "const {config}=require('./dist/config'); process.exit(config.JWT_SECRET.length >= 32 && config.JWT_SECRET !== 'your-super-secret-jwt-key' ? 0 : 1)");
  assert.equal(result.status, 0);
});
