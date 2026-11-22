import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { HOOK_TEXT, mergeSettings, run, scriptPath, setupGroups } from './setup.mjs';

const HOME = '/home/me';
const SCRIPT = '/home/me/.claude/skills/grill-the-graph/scripts/no-attribution.mjs';
const TOP = '/repo';
const SKILL = '/skills/grill-the-graph';
const RULE = 'Comments follow this repository, not a rule written here. Before writing one,\nfind and read its guidance.';

const at = (...parts) => join(TOP, ...parts);

function fakeRepo({ files = {}, executable = [], hooksPath = '', status = '', version = '2.1.295 (Claude Code)', platform = 'darwin', gitDir = '.git' } = {}) {
  const disk = new Map(Object.entries({
    [SCRIPT]: '// hook',
    [join(SKILL, 'contributor.md')]: `# Contributor mode\n\nThe rule:\n\n> ${RULE.replace('\n', '\n> ')}\n\nAfter.\n`,
    ...files,
  }));
  const exec = new Set(executable);
  const written = [];
  return {
    written,
    disk,
    deps: {
      top: TOP,
      home: HOME,
      platform,
      skillDir: SKILL,
      readFile: (path) => (disk.has(path) ? disk.get(path) : null),
      writeFile: (path, text, mode) => {
        written.push(path);
        disk.set(path, text);
        if (mode) exec.add(path);
      },
      isExecutable: (path) => exec.has(path),
      git: (args) => {
        const key = args.join(' ');
        if (key === 'config --get core.hooksPath') return hooksPath ? { status: 0, stdout: `${hooksPath}\n` } : { status: 1, stdout: '' };
        if (key === 'rev-parse --git-path hooks/pre-push') return { status: 0, stdout: `${gitDir}/hooks/pre-push\n` };
        if (key === 'rev-parse --git-path info/exclude') return { status: 0, stdout: `${gitDir}/info/exclude\n` };
        if (key === 'status --short') return { status: 0, stdout: status };
        throw new Error(`unexpected git ${key}`);
      },
      claudeVersion: () => {
        if (version instanceof Error) throw version;
        return version;
      },
    },
  };
}

const SETTINGS = at('.claude', 'settings.local.json');
const PRE_PUSH = at('.git', 'hooks', 'pre-push');

test('the script path is the home written out with forward slashes', () => {
  assert.equal(scriptPath('C:\\Users\\me'), 'C:/Users/me/.claude/skills/grill-the-graph/scripts/no-attribution.mjs');
  assert.equal(scriptPath(HOME), SCRIPT);
});

test('every setup hook starts node with no shell on the script and fails closed', () => {
  const hooks = setupGroups(SCRIPT).flatMap((g) => g.hooks);
  assert.equal(hooks.length, 8);
  for (const h of hooks) {
    assert.deepEqual([h.type, h.command, h.args, h.onFailure], ['command', 'node', [SCRIPT], 'block']);
  }
  assert.deepEqual(setupGroups(SCRIPT).map((g) => g.matcher), ['Bash|PowerShell', 'mcp__.*github.*']);
  assert.deepEqual(setupGroups(SCRIPT)[0].hooks.map((h) => h.if), [
    'Bash(git *)', 'Bash(gh *)', 'Bash(bash *)', 'PowerShell(git *)', 'PowerShell(gh *)', 'PowerShell(pwsh *)', 'PowerShell(powershell *)',
  ]);
});

test('the merge keeps every key already there and adds attribution and both groups', () => {
  const current = {
    permissions: { allow: ['Bash(ls)'] },
    attribution: { other: 1 },
    hooks: {
      Stop: [{ hooks: [{ type: 'command', command: 'say' }] }],
      PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'lint' }] }],
    },
  };
  const merged = mergeSettings(current, SCRIPT);
  assert.deepEqual(merged.permissions, current.permissions);
  assert.deepEqual(merged.attribution, { other: 1, commit: '', pr: '' });
  assert.deepEqual(merged.hooks.Stop, current.hooks.Stop);
  assert.deepEqual(merged.hooks.PreToolUse, [current.hooks.PreToolUse[0], ...setupGroups(SCRIPT)]);
  assert.deepEqual(current.attribution, { other: 1 }, 'the input is not changed in place');
});

test('the merge replaces an earlier setup hook instead of adding a second', () => {
  const old = {
    hooks: {
      PreToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command', command: 'node /old/no-attribution.mjs' }, { type: 'command', command: 'keep' }] },
        { matcher: 'mcp__.*github.*', hooks: [{ type: 'command', command: 'node', args: ['/old/no-attribution.mjs'] }] },
      ],
    },
  };
  const merged = mergeSettings(old, SCRIPT);
  assert.deepEqual(merged.hooks.PreToolUse, [
    { matcher: 'Bash', hooks: [{ type: 'command', command: 'keep' }] },
    ...setupGroups(SCRIPT),
  ]);
  assert.deepEqual(mergeSettings(merged, SCRIPT), merged, 'a second merge changes nothing');
});

test('the merge stops on settings whose shape it cannot keep', () => {
  assert.throws(() => mergeSettings([], SCRIPT), /settings/);
  assert.throws(() => mergeSettings({ hooks: [] }, SCRIPT), /hooks/);
  assert.throws(() => mergeSettings({ hooks: { PreToolUse: {} } }, SCRIPT), /PreToolUse/);
  assert.throws(() => mergeSettings({ attribution: 'x' }, SCRIPT), /attribution/);
});

test('install --preview prints the merged settings and the hook and writes nothing', () => {
  const repo = fakeRepo({ files: { [SETTINGS]: '{"permissions":{"allow":[]}}' } });
  const { out, code } = run(['install', '--preview'], repo.deps);
  assert.equal(code, 0);
  assert.deepEqual(repo.written, []);
  assert.match(out, /permissions/);
  assert.ok(out.includes(JSON.stringify(mergeSettings({ permissions: { allow: [] } }, SCRIPT), null, 2)));
  assert.ok(out.includes(HOOK_TEXT));
  assert.match(out, /settings\.local\.json \(changed\)/);
  assert.match(out, /pre-push \(new\)/);
  assert.match(out, /^Claude Code 2\.1\.295: v2\.1\.295 or later/m);
});

test('install writes what the preview printed, the hook executable', () => {
  const repo = fakeRepo();
  const preview = run(['install', '--preview'], fakeRepo().deps).out;
  const { out, code } = run(['install'], repo.deps);
  assert.equal(code, 0);
  assert.deepEqual(repo.written.sort(), [PRE_PUSH, SETTINGS].sort());
  assert.equal(repo.disk.get(SETTINGS), `${JSON.stringify(mergeSettings({}, SCRIPT), null, 2)}\n`);
  assert.equal(repo.disk.get(PRE_PUSH), HOOK_TEXT);
  assert.ok(repo.deps.isExecutable(PRE_PUSH));
  assert.equal(out.replace(/^Written\.\n/m, ''), preview.replace(/^Preview: nothing written\.\n/m, ''));
});

test('a second install reports both pieces unchanged', () => {
  const repo = fakeRepo();
  run(['install'], repo.deps);
  const { out } = run(['install', '--preview'], repo.deps);
  assert.match(out, /settings\.local\.json \(unchanged\)/);
  assert.match(out, /pre-push \(unchanged\)/);
});

for (const [name, version] of [
  ['older than 2.1.295', '2.1.294 (Claude Code)'],
  ['unreadable', 'Claude Code'],
  ['not found', new Error('spawn claude ENOENT')],
]) {
  test(`a claude ${name} stops the install with nothing written, preview or not`, () => {
    for (const args of [['install', '--preview'], ['install']]) {
      const repo = fakeRepo({ version });
      const { out, code } = run(args, repo.deps);
      assert.equal(code, 1);
      assert.deepEqual(repo.written, []);
      assert.match(out, /v2\.1\.295/);
      assert.doesNotMatch(out, /"attribution"/);
    }
  });
}

test('a newer claude passes, compared as numbers', () => {
  for (const version of ['2.1.295', '2.1.1000 (Claude Code)', '2.2.0', '3.0.0']) {
    assert.equal(run(['install', '--preview'], fakeRepo({ version }).deps).code, 0, version);
  }
});

test('a settings file that is not JSON stops the install with nothing written', () => {
  const repo = fakeRepo({ files: { [SETTINGS]: '{ "permissions": ' } });
  assert.throws(() => run(['install'], repo.deps), /settings\.local\.json/);
  assert.deepEqual(repo.written, []);
});

test('a missing hook script stops the install, since a hook that cannot start blocks every call', () => {
  const repo = fakeRepo();
  repo.disk.delete(SCRIPT);
  assert.throws(() => run(['install'], repo.deps), /no-attribution\.mjs/);
  assert.deepEqual(repo.written, []);
});

test('core.hooksPath set: the settings are written and the hook is not, with the reason', () => {
  const repo = fakeRepo({ hooksPath: '.husky' });
  const { out, code } = run(['install'], repo.deps);
  assert.equal(code, 0);
  assert.deepEqual(repo.written, [SETTINGS]);
  assert.match(out, /pre-push not written: core\.hooksPath is set \(\.husky\)/);
});

test("a project's own pre-push is left alone, with the reason", () => {
  const own = '#!/bin/sh\nnpm test\n';
  const repo = fakeRepo({ files: { [PRE_PUSH]: own } });
  const { out } = run(['install'], repo.deps);
  assert.deepEqual(repo.written, [SETTINGS]);
  assert.equal(repo.disk.get(PRE_PUSH), own);
  assert.match(out, /pre-push not written: .*project's own/);
});

test("a pre-push that also runs the script beside other lines is the project's", () => {
  const own = `#!/bin/sh\nnpm test\nexec node "$HOME/x/no-attribution.mjs" --pre-push "$@"\n`;
  const repo = fakeRepo({ files: { [PRE_PUSH]: own } });
  run(['install'], repo.deps);
  assert.equal(repo.disk.get(PRE_PUSH), own);
});

test("an earlier setup's pre-push, its only line running the script, is rewritten", () => {
  const earlier = '#!/bin/sh\n\nexec node "$HOME/old/no-attribution.mjs" --pre-push\n';
  const repo = fakeRepo({ files: { [PRE_PUSH]: earlier } });
  const { out } = run(['install'], repo.deps);
  assert.equal(repo.disk.get(PRE_PUSH), HOOK_TEXT);
  assert.match(out, /pre-push \(changed\)/);
});

const ownDone = (extra = {}) => ({
  [at('docs', 'agents', 'thegraph.md')]: '# x\n',
  [at('docs', 'map', 'README.md')]: 'hub\n',
  ...extra,
});

test('check, own repository: the build and the map hub', () => {
  const repo = fakeRepo({ files: ownDone() });
  const { out, code } = run(['check', '--mode', 'own', '--map', 'docs/map'], repo.deps);
  assert.equal(code, 0, out);
  assert.match(out, /^ok {3}docs\/agents\/thegraph\.md exists$/m);
  assert.match(out, /^ok {3}docs\/map\/README\.md exists$/m);
  assert.doesNotMatch(out, /settings|pre-push|CLAUDE\.local|exclude|git status/);
});

test('check fails a missing build and names it', () => {
  const { out, code } = run(['check', '--mode', 'own'], fakeRepo().deps);
  assert.equal(code, 1);
  assert.match(out, /^FAIL docs\/agents\/thegraph\.md exists/m);
});

function contributorDone(over = {}) {
  const repo = fakeRepo({
    files: {
      [at('docs', 'agents', 'thegraph.md')]: '# x\n',
      [at('CLAUDE.local.md')]: `Intro.\n\n${RULE}\n`,
      [at('.git', 'info', 'exclude')]: '# git ls-files\n/docs/agents/thegraph.md\nCLAUDE.local.md\n',
      ...over.files,
    },
    ...over,
  });
  run(['install'], repo.deps);
  repo.written.length = 0;
  return repo;
}

test('check, contributor mode: every mechanical line passes on a finished setup', () => {
  const repo = contributorDone();
  const { out, code } = run(['check', '--mode', 'contributor'], repo.deps);
  assert.equal(code, 0, out);
  for (const line of [
    'docs/agents/thegraph.md exists',
    'CLAUDE.local.md holds the contributor rule',
    '.git/info/exclude lists docs/agents/thegraph.md',
    '.git/info/exclude lists CLAUDE.local.md',
    '.claude/settings.local.json holds attribution and both matcher groups, every hook failing closed',
    '.git/hooks/pre-push is setup\'s and executable',
    'git status --short prints nothing',
  ]) assert.ok(out.includes(`ok   ${line}`), `${line}\n${out}`);
  assert.deepEqual(repo.written, [], 'check writes nothing');
  assert.doesNotMatch(out, /map/);
});

test('check reads the contributor rule from contributor.md, whitespace and quote marks aside', () => {
  const repo = contributorDone({ files: { [at('CLAUDE.local.md')]: 'Comments follow this repository.\n' } });
  const { out, code } = run(['check', '--mode', 'contributor'], repo.deps);
  assert.equal(code, 1);
  assert.match(out, /^FAIL CLAUDE\.local\.md holds the contributor rule/m);
});

test('check fails an exclude line that is missing or only part of a pattern', () => {
  const repo = contributorDone({ files: { [at('.git', 'info', 'exclude')]: 'docs/agents/thegraph.md.bak\n' } });
  const { out } = run(['check', '--mode', 'contributor'], repo.deps);
  assert.match(out, /^FAIL \.git\/info\/exclude lists docs\/agents\/thegraph\.md/m);
  assert.match(out, /^FAIL \.git\/info\/exclude lists CLAUDE\.local\.md/m);
});

test('check fails a settings file with a hook that does not fail closed', () => {
  const repo = contributorDone();
  const settings = JSON.parse(repo.disk.get(SETTINGS));
  delete settings.hooks.PreToolUse[1].hooks[0].onFailure;
  repo.disk.set(SETTINGS, JSON.stringify(settings));
  const { out, code } = run(['check', '--mode', 'contributor'], repo.deps);
  assert.equal(code, 1);
  assert.match(out, /^FAIL \.claude\/settings\.local\.json/m);
});

test('check fails a settings file with attribution kept', () => {
  const repo = contributorDone();
  const settings = JSON.parse(repo.disk.get(SETTINGS));
  delete settings.attribution;
  repo.disk.set(SETTINGS, JSON.stringify(settings));
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL \.claude\/settings\.local\.json/m);
});

test('check fails a missing or unparsable settings file without throwing', () => {
  for (const text of [null, '{']) {
    const repo = contributorDone();
    if (text === null) repo.disk.delete(SETTINGS);
    else repo.disk.set(SETTINGS, text);
    assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL \.claude\/settings\.local\.json/m);
  }
});

test('check fails a pre-push that is not executable, and passes one on Windows, saying the bit is not read', () => {
  const repo = contributorDone();
  repo.deps.isExecutable = () => false;
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL \.git\/hooks\/pre-push is setup's and executable: not executable/m);
  repo.deps.platform = 'win32';
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^ok {3}\.git\/hooks\/pre-push is setup's and executable \(the executable bit is not read on Windows\)/m);
});

test('check fails a missing pre-push where one should have been written', () => {
  const repo = contributorDone();
  repo.disk.delete(PRE_PUSH);
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL \.git\/hooks\/pre-push is setup's and executable: missing/m);
});

test("check fails an earlier setup's pre-push that install would rewrite", () => {
  const repo = contributorDone();
  repo.disk.set(PRE_PUSH, '#!/bin/sh\nexec node "$HOME/old/no-attribution.mjs" --pre-push\n');
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL \.git\/hooks\/pre-push is setup's and executable: differs from what install writes$/m);
});

test('check passes an unwritten pre-push with the reason', () => {
  const repo = contributorDone({ hooksPath: '.husky' });
  const { out, code } = run(['check', '--mode', 'contributor'], repo.deps);
  assert.equal(code, 0, out);
  assert.match(out, /^ok {3}\.git\/hooks\/pre-push not written: core\.hooksPath is set \(\.husky\)/m);
});

test('check fails a dirty status in contributor mode, naming what it printed', () => {
  const repo = contributorDone({ status: '?? CLAUDE.local.md\n' });
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL git status --short prints nothing: \?\? CLAUDE\.local\.md$/m);
});

test('check, own repository with attribution off: the attribution lines and not the contributor ones', () => {
  const repo = fakeRepo({ files: ownDone() });
  run(['install'], repo.deps);
  const { out, code } = run(['check', '--mode', 'own', '--map', 'docs/map', '--attribution'], repo.deps);
  assert.equal(code, 0, out);
  assert.match(out, /settings\.local\.json/);
  assert.match(out, /pre-push/);
  assert.doesNotMatch(out, /CLAUDE\.local|exclude|git status/);
});

test('the arguments are checked', () => {
  const { deps } = fakeRepo();
  assert.throws(() => run([], deps), /Usage/);
  assert.throws(() => run(['check'], deps), /--mode/);
  assert.throws(() => run(['check', '--mode', 'mine'], deps), /--mode/);
  assert.throws(() => run(['check', '--mode', 'contributor', '--map', 'docs/map'], deps), /--map/);
  assert.throws(() => run(['install', '--mode', 'own'], deps), /install takes/);
  assert.throws(() => run(['check', '--mode', 'own', '--preview'], deps), /check takes/);
});

test('in a linked worktree, where git names the gitdir by an absolute path, install and check use that path', () => {
  const common = '/main/.git';
  const hook = join(common, 'hooks', 'pre-push');
  const exclude = join(common, 'info', 'exclude');
  const repo = fakeRepo({
    gitDir: common,
    files: {
      [at('docs', 'agents', 'thegraph.md')]: '# x\n',
      [at('CLAUDE.local.md')]: `${RULE}\n`,
      [exclude]: 'docs/agents/thegraph.md\nCLAUDE.local.md\n',
    },
  });
  run(['install'], repo.deps);
  assert.deepEqual(repo.written.sort(), [SETTINGS, hook].sort());
  const { out, code } = run(['check', '--mode', 'contributor'], repo.deps);
  assert.equal(code, 0, out);
  assert.match(out, /^ok {3}\.git\/info\/exclude lists CLAUDE\.local\.md$/m);
  repo.disk.delete(hook);
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL \.git\/hooks\/pre-push is setup's and executable: missing/m);
});

test('a contributor.md checked out with CRLF line ends still yields the whole rule', () => {
  const repo = contributorDone({ files: { [at('CLAUDE.local.md')]: 'Comments follow this repository, not a rule written here. Before writing one,\n' } });
  const file = join(SKILL, 'contributor.md');
  repo.disk.set(file, repo.disk.get(file).replace(/\n/g, '\r\n'));
  assert.match(run(['check', '--mode', 'contributor'], repo.deps).out, /^FAIL CLAUDE\.local\.md holds the contributor rule/m);
});

test('check takes --map as an absolute path as well as one relative to the root', () => {
  const repo = fakeRepo({ files: ownDone() });
  const { out, code } = run(['check', '--mode', 'own', '--map', at('docs', 'map')], repo.deps);
  assert.equal(code, 0, out);
  assert.match(out, /README\.md exists$/m);
});
