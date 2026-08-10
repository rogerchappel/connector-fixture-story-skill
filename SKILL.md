# connector-fixture-story-skill

Use this skill when an agent needs to review connector action fixtures as a dry-run story before live connector execution is considered.

## Inputs
- JSON fixture bundle with `name`, `scenarios`, and scenario `actions`; every scenario and action must be an object.
- Each action must explicitly include an `effect` of `read` or `write` and should include `tool`, `intent`, and `permission`; write or live actions also need `approval`.

## CLI grammar
- Help is standalone only: `connector-fixture-story-skill --help`.
- Story generation uses `connector-fixture-story-skill <fixture.json> [--format markdown|json]`; the fixture and format option may appear in either order.
- Combining `--help` with a fixture, format option, or unknown argument is a usage error. It exits `1`, writes the error and usage to stderr, and emits no story.

## Side-effect boundaries
- Reads only the fixture file.
- Writes only stdout.
- Never calls connector tools, external APIs, or account systems.

## Approval requirements
Any action with `effect: "write"` or `live: true` must have explicit approval evidence before it can pass review.
Any missing, unsupported, or misspelled `effect` is a blocker. The CLI emits blocked stories and exits with status `2`; passing and review stories exit `0`.

## Validation
Run `npm test`, `npm run check`, `npm run smoke`, and `bash scripts/validate.sh` before packaging changes.
