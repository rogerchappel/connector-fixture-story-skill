# connector-fixture-story-skill

Local-first agent skill that turns connector fixture bundles into dry-run review stories with permissions, blockers, and reviewer checklists.

## Quickstart

```bash
npm install
npm run smoke
node src/cli.js --help
node src/cli.js fixtures/connector-fixture.json --format markdown
node src/cli.js --format json fixtures/unsafe-fixture.json
```

## Fixture Shape

A bundle is a JSON object with a non-empty string `name`, an optional string `description`, and a non-empty `scenarios` array. Every scenario is an object: optional `name` and `actor` values are non-empty strings, `goal` is a string, and `actions` is an array when present. Missing names and actors receive display defaults; a missing or empty goal remains valid input but produces a blocker.

Every action is an object. `label`, when present, is a non-empty string. `tool`, `intent`, `permission`, `approval`, and `effect` are strings; `live` is a boolean; and `input` is an object. Missing `goal`, `tool`, `permission`, `approval`, and `effect` values remain valid fixture input so the generated story can report the corresponding finding. Whitespace-only values in these finding-bearing fields are normalized to missing values; other string content is preserved. An effect must be `read` or `write` to avoid a blocker, and write or live actions require non-empty approval evidence before live use.

The fixture path and `--format` option can appear in either order. Missing option values, unknown options, and extra positional arguments are usage errors.

## CLI exit status

The CLI always emits the requested Markdown or JSON story for structurally valid fixtures. It exits `0` for `pass` and `review` stories, and exits `2` after emitting a `blocked` story. Argument errors, malformed JSON, and invalid field types or non-empty constraints use exit `1`, write a concise error to stderr, and do not emit a story. This lets automation preserve genuine review artifacts without rendering malformed values.

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
