import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('package and lockfile require the supported Node baseline', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const packageLock = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8'));

  assert.equal(packageJson.engines?.node, '>=22');
  assert.equal(packageLock.packages?.['']?.engines?.node, '>=22');
});
