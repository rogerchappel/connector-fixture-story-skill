# connector-fixture-story-skill

Local-first agent skill that turns connector fixture bundles into dry-run review stories with permissions, blockers, and reviewer checklists.

## Quickstart

```bash
npm install
npm run smoke
node src/cli.js --help
node src/cli.js fixtures/connector-fixture.json --format markdown
node src/cli.js fixtures/unsafe-fixture.json --format json
```

## Fixture Shape

A bundle includes `name`, optional `description`, and `scenarios`. Each scenario has a `goal` and `actions`; each action should name a `tool`, `intent`, `permission`, `effect`, and approval evidence for write or live actions.

## Verification

Run the same checks used for release-readiness before publishing or opening a release PR:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run release:check
npm pack --dry-run
```

## Limitations

The skill validates fixture structure and obvious safety signals. It does not prove connector implementation correctness and never executes actions.

## Safety Notes

Treat `blocked` output as a release-review stop. Remove secrets from fixtures and attach approval evidence before live connector workflows are considered.

## Local Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

`npm run release:check` is the broadest local gate before opening a release PR. It combines syntax checks, the test suite, the fixture-backed CLI smoke, and package contents validation.

## Development checks

Run the same local gates that CI runs before opening a PR:

```bash
npm run check --if-present
npm run build --if-present
npm test --if-present
npm run smoke --if-present
```
