import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('CLI help entrypoint prints usage', () => {
  const result = spawnSync(process.execPath, ['./src/cli.js', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: connector-fixture-story-skill/);
  assert.equal(result.stderr, '');
});

for (const args of [
  ['--help', 'fixtures/connector-fixture.json'],
  ['fixtures/connector-fixture.json', '--help'],
  ['--help', '--format', 'json'],
  ['--format', 'json', '--help'],
  ['--help', '--bogus'],
  ['--bogus', '--help']
]) {
  test(`CLI rejects help combined with other arguments: ${args.join(' ')}`, () => {
    const result = spawnSync(process.execPath, ['./src/cli.js', ...args], { encoding: 'utf8' });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /--help must be used without other arguments/);
    assert.match(result.stderr, /Usage: connector-fixture-story-skill/);
  });
}

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
