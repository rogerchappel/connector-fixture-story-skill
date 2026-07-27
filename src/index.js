import fs from 'node:fs';

const SUPPORTED_EFFECTS = new Set(['read', 'write']);

export function loadFixture(path) { return parseFixture(fs.readFileSync(path, 'utf8'), path); }

export function parseFixture(text, source = 'inline') {
  const fixture = JSON.parse(String(text || '{}'));
  if (!fixture.name) throw new Error('fixture bundle requires a name');
  if (!Array.isArray(fixture.scenarios) || fixture.scenarios.length === 0) throw new Error('fixture bundle requires scenarios');
  return { source, name: fixture.name, description: fixture.description || '', scenarios: fixture.scenarios.map(normalizeScenario) };
}

export function analyzeFixture(fixture) {
  const findings = [];
  const permissions = new Set();
  for (const scenario of fixture.scenarios) {
    if (!scenario.goal) findings.push(blocker('missing_goal', `${scenario.name} is missing a goal`));
    for (const action of scenario.actions) {
      if (!action.tool) findings.push(blocker('missing_tool', `${scenario.name} has an action without a tool`));
      if (!SUPPORTED_EFFECTS.has(action.effect)) findings.push(blocker('invalid_effect', `${action.label} has unsupported effect "${action.effect}"; expected read or write`));
      if (!action.permission) findings.push(warning('missing_permission', `${action.label} does not name a permission scope`));
      else permissions.add(action.permission);
      if ((action.effect === 'write' || action.live) && !action.approval) findings.push(blocker('missing_approval', `${action.label} needs approval evidence before live use`));
      if (containsSecret(action.input)) findings.push(blocker('unredacted_secret', `${action.label} appears to contain unredacted secret material`));
    }
  }
  const status = findings.some(f => f.level === 'blocker') ? 'blocked' : findings.length ? 'review' : 'pass';
  return { status, permissions: [...permissions].sort(), findings };
}

export function buildStory(fixture) {
  const analysis = analyzeFixture(fixture);
  const scenarios = fixture.scenarios.map(scenario => ({
    name: scenario.name,
    goal: scenario.goal,
    narrative: `${scenario.actor} intends to ${scenario.goal}`,
    actions: scenario.actions.map((action, index) => `${index + 1}. ${action.tool}: ${action.intent} (${action.effect}; ${action.permission || 'permission missing'})`),
    checklist: checklistFor(scenario)
  }));
  return { name: fixture.name, description: fixture.description, status: analysis.status, permissions: analysis.permissions, findings: analysis.findings, scenarios };
}

export function renderMarkdown(story) {
  const list = (items, empty='- None listed') => items.length ? items.map(item => typeof item === 'string' ? `- ${item}` : `- ${item.level}: ${item.code} - ${item.message}`).join('\n') : empty;
  const scenarios = story.scenarios.map(s => `## ${s.name}\n\n${s.narrative}\n\n### Dry-run Actions\n\n${list(s.actions)}\n\n### Reviewer Checklist\n\n${list(s.checklist)}`).join('\n\n');
  return `# ${story.name}\n\nStatus: ${story.status}\n\n${story.description}\n\n## Permissions\n\n${list(story.permissions)}\n\n## Findings\n\n${list(story.findings, '- None')}\n\n${scenarios}\n`;
}

function normalizeScenario(input, index) {
  if (!isObject(input)) throw new Error(`scenario ${index + 1} must be an object`);
  const actions = input.actions === undefined ? [] : input.actions;
  if (!Array.isArray(actions)) throw new Error(`scenario ${index + 1} actions must be an array`);
  return {
    name: input.name || `Scenario ${index + 1}`,
    actor: input.actor || 'An agent',
    goal: input.goal || '',
    actions: actions.map((action, actionIndex) => normalizeAction(action, actionIndex, index))
  };
}
function normalizeAction(input, index, scenarioIndex) {
  if (!isObject(input)) throw new Error(`scenario ${scenarioIndex + 1} action ${index + 1} must be an object`);
  return {
    label: input.label || input.intent || `action ${index + 1}`,
    tool: input.tool || '',
    intent: input.intent || '',
    permission: input.permission || '',
    approval: input.approval || '',
    effect: input.effect ?? '',
    live: Boolean(input.live),
    input: input.input || {}
  };
}
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function checklistFor(scenario) { return ['Confirm fixture data is synthetic or redacted.', 'Confirm permissions match the stated goal.', ...scenario.actions.filter(a => a.effect === 'write' || a.live).map(a => `Confirm approval evidence for ${a.label}.`)]; }
    function containsSecret(value) {
      const text = JSON.stringify(value || {});
      return /"(api[_-]?key|secret|token|password)"\s*:\s*"[A-Za-z0-9_\-]{8,}"/i.test(text) || /(api[_-]?key|secret|token|password)\s*[:=]\s*[A-Za-z0-9_\-]{8,}/i.test(text);
    }
function blocker(code, message) { return { level: 'blocker', code, message }; }
function warning(code, message) { return { level: 'warning', code, message }; }
