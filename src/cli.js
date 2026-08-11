#!/usr/bin/env node
import { buildStory, loadFixture, renderMarkdown } from './index.js';

const USAGE = 'Usage: connector-fixture-story-skill <fixture.json> [--format markdown|json]';

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const story = buildStory(loadFixture(options.file));
    if (options.format === 'json') console.log(JSON.stringify(story, null, 2));
    else console.log(renderMarkdown(story));
    if (story.status === 'blocked') process.exitCode = 2;
  }
} catch (error) {
  console.error(`connector-fixture-story-skill: ${error.message}`);
  console.error(USAGE);
  process.exitCode = 1;
}

function parseArgs(args) {
  if (args.includes('--help')) {
    if (args.length !== 1) throw new Error('--help must be used without other arguments');
    return { help: true };
  }

  let file;
  let format = 'markdown';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--format') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) throw new Error('--format requires markdown or json');
      if (!['markdown', 'json'].includes(value)) throw new Error('--format must be markdown or json');
      format = value;
      index += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown option: ${arg}`);
    } else if (file) {
      throw new Error(`unexpected argument: ${arg}`);
    } else {
      file = arg;
    }
  }
  if (!file) throw new Error('fixture path is required');
  return { file, format, help: false };
}
