# Release Candidate

## Scope

Initial public build of `connector-fixture-story-skill`, a local-first CLI and skill for turning connector fixture bundles into dry-run stories, permission inventories, safety findings, and reviewer checklists.

## Verification

- `npm test` passed
- `npm run check` passed
- `npm run smoke` passed
- `bash scripts/validate.sh` passed

## Safety Review

- No connector execution.
- No network calls.
- Write and live actions require approval evidence.
- Secret-like fixture fields are release-review blockers.

## Classification

ship
