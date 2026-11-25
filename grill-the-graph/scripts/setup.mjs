import { isDeepStrictEqual } from 'node:util';
import { join, resolve } from 'node:path';

export class SetupError extends Error {}

const fail = (message) => {
  throw new SetupError(message);
};

export const MIN_CLAUDE = [2, 1, 295];
const MIN_TEXT = `v${MIN_CLAUDE.join('.')}`;

export const HOOK_TEXT = '#!/bin/sh\nexec node "$HOME/.claude/skills/grill-the-graph/scripts/no-attribution.mjs" --pre-push "$@"\n';

const SETTINGS = ['.claude', 'settings.local.json'];
const BUILD = 'docs/agents/thegraph.md';
const REFACTORING = 'docs/agents/refactoring.md';
const LOCAL_RULE = 'CLAUDE.local.md';
const SCRIPT_NAME = 'no-attribution.mjs';

export const USAGE = `Usage: node grill-the-graph.mjs <command> [options]

  install [--preview]           merges the attribution settings into .claude/settings.local.json,
                                keeping every key already there, and writes .git/hooks/pre-push;
                                --preview prints the same and writes nothing
  check --mode own|contributor [--map <dir>] [--attribution]
                                checks what setup wrote, one line each; --map names the map folder
                                §3 made (own repository), --attribution adds the attribution lines
                                to an own repository (contributor mode always has them)
`;

export function scriptPath(home) {
  return `${home.replace(/\\/g, '/').replace(/\/+$/, '')}/.claude/skills/grill-the-graph/scripts/${SCRIPT_NAME}`;
}

export function setupGroups(script) {
  const hook = (cond) => ({ type: 'command', ...(cond && { if: cond }), command: 'node', args: [script], onFailure: 'block' });
  const shells = ['Bash(git *)', 'Bash(gh *)', 'Bash(bash *)', 'PowerShell(git *)', 'PowerShell(gh *)', 'PowerShell(pwsh *)', 'PowerShell(powershell *)'];
  return [
    { matcher: 'Bash|PowerShell', hooks: shells.map(hook) },
    { matcher: 'mcp__.*github.*', hooks: [hook()] },
  ];
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isSetupHook = (hook) =>
  isObject(hook) && [hook.command, ...(Array.isArray(hook.args) ? hook.args : [])]
    .some((part) => typeof part === 'string' && part.includes(SCRIPT_NAME));

export function mergeSettings(current, script) {
  if (!isObject(current)) fail('the settings file holds no JSON object');
  const merged = structuredClone(current);
  if (merged.attribution !== undefined && !isObject(merged.attribution)) fail('the settings file\'s "attribution" is not an object');
  merged.attribution = { ...merged.attribution, commit: '', pr: '' };
  if (merged.hooks !== undefined && !isObject(merged.hooks)) fail('the settings file\'s "hooks" is not an object');
  merged.hooks ??= {};
  const pre = merged.hooks.PreToolUse ?? [];
  if (!Array.isArray(pre)) fail('the settings file\'s "hooks.PreToolUse" is not an array');
  const kept = [];
  for (const group of pre) {
    if (!isObject(group) || !Array.isArray(group.hooks)) {
      kept.push(group);
      continue;
    }
    const hooks = group.hooks.filter((hook) => !isSetupHook(hook));
    if (hooks.length) kept.push({ ...group, hooks });
  }
  merged.hooks.PreToolUse = [...kept, ...setupGroups(script)];
  return merged;
}

const lines = (text) => text.split(/\r?\n/);

function isSetupPrePush(text) {
  const body = lines(text).map((l) => l.trim()).filter((l) => l && !l.startsWith('#!'));
  return body.length === 1 && body[0].includes(SCRIPT_NAME);
}

function gitPath(deps, path) {
  const r = deps.git(['rev-parse', '--git-path', path]);
  if (r.status !== 0) fail(`git rev-parse --git-path ${path} failed`);
  return resolve(deps.top, r.stdout.trim());
}

function hooksPathOf(deps) {
  const r = deps.git(['config', '--get', 'core.hooksPath']);
  return r.status === 0 ? r.stdout.trim() : '';
}

function prePushPlan(deps) {
  const path = gitPath(deps, 'hooks/pre-push');
  const hooksPath = hooksPathOf(deps);
  if (hooksPath) return { path, reason: `core.hooksPath is set (${hooksPath}), so the project runs its own hooks` };
  const existing = deps.readFile(path);
  if (existing !== null && !isSetupPrePush(existing)) return { path, reason: 'a pre-push of the project\'s own is there, and replacing it is not setup\'s to do' };
  return { path, existing };
}

function parseVersion(text) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(text);
  return m ? m.slice(1).map(Number) : null;
}

function claudeCheck(deps) {
  let said;
  try {
    said = deps.claudeVersion().trim();
  } catch (err) {
    return `claude --version could not be read (${err.message}); the hooks fail closed only from Claude Code ${MIN_TEXT}`;
  }
  const v = parseVersion(said);
  if (!v) return `claude --version printed "${said}", with no version in it; the hooks fail closed only from Claude Code ${MIN_TEXT}`;
  const ok = { version: v.join('.') };
  for (let i = 0; i < 3; i += 1) {
    if (v[i] > MIN_CLAUDE[i]) return ok;
    if (v[i] < MIN_CLAUDE[i]) {
      return `Claude Code ${v.join('.')} is older than ${MIN_TEXT}, where a hook that cannot start lets every command through; update it and run install again`;
    }
  }
  return ok;
}

function readSettings(deps, path) {
  const text = deps.readFile(path);
  if (text === null) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`${path} is not JSON (${err.message}); fix it by hand, since rewriting it would lose what it holds`);
  }
}

const state = (before, after) => (before === null ? 'new' : before === after ? 'unchanged' : 'changed');

function install(preview, deps) {
  const claude = claudeCheck(deps);
  if (typeof claude === 'string') return { code: 1, out: `Nothing written: ${claude}.\n` };
  const script = scriptPath(deps.home);
  if (deps.readFile(script) === null) fail(`${script} is not there, and a hook that cannot start blocks every call; install the skill there first`);
  const settingsPath = join(deps.top, ...SETTINGS);
  const before = deps.readFile(settingsPath);
  const settingsText = `${JSON.stringify(mergeSettings(readSettings(deps, settingsPath), script), null, 2)}\n`;
  const hook = prePushPlan(deps);

  const out = [preview ? 'Preview: nothing written.' : 'Written.', `Claude Code ${claude.version}: ${MIN_TEXT} or later, so the hooks fail closed.`, ''];
  out.push(`${settingsPath} (${state(before, settingsText)})`, settingsText);
  if (hook.reason) out.push(`pre-push not written: ${hook.reason}.`, '');
  else out.push(`${hook.path} (${state(hook.existing ?? null, HOOK_TEXT)})`, HOOK_TEXT);

  if (!preview) {
    deps.writeFile(settingsPath, settingsText);
    if (!hook.reason) deps.writeFile(hook.path, HOOK_TEXT, 0o755);
  }
  return { code: 0, out: out.join('\n') };
}

const flat = (text) => text.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ').trim();

function contributorRule(deps) {
  const file = join(deps.skillDir, 'contributor.md');
  const text = deps.readFile(file);
  const block = text && /(?:^>.*\n?)+/m.exec(text.replace(/\r\n?/g, '\n'));
  if (!block) fail(`${file} holds no quoted rule to check against`);
  return flat(block[0]);
}

function excludeLists(text, path) {
  return lines(text ?? '').some((l) => l.trim().replace(/^\//, '') === path);
}

function check({ mode, map, attribution }, deps) {
  const results = [];
  const line = (ok, what, why = null) => results.push(ok ? `ok   ${what}` : `FAIL ${what}${why ? `: ${why}` : ''}`);
  const present = (rel) => line(deps.readFile(resolve(deps.top, rel)) !== null, `${rel} exists`);

  present(BUILD);
  if (mode === 'own') present(REFACTORING);
  if (mode === 'own' && map) present(`${map.replace(/\\/g, '/').replace(/\/+$/, '')}/README.md`);

  if (mode === 'contributor') {
    const local = deps.readFile(join(deps.top, LOCAL_RULE));
    line(local !== null && flat(local).includes(contributorRule(deps)), `${LOCAL_RULE} holds the contributor rule`, local === null ? 'missing' : null);
    const exclude = deps.readFile(gitPath(deps, 'info/exclude'));
    for (const path of [BUILD, LOCAL_RULE]) line(excludeLists(exclude, path), `.git/info/exclude lists ${path}`);
  }

  if (mode === 'contributor' || attribution) {
    const what = '.claude/settings.local.json holds attribution and both matcher groups, every hook failing closed';
    const text = deps.readFile(join(deps.top, ...SETTINGS));
    let current;
    try {
      current = text === null ? null : JSON.parse(text);
    } catch {
      current = undefined;
    }
    if (text === null) line(false, what, 'missing');
    else if (current === undefined) line(false, what, 'not JSON');
    else {
      try {
        line(isDeepStrictEqual(current, mergeSettings(current, scriptPath(deps.home))), what, 'install --preview shows what differs');
      } catch (err) {
        if (!(err instanceof SetupError)) throw err;
        line(false, what, err.message);
      }
    }

    const hook = prePushPlan(deps);
    if (hook.reason) line(true, `.git/hooks/pre-push not written: ${hook.reason}`);
    else {
      const what2 = ".git/hooks/pre-push is setup's and executable";
      if (hook.existing === null) line(false, what2, 'missing');
      else if (hook.existing !== HOOK_TEXT) line(false, what2, 'differs from what install writes');
      else if (deps.platform === 'win32') line(true, `${what2} (the executable bit is not read on Windows)`);
      else line(deps.isExecutable(hook.path), what2, deps.isExecutable(hook.path) ? null : 'not executable');
    }
  }

  if (mode === 'contributor') {
    const r = deps.git(['status', '--short']);
    const said = r.stdout.trim();
    line(r.status === 0 && said === '', 'git status --short prints nothing', said.replace(/\n/g, '; ') || null);
  }

  const failed = results.some((r) => r.startsWith('FAIL'));
  return { code: failed ? 1 : 0, out: `${results.join('\n')}\n` };
}

const FLAGS = {
  install: { preview: false },
  check: { mode: true, map: true, attribution: false },
};

export function run(argv, deps) {
  const [command, ...rest] = argv;
  if (!FLAGS[command]) fail(USAGE);
  const opts = {};
  for (let i = 0; i < rest.length; i += 1) {
    const m = /^--(.+)$/.exec(rest[i]);
    if (!m || !(m[1] in FLAGS[command])) fail(`${command} takes no ${rest[i]}\n\n${USAGE}`);
    if (FLAGS[command][m[1]]) {
      if (i + 1 >= rest.length) fail(`--${m[1]} needs a value`);
      opts[m[1]] = rest[++i];
    } else opts[m[1]] = true;
  }
  if (command === 'install') return install(Boolean(opts.preview), deps);
  if (opts.mode !== 'own' && opts.mode !== 'contributor') fail('check needs --mode own or --mode contributor');
  if (opts.mode === 'contributor' && opts.map) fail('--map is for an own repository; contributor mode makes no map');
  return check({ mode: opts.mode, map: opts.map, attribution: Boolean(opts.attribution) }, deps);
}
