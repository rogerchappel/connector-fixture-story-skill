#!/usr/bin/env node
import { buildStory, loadFixture, renderMarkdown } from './index.js';

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith('-'));
const format = valueAfter(args, '--format') || 'markdown';
if (args.includes('--help')) {
  console.log('Usage: connector-fixture-story-skill <fixture.json> [--format markdown|json]');
  process.exit(0);
}
if (!file) {
  console.log('Usage: connector-fixture-story-skill <fixture.json> [--format markdown|json]');
  process.exit(1);
}
const story = buildStory(loadFixture(file));
if (format === 'json') console.log(JSON.stringify(story, null, 2));
else console.log(renderMarkdown(story));

function valueAfter(args, flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
