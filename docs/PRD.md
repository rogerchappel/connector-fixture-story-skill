# connector-fixture-story-skill PRD

## Objective
Make connector action fixtures understandable before any live external action is attempted.

## Users
- Agent builders reviewing connector adapters.
- Maintainers preparing dry-run approval plans.
- QA reviewers checking fixture coverage and permission boundaries.

## MVP
- Parse JSON fixture bundles with scenarios and actions.
- Validate required fields, approvals, redactions, and live-write intent.
- Render scenario narrative, permission inventory, action sequence, and reviewer checklist.

## Non-goals
- Executing connector actions.
- Authenticating against external services.
- Storing private account data.
