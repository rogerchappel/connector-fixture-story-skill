import test from 'node:test';
import assert from 'node:assert/strict';
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
