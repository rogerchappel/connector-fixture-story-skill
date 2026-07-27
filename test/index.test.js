import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  const analysis = analyzeFixture(fixtureWith({
    label: 'Unclassified update',
    tool: 'crm.update',
    intent: 'update a record',
    permission: 'crm.records.write'
  }));

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
