import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { analyzeFixture, buildStory, loadFixture, renderMarkdown } from '../src/index.js';

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
