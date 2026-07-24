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

A bundle includes `name`, optional `description`, and `scenarios`. Each scenario has a `goal` and `actions`; each action should name a `tool`, `intent`, `permission`, and an `effect` of `read` or `write`. Write or live actions also require approval evidence. Unsupported or misspelled effects are blockers.

## CLI exit status

The CLI always emits the requested Markdown or JSON story. It exits `0` for `pass` and `review` stories, and exits `2` after emitting a `blocked` story. Argument and input errors use exit `1`. This lets automation preserve the review artifact while stopping a release on blockers.

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

The CI workflow runs `npm run release:check`, so local release checks and pull-request checks exercise the same syntax, test, smoke, and package contents coverage.

## Limitations

The skill validates fixture structure and obvious safety signals. It does not prove connector implementation correctness and never executes actions.

## Safety Notes

Treat `blocked` output and exit status `2` as a release-review stop. Remove secrets from fixtures, correct invalid effects, and attach approval evidence before live connector workflows are considered.

## Release notes

Before tagging a release, confirm the smoke fixture still represents the intended workflow and summarize any changed output, limitations, or operator steps in the PR.
