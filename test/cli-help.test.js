import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('CLI help entrypoint prints usage', () => {
  const result = spawnSync(process.execPath, ['./src/cli.js', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: connector-fixture-story-skill/);
  assert.equal(result.stderr, '');
});

test('CLI rejects unsupported output formats', () => {
  const result = spawnSync(
    process.execPath,
    ['./src/cli.js', 'fixtures/connector-fixture.json', '--format', 'xml'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /--format must be markdown or json/);
});
