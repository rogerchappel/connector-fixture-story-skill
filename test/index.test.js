import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeFixture, buildStory, loadFixture, parseFixture, renderMarkdown } from '../src/index.js';

function fixtureWith(action) {
  return {
    name: 'Effect validation',
    scenarios: [{
      name: 'One action',
      actor: 'A reviewer',
      goal: 'inspect behavior',
      actions: [action]
    }]
  };
}

test('builds a passing story for approved fixture writes', () => {
  const story = buildStory(loadFixture('fixtures/connector-fixture.json'));
  assert.equal(story.status, 'pass');
  assert.ok(story.permissions.includes('crm.tasks.write'));
  assert.match(renderMarkdown(story), /Reviewer Checklist/);
});

test('blocks live writes without approval', () => {
  const analysis = analyzeFixture(loadFixture('fixtures/unsafe-fixture.json'));
  assert.equal(analysis.status, 'blocked');
  assert.ok(analysis.findings.some(f => f.code === 'missing_approval'));
  assert.ok(analysis.findings.some(f => f.code === 'unredacted_secret'));
});

test('blocks unsupported effects instead of treating them as reads', () => {
  const analysis = analyzeFixture(fixtureWith({
    label: 'Misspelled write',
    tool: 'crm.update',
    intent: 'update a record',
    permission: 'crm.records.write',
    effect: 'wrtie'
  }));

  assert.equal(analysis.status, 'blocked');
  assert.ok(analysis.findings.some(f => f.code === 'invalid_effect'));
});

test('blocks missing effects instead of defaulting them to reads', () => {
  const fixture = parseFixture(JSON.stringify(fixtureWith({
    label: 'Unclassified update',
    tool: 'crm.update',
    intent: 'update a record',
    permission: 'crm.records.write'
  })));
  const analysis = analyzeFixture(fixture);

  assert.equal(fixture.scenarios[0].actions[0].effect, '');
  assert.equal(analysis.status, 'blocked');
  assert.ok(analysis.findings.some(f => f.code === 'invalid_effect'));
});

test('rejects non-object scenarios and actions with deterministic errors', () => {
  assert.throws(
    () => parseFixture(JSON.stringify({ name: 'Invalid scenario', scenarios: [null] })),
    /scenario 1 must be an object/
  );
  assert.throws(
    () => parseFixture(JSON.stringify({
      name: 'Invalid action',
      scenarios: [{ name: 'Scenario', goal: 'validate', actions: [null] }]
    })),
    /scenario 1 action 1 must be an object/
  );
});

test('rejects malformed public fixture fields at the library boundary', () => {
  const cases = [
    [{ name: {}, scenarios: [{}] }, /fixture bundle name must be a non-empty string/],
    [{ name: 'Bundle', description: [], scenarios: [{}] }, /fixture bundle description must be a string/],
    [{ name: 'Bundle', scenarios: [{ name: {} }] }, /scenario 1 name must be a non-empty string/],
    [{ name: 'Bundle', scenarios: [{ actor: [] }] }, /scenario 1 actor must be a non-empty string/],
    [{ name: 'Bundle', scenarios: [{ goal: 7 }] }, /scenario 1 goal must be a string/],
    [{ name: 'Bundle', scenarios: [{ actions: [{ label: '' }] }] }, /scenario 1 action 1 label must be a non-empty string/],
    ...['tool', 'intent', 'permission', 'approval', 'effect'].map(field => [
      { name: 'Bundle', scenarios: [{ actions: [{ [field]: {} }] }] },
      new RegExp(`scenario 1 action 1 ${field} must be a string`)
    ]),
    [{ name: 'Bundle', scenarios: [{ actions: [{ live: 1 }] }] }, /scenario 1 action 1 live must be a boolean/],
    [{ name: 'Bundle', scenarios: [{ actions: [{ input: [] }] }] }, /scenario 1 action 1 input must be an object/]
  ];

  for (const [fixture, message] of cases) {
    assert.throws(() => parseFixture(JSON.stringify(fixture)), message);
  }
});

test('preserves documented defaults and empty finding-bearing fields', () => {
  const fixture = parseFixture(JSON.stringify({
    name: 'Compatible fixture',
    description: '',
    scenarios: [{ goal: '', actions: [{ tool: '', intent: '', permission: '', approval: '', effect: '' }] }]
  }));

  assert.equal(fixture.scenarios[0].name, 'Scenario 1');
  assert.equal(fixture.scenarios[0].actor, 'An agent');
  assert.equal(buildStory(fixture).status, 'blocked');
});

test('blocks write effects and live reads without approval', () => {
  for (const action of [
    { label: 'Write', tool: 'crm.update', effect: 'write' },
    { label: 'Live read', tool: 'crm.get', effect: 'read', live: true }
  ]) {
    const analysis = analyzeFixture(fixtureWith({
      intent: 'exercise approval checks',
      permission: 'crm.records',
      ...action
    }));
    assert.equal(analysis.status, 'blocked');
    assert.ok(analysis.findings.some(f => f.code === 'missing_approval'));
  }
});

test('requires scenarios', () => {
  assert.throws(() => loadFixture('package.json'), /requires scenarios/);
});

test('CLI help documents the fixture argument and format flag', () => {
  const result = spawnSync(process.execPath, ['src/cli.js', '--help'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: connector-fixture-story-skill <fixture\.json>/);
  assert.match(result.stdout, /--format markdown\|json/);
  assert.equal(result.stderr, '');
});

test('CLI renders JSON stories from fixture input', () => {
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    'fixtures/connector-fixture.json',
    '--format',
    'json'
  ], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');

  const story = JSON.parse(result.stdout);
  assert.equal(story.status, 'pass');
  assert.ok(story.permissions.includes('crm.tasks.write'));
});

test('CLI accepts the format flag before the fixture', () => {
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    '--format',
    'json',
    'fixtures/connector-fixture.json'
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).status, 'pass');
});

test('CLI reports argument errors without stack traces', () => {
  for (const args of [
    ['--format'],
    ['fixtures/connector-fixture.json', '--format'],
    ['fixtures/connector-fixture.json', 'extra.json'],
    ['--unknown', 'fixtures/connector-fixture.json']
  ]) {
    const result = spawnSync(process.execPath, ['src/cli.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^connector-fixture-story-skill: .+\nUsage: /);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  }
});

test('CLI reports invalid fixture members without stack traces', () => {
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    'test/fixtures/null-scenario.json'
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /scenario 1 must be an object/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('CLI reports every malformed public field as an input error', () => {
  const directory = mkdtempSync(join(tmpdir(), 'connector-fixture-story-'));
  const cases = [
    ['bundle name', { name: {}, scenarios: [{}] }],
    ['bundle description', { name: 'Bundle', description: [], scenarios: [{}] }],
    ['scenario name', { name: 'Bundle', scenarios: [{ name: {} }] }],
    ['scenario actor', { name: 'Bundle', scenarios: [{ actor: [] }] }],
    ['scenario goal', { name: 'Bundle', scenarios: [{ goal: 7 }] }],
    ['scenario actions', { name: 'Bundle', scenarios: [{ actions: {} }] }],
    ['action label', { name: 'Bundle', scenarios: [{ actions: [{ label: '' }] }] }],
    ['action tool', { name: 'Bundle', scenarios: [{ actions: [{ tool: {} }] }] }],
    ['action intent', { name: 'Bundle', scenarios: [{ actions: [{ intent: {} }] }] }],
    ['action permission', { name: 'Bundle', scenarios: [{ actions: [{ permission: {} }] }] }],
    ['action approval', { name: 'Bundle', scenarios: [{ actions: [{ approval: {} }] }] }],
    ['action effect', { name: 'Bundle', scenarios: [{ actions: [{ effect: {} }] }] }],
    ['action live', { name: 'Bundle', scenarios: [{ actions: [{ live: 1 }] }] }],
    ['action input', { name: 'Bundle', scenarios: [{ actions: [{ input: [] }] }] }]
  ];

  try {
    for (const [label, fixture] of cases) {
      const path = join(directory, `${label.replaceAll(' ', '-')}.json`);
      writeFileSync(path, JSON.stringify(fixture));
      const result = spawnSync(process.execPath, ['src/cli.js', path, '--format', 'json'], { encoding: 'utf8' });
      assert.equal(result.status, 1, label);
      assert.match(result.stderr, new RegExp(`${label.replaceAll(' ', '.*')} must be`), label);
      assert.equal(result.stdout, '', label);
      assert.doesNotMatch(result.stderr, /\[object Object\]|\n\s+at /, label);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI emits blocked JSON and exits 2', () => {
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    'fixtures/unsafe-fixture.json',
    '--format',
    'json'
  ], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).status, 'blocked');
});

test('CLI emits blocked Markdown and exits 2', () => {
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    'fixtures/unsafe-fixture.json',
    '--format',
    'markdown'
  ], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Status: blocked/);
});

test('CLI exits 0 for passing and review stories', () => {
  const passing = spawnSync(process.execPath, [
    'src/cli.js',
    'fixtures/connector-fixture.json'
  ], { encoding: 'utf8' });
  assert.equal(passing.status, 0);
  assert.match(passing.stdout, /Status: pass/);

  const review = spawnSync(process.execPath, [
    'src/cli.js',
    'fixtures/review-fixture.json',
    '--format',
    'json'
  ], { encoding: 'utf8' });
  assert.equal(review.status, 0);
  assert.equal(JSON.parse(review.stdout).status, 'review');
});
