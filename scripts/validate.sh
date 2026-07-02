#!/usr/bin/env bash
set -euo pipefail
npm run check
npm test
npm run smoke >/tmp/connector-fixture-story-skill-smoke.md
test -s /tmp/connector-fixture-story-skill-smoke.md
