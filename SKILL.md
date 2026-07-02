# connector-fixture-story-skill

Use this skill when an agent needs to review connector action fixtures as a dry-run story before live connector execution is considered.

## Inputs
- JSON fixture bundle with `name`, `scenarios`, and scenario `actions`.
- Each action should include `tool`, `intent`, `permission`, and `approval` fields.

## Side-effect boundaries
- Reads only the fixture file.
- Writes only stdout.
- Never calls connector tools, external APIs, or account systems.

## Approval requirements
Any action with `effect: "write"` or `live: true` must have explicit approval evidence before it can pass review.

## Validation
Run `npm test`, `npm run check`, `npm run smoke`, and `bash scripts/validate.sh` before packaging changes.
