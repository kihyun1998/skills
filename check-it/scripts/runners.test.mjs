import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { CheckItError, OutOfUsage, REVIEWS, RunnerFailed, SKILLS, run } from './assemble.mjs';
import { CALLERS, RUNNERS, codexVerdict, hookCommand, locateCodex, readEvents, readModels, route, spawnRunner } from './runners.mjs';

const REPO = resolve('/work/repo');
const RUN = resolve('/work/run');
const CHECK_IT = join(SKILLS, 'check-it');
const REPORT = join(RUN, 'check-it.bug.md');
const NODE = 'C:/node/node.exe';
const HOOK = join(CHECK_IT, 'scripts', 'codex-hook.mjs');

const event = (e) => `${JSON.stringify(e)}\n`;
const completed = (input, cached, output) => event({ type: 'turn.completed', usage: { input_tokens: input, cached_input_tokens: cached, output_tokens: output } });

const level = (effort) => ({ effort, description: effort });
const CATALOG = JSON.stringify({ models: [
  { slug: 'gpt-6.1-sol', supported_reasoning_levels: ['low', 'medium', 'high', 'xhigh'].map(level) },
  { slug: 'gpt-6-luna', supported_reasoning_levels: ['low', 'medium', 'high'].map(level) },
] });
const isListing = (args) => args.at(-2) === 'debug' && args.at(-1) === 'models';

function fakeDeps({ located = { command: 'codex', args: [] }, outcome, listing = () => ({ stdout: CATALOG }), realParts = false } = {}) {
  const files = realParts ? {} : {
    [join(CHECK_IT, 'reviewers/brief.md')]: 'BRIEF repo={{repo}} issue={{issue}}\nchange: {{change}}',
    [join(CHECK_IT, 'reviewers/bug.md')]: 'BUG PART',
    [join(CHECK_IT, 'reviewers/spec-rules.md')]: 'SPEC PART',
    [join(CHECK_IT, 'reviewers/decision-model.md')]: 'PICK PART\n\n## At the confirm stop\n\nCONFIRM PART',
    [join(CHECK_IT, 'reviewers/proving.md')]: 'PROVING PART',
    [join(CHECK_IT, 'reviewers/proving-copy.md')]: 'COPY PART tree={{copy_tree}} folder={{copy_folder}}',
    [join(CHECK_IT, 'SKILL.md')]: '# check-it\n\n## Whose is it\n\nWHOSE\n\n## Next\n',
  };
  const dirs = new Set([RUN]);
  const ledger = [];
  const copied = [];
  const listed = [];
  const spawned = [];
  const moved = [];
  const removed = [];
  let clock = 1_000;
  const deps = {
    cwd: resolve('/work'),
    skills: SKILLS,
    readFile: (p) => {
      if (p in files) return files[p];
      if (realParts && p.startsWith(SKILLS)) return readFileSync(p, 'utf8');
      throw new Error(`ENOENT: ${p}`);
    },
    isDir: (p) => dirs.has(p),
    isFile: (p) => p in files,
    exists: (p) => p in files || dirs.has(p),
    realPath: (p) => p,
    hash: () => null,
    listDir: () => [],
    git: (dir, args) => {
      if (args[0] === 'rev-parse') return `${REPO}\n`;
      if (args[0] === 'diff') return 'src/a.js\0';
      if (args[0] === 'ls-files') return args.includes('-z') ? 'src/a.js\0README.md\0' : '';
      throw new Error(`unexpected git ${args.join(' ')}`);
    },
    locate: (runner) => (runner === 'codex' ? located : undefined),
    node: NODE,
    spawn: (command, args, opts) => {
      if (isListing(args)) {
        listed.push({ command, args, opts });
        const l = listing();
        return { status: l.status ?? 0, stdout: l.stdout ?? '', stderr: l.stderr ?? '', ...(l.error && { error: l.error }) };
      }
      spawned.push({ command, args, opts, copyThere: [...dirs].filter((d) => d.startsWith(join(RUN, 'proving'))) });
      const o = outcome({ args, files });
      clock += o.ms ?? 0;
      return { status: o.error ? null : (o.status ?? 0), stdout: o.stdout ?? '', stderr: o.stderr ?? '', ...(o.error && { error: o.error }) };
    },
    now: () => clock,
    moveFile: (from, to) => {
      moved.push([from, to]);
      files[to] = files[from];
      delete files[from];
    },
    removeFile: (p) => {
      removed.push(p);
      delete files[p];
    },
    makeDir: (p) => dirs.add(p),
    appendFile: (p, text) => ledger.push([p, text]),
    copyEntry: (from, to) => copied.push([from, to]),
    makeFolder: (p) => {
      if (dirs.has(p)) return false;
      dirs.add(p);
      return true;
    },
    removeTree: (p) => {
      for (const d of [...dirs]) if (d === p || d.startsWith(`${p}${sep}`)) dirs.delete(d);
      return 2048;
    },
  };
  return { deps, spawned, listed, moved, removed, files, dirs, ledger, copied };
}

const outFile = (args) => args[args.indexOf('-o') + 1];
const writes = (text, stdout, extra = {}) => ({ args, files }) => {
  if (text !== undefined) files[outFile(args)] = text;
  return { stdout, ...extra };
};

const base = ['--issue', 'owner/repo#7', '--run-folder', RUN, '--ledger', '/work/run.md'];
const runBug = (deps, extra = []) => run(['run', 'bug', '--caller', 'claude', '--runner', 'codex', '--model', 'gpt-6.1-sol', ...base, ...extra], deps);
const throwsCheck = (fn, pattern) => assert.throws(fn, (err) => err instanceof CheckItError && pattern.test(err.message));

test('a Codex review is codex exec with read-only files and the network on, no token variables, no sub-agents, under the hook, with the prompt on stdin, in the repository', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('REPORT', completed(100, 40, 7)) });
  runBug(deps);
  assert.equal(spawned.length, 1);
  const { command, args, opts } = spawned[0];
  assert.equal(command, 'codex');
  assert.deepEqual(args, [
    'exec', '-c', 'windows.sandbox="unelevated"',
    '-c', 'default_permissions="check-it-review"', '-c', 'permissions.check-it-review.extends=":read-only"',
    '-c', 'permissions.check-it-review.network.enabled=true',
    '-c', 'shell_environment_policy.inherit="core"', '--disable', 'multi_agent', '--disable', 'apps', '-c', 'approval_policy="never"',
    '-c', `hooks.PreToolUse=[{matcher="^Bash$",hooks=[{type="command",command=${JSON.stringify(`${NODE} ${HOOK}`)},timeout=30}]}]`,
    '--dangerously-bypass-hook-trust',
    '--ephemeral', '--ignore-user-config', '-m', 'gpt-6.1-sol', '-C', REPO, '--json', '-o', `${REPORT}.part`,
  ]);
  assert.equal(opts.cwd, REPO);
  assert.equal(opts.timeout, 30 * 60 * 1000);
  assert.equal(opts.input, run(['prompt', 'bug', ...base], deps));
});

test('the hook command is node and the script unquoted, and none where either path would need quotes', () => {
  assert.equal(hookCommand('C:\\node\\node.exe', 'D:\\s\\codex-hook.mjs'), 'C:\\node\\node.exe D:\\s\\codex-hook.mjs');
  for (const node of ['C:\\Program Files\\nodejs\\node.exe', 'C:\\a"b\\node.exe', 'C:\\a;b\\node.exe', 'C:\\a$b\\node.exe']) assert.equal(hookCommand(node, 'D:\\s\\h.mjs'), undefined, node);
  assert.equal(hookCommand('C:\\node.exe', 'C:\\Users\\A B\\h.mjs'), undefined);
});

test('a node or skills path that would need quotes falls back before codex starts', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
  deps.node = 'C:\\Program Files\\nodejs\\node.exe';
  assert.throws(() => runBug(deps), (err) => err instanceof RunnerFailed && /would need quotes/.test(err.message) && /Claude model/.test(err.message));
  assert.equal(spawned.length, 0);
});

const hookInput = (command, toolName = 'Bash') => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: { command }, cwd: SKILLS });

test('the Codex hook denies by JSON what check-it-reviewer\'s hook refuses, and says nothing to a read', () => {
  const denied = JSON.parse(codexVerdict(hookInput('codex exec hi'), { platform: 'linux', env: {} }));
  assert.equal(denied.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /^check-it on Codex: a review starts no model run/);
  assert.equal(codexVerdict(hookInput('git status'), { platform: 'linux', env: {} }), '');
  assert.equal(JSON.parse(codexVerdict('not json', { platform: 'linux', env: {} })).hookSpecificOutput.permissionDecision, 'deny');
});

test('on Windows the Codex hook reads the command as PowerShell, which Codex runs it in though it names it Bash', () => {
  const out = join(tmpdir(), 'check-it-copy');
  const command = `Set-Location ${out} -ErrorAction Stop; Remove-Item x.txt`;
  assert.equal(codexVerdict(hookInput(command), { platform: 'win32', env: {} }), '');
  assert.match(codexVerdict(hookInput(command), { platform: 'linux', env: {} }), /"deny"/);
});

test('the Codex hook judges the repository Codex runs in, not one an inherited CLAUDE_PROJECT_DIR names', () => {
  const elsewhere = { CLAUDE_PROJECT_DIR: tmpdir() };
  assert.match(codexVerdict(hookInput('Remove-Item README.md'), { platform: 'win32', env: elsewhere }), /"deny"/);
});

test('the located launcher goes first, so a Windows npm install runs through node', () => {
  const { deps, spawned } = fakeDeps({ located: { command: 'node.exe', args: ['C:/npm/codex.js'] }, outcome: writes('R', completed(1, 0, 1)) });
  runBug(deps);
  assert.equal(spawned[0].command, 'node.exe');
  assert.deepEqual(spawned[0].args.slice(0, 2), ['C:/npm/codex.js', 'exec']);
});

test('the report is moved to the name check-it gives it, and the cost line sums every turn with the wall time', () => {
  const stdout = event({ type: 'thread.started', thread_id: 't' }) + completed(100, 40, 7) + 'not json\n' + completed(36, 5, 3);
  const { deps, files, moved } = fakeDeps({ outcome: writes('THE REPORT', stdout, { ms: 61_400 }) });
  const out = runBug(deps);
  assert.deepEqual(moved, [[`${REPORT}.part`, REPORT]]);
  assert.equal(files[REPORT], 'THE REPORT');
  assert.equal(out, `report: ${REPORT}\ncost: bug on Codex gpt-6.1-sol: 61 s, 136 input tokens (45 cached), 10 output tokens\n`);
});

test('with --sheet the report goes beside the run sheet, as name prints it', () => {
  const { deps, files } = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
  const out = runBug(deps, ['--sheet', '/work/sheet.md']);
  assert.ok(files[resolve('/work/sheet.bug.md')] === 'R', out);
  assert.match(out, /^report: .*sheet\.bug\.md\n/);
});

test('out of usage is its own failure, exit 3, naming the fallback, and leaves no report', () => {
  for (const message of [
    "You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), or try again at 4:05 PM.",
    'You\u2019ve hit your usage limit.',
    'Quota exceeded. Check your plan and billing details.',
    "Usage limit reached. You've reached your usage limit. Increase your limits to continue using codex.",
    "You're out of credits. Your workspace is out of credits. Add credits to continue using Codex.",
    'You hit your spend cap set in your workspace. Increase your spend cap to continue.',
  ]) {
    const stdout = event({ type: 'error', message }) + event({ type: 'turn.failed', error: { message } });
    const { deps, files } = fakeDeps({ outcome: writes('', stdout, { status: 1 }) });
    assert.throws(() => runBug(deps), (err) => err instanceof OutOfUsage && err.exitCode === 3
      && err.message.includes(message) && /Claude model/.test(err.message), message);
    assert.ok(!(REPORT in files));
    assert.ok(!(`${REPORT}.part` in files));
  }
});

test('another failure is exit 4, carrying what codex said and naming the fallback, not out of usage', () => {
  const stdout = event({ type: 'turn.failed', error: { message: 'stream disconnected before completion' } });
  const { deps } = fakeDeps({ outcome: writes(undefined, stdout, { status: 1, stderr: 'some stderr' }) });
  assert.throws(() => runBug(deps), (err) => err instanceof RunnerFailed && !(err instanceof OutOfUsage) && err.exitCode === 4
    && /stream disconnected before completion/.test(err.message) && /exit 1/.test(err.message) && /Claude model/.test(err.message));
});

test('a .part an earlier run left is removed before codex starts, so it is never taken as this run\'s report', () => {
  const { deps, files } = fakeDeps({ outcome: writes(undefined, completed(1, 0, 1)) });
  files[`${REPORT}.part`] = 'STALE PREVIOUS REVIEW';
  assert.throws(() => runBug(deps), (err) => err instanceof RunnerFailed && /wrote no report/.test(err.message));
  assert.ok(!(REPORT in files));
  assert.ok(!(`${REPORT}.part` in files));
});

test('a run past the time limit, or one that cannot start, falls back and leaves no .part', () => {
  const late = fakeDeps({ outcome: writes('HALF', '', { error: Object.assign(new Error('spawnSync codex ETIMEDOUT'), { code: 'ETIMEDOUT' }) }) });
  assert.throws(() => runBug(late.deps), (err) => err instanceof RunnerFailed && /did not finish bug in 30 min/.test(err.message));
  assert.ok(!(`${REPORT}.part` in late.files) && !(REPORT in late.files));
  const unstarted = fakeDeps({ outcome: writes('HALF', '', { error: Object.assign(new Error('spawn EACCES'), { code: 'EACCES' }) }) });
  assert.throws(() => runBug(unstarted.deps), (err) => err instanceof RunnerFailed && /could not be started/.test(err.message));
  assert.ok(!(`${REPORT}.part` in unstarted.files));
});

test('out of usage said only on stderr is still out of usage', () => {
  const { deps } = fakeDeps({ outcome: writes(undefined, '', { status: 1, stderr: "ERROR: You've hit your usage limit." }) });
  assert.throws(() => runBug(deps), (err) => err instanceof OutOfUsage);
});

test('a run that exits 0 with an empty report, or no completed turn, is not a review', () => {
  const empty = fakeDeps({ outcome: writes('  \n', completed(1, 0, 1)) });
  assert.throws(() => runBug(empty.deps), (err) => err instanceof RunnerFailed && /wrote no report/.test(err.message));
  assert.ok(!(REPORT in empty.files));
  const missing = fakeDeps({ outcome: writes(undefined, completed(1, 0, 1)) });
  assert.throws(() => runBug(missing.deps), (err) => err instanceof RunnerFailed && /wrote no report/.test(err.message));
  const noTurn = fakeDeps({ outcome: writes('R', event({ type: 'thread.started' })) });
  assert.throws(() => runBug(noTurn.deps), (err) => err instanceof RunnerFailed && /no turn\.completed/.test(err.message));
});

test('a review that reproduces or picks does not run on another runner', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
  for (const review of ['proving', 'pick', 'pick-confirm']) {
    throwsCheck(() => run(['run', review, '--caller', 'claude', '--runner', 'codex', '--model', 'm', ...base], deps), /runs only on Claude/);
  }
  assert.equal(spawned.length, 0);
});

test('the runner and the model are required, and an unknown runner or a missing codex stops before anything runs', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
  throwsCheck(() => run(['run', 'bug', '--caller', 'claude', '--model', 'm', ...base], deps), /needs --runner/);
  throwsCheck(() => run(['run', 'bug', '--caller', 'claude', '--runner', 'codex', ...base], deps), /needs --model/);
  throwsCheck(() => run(['run', 'bug', '--caller', 'claude', '--runner', 'gemini', '--model', 'm', ...base], deps), /no runner named gemini; one of codex/);
  const gone = fakeDeps({ located: null, outcome: writes('R', completed(1, 0, 1)) });
  assert.throws(() => runBug(gone.deps), (err) => err instanceof RunnerFailed && /codex is not on PATH/.test(err.message));
  assert.equal(spawned.length + gone.spawned.length, 0);
});

test('readEvents sums usage across turns and keeps every error message, skipping lines that are not JSON', () => {
  const r = readEvents(completed(2, 1, 3) + '{bad\n' + event({ type: 'error', message: 'a' }) + event({ type: 'turn.failed', error: { message: 'b' } }) + completed(4, 0, 5));
  assert.deepEqual(r, { usage: { input: 6, cached: 1, output: 8 }, errors: ['a', 'b'] });
  assert.deepEqual(readEvents(''), { usage: undefined, errors: [] });
});

test('codex is located as the shell would find it, and an npm install on Windows runs its codex.js through node', () => {
  const dirs = ['C:/a', 'C:/npm'];
  const has = (...files) => (p) => files.includes(p.replaceAll('\\', '/'));
  assert.deepEqual(locateCodex({ platform: 'linux', pathDirs: dirs, isFile: has(), execPath: 'node' }), { command: 'codex', args: [] });
  assert.deepEqual(
    locateCodex({ platform: 'win32', pathDirs: dirs, isFile: has('C:/npm/codex.cmd', 'C:/npm/node_modules/@openai/codex/bin/codex.js'), execPath: 'N' }),
    { command: 'N', args: [join('C:/npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js')] },
  );
  assert.deepEqual(
    locateCodex({ platform: 'win32', pathDirs: dirs, isFile: has('C:/a/codex.exe', 'C:/npm/codex.cmd', 'C:/npm/node_modules/@openai/codex/bin/codex.js'), execPath: 'N' }),
    { command: join('C:/a', 'codex.exe'), args: [] },
  );
  assert.equal(locateCodex({ platform: 'win32', pathDirs: dirs, isFile: has('C:/npm/codex.cmd'), execPath: 'N' }), undefined);
});

test('a runner entry carries how it is found, started and read, so another CLI is one more entry', () => {
  assert.deepEqual(Object.keys(RUNNERS), ['codex']);
  assert.equal(RUNNERS.codex.locate, locateCodex);
  assert.equal(RUNNERS.codex.read, readEvents);
  assert.equal(typeof RUNNERS.codex.args, 'function');
  assert.equal(typeof RUNNERS.codex.outOfUsage, 'function');
  assert.equal(RUNNERS.codex.hook({ node: 'C:\\n\\node.exe', skills: 'D:\\s' }), `C:\\n\\node.exe ${join('D:\\s', 'check-it', 'scripts', 'codex-hook.mjs')}`);
});

test('a timed-out run leaves no process behind on Windows, where codex.js starts codex.exe as a child', { skip: process.platform !== 'win32' && 'codex.js execs codex.exe in place elsewhere' }, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'check-it-spawn-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const pidFile = join(dir, 'grandchild.pid');
  const parent = join(dir, 'parent.cjs');
  writeFileSync(parent, `const { spawn } = require('node:child_process');
const c = spawn('ping.exe', ['-n', '600', '127.0.0.1'], { stdio: 'ignore', windowsHide: true });
require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(c.pid));
setTimeout(() => {}, 600000);`);
  const r = spawnRunner(process.execPath, [parent], { cwd: dir, input: '', timeout: 3000 });
  assert.equal(r.error?.code, 'ETIMEDOUT');
  const pid = Number(readFileSync(pidFile, 'utf8'));
  let alive = true;
  try {
    process.kill(pid, 0);
  } catch {
    alive = false;
  }
  if (alive) process.kill(pid);
  assert.equal(alive, false, `grandchild ${pid} outlived the timeout`);
});

const FINDINGS = resolve('/work/run.bug.md');
const CHANGE = resolve('/work/run.change.md');
const COPY = join(RUN, 'proving');
const NEEDS = { proving: ['--findings', FINDINGS], 'pick-confirm': ['--change', CHANGE] };
const fromCodex = (deps, review, extra = []) => run(['run', review, '--caller', 'codex', '--runner', 'codex', '--model', 'gpt-6.1-sol', '--effort', 'high', ...base, ...(NEEDS[review] ?? []), ...extra], deps);
const withInputs = (f) => {
  f.files[FINDINGS] = 'BUG FINDING ONE';
  f.files[CHANGE] = 'THE ISSUE AND TWO STATEMENTS';
  return f;
};
const CLAUDE_WORDS = /Agent|Skill|Claude|opus|sonnet|haiku|fable|~\/\.claude/i;

test('from Codex, every role, the decision model and the proving agent included, runs as codex exec through the script, from the real briefs (test double for codex)', () => {
  for (const review of Object.keys(REVIEWS)) {
    const f = withInputs(fakeDeps({ realParts: true, outcome: writes(`REPORT OF ${review}`, completed(10, 0, 2)) }));
    const out = fromCodex(f.deps, review);
    assert.equal(f.spawned.length, 1, review);
    const { args, opts } = f.spawned[0];
    assert.equal(args[0], 'exec', review);
    assert.deepEqual(args.slice(args.indexOf('-m'), args.indexOf('-m') + 4), ['-m', 'gpt-6.1-sol', '-c', 'model_reasoning_effort="high"'], review);
    assert.ok(args.includes('permissions.check-it-review.extends=":read-only"'), review);
    assert.ok(args.includes('--dangerously-bypass-hook-trust'), review);
    assert.ok(opts.input.startsWith('# How you work'), review);
    const report = join(RUN, `check-it.${review}.md`);
    assert.equal(f.files[report], `REPORT OF ${review}`, review);
    assert.equal(out, `report: ${report}\ncost: ${review} on Codex gpt-6.1-sol high: 0 s, 10 input tokens (0 cached), 2 output tokens\n`, review);
  }
});

test('from Codex, a failed run is reported as not run, never as passed, with no other product named to fall back to (test double for codex)', () => {
  const said = (message) => event({ type: 'turn.failed', error: { message } });
  const cases = [
    ['out of usage', {}, writes(undefined, said("You've hit your usage limit."), { status: 1 }), OutOfUsage, 3, /Codex is out of usage/],
    ['another failure', {}, writes(undefined, said('stream disconnected before completion'), { status: 1 }), RunnerFailed, 4, /failed on bug, exit 1: stream disconnected/],
    ['no codex on PATH', { located: null }, writes('R', completed(1, 0, 1)), RunnerFailed, 4, /codex is not on PATH/],
    ['a listing codex cannot give', { listing: () => ({ status: 1, stderr: 'not logged in' }) }, writes('R', completed(1, 0, 1)), RunnerFailed, 4, /could not list its models with debug models \(exit 1: not logged in\)/],
    ['a listing that is not a catalog', { listing: () => ({ stdout: 'hello' }) }, writes('R', completed(1, 0, 1)), RunnerFailed, 4, /is not a model catalog/],
    ['no report', {}, writes(undefined, completed(1, 0, 1)), RunnerFailed, 4, /wrote no report/],
    ['an empty report', {}, writes(' \n', completed(1, 0, 1)), RunnerFailed, 4, /wrote no report/],
    ['no completed turn, so no cost', {}, writes('R', event({ type: 'thread.started' })), RunnerFailed, 4, /no turn\.completed/],
    ['the time limit', {}, writes('HALF', '', { error: Object.assign(new Error('spawnSync codex ETIMEDOUT'), { code: 'ETIMEDOUT' }) }), RunnerFailed, 4, /did not finish bug in 30 min/],
  ];
  for (const [name, options, outcome, kind, exitCode, pattern] of cases) {
    const f = fakeDeps({ ...options, outcome });
    assert.throws(() => fromCodex(f.deps, 'bug'), (err) => err instanceof kind && err.exitCode === exitCode && pattern.test(err.message)
      && err.message.endsWith('Codex has no other product to fall back to, so report bug as not run, never as passed')
      && !CLAUDE_WORDS.test(err.message), name);
    assert.ok(!(join(RUN, 'check-it.bug.md') in f.files), name);
    assert.ok(!(join(RUN, 'check-it.bug.md.part') in f.files), name);
  }
});

test('a model or an effort the runner\'s own listing does not name is refused before codex starts, from either product, and none is put in its place (test double for codex)', () => {
  for (const caller of ['codex', 'claude']) {
    const unknown = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
    assert.throws(() => run(['run', 'bug', '--caller', caller, '--runner', 'codex', '--model', 'gpt-9-sol', ...base], unknown.deps), (err) => err instanceof CheckItError && !(err instanceof RunnerFailed)
      && err.message === 'Codex lists no model named gpt-9-sol, so bug was not started, and no other is put in its place; it lists gpt-6.1-sol, gpt-6-luna', caller);
    assert.equal(unknown.listed.length, 1, caller);
    assert.equal(unknown.spawned.length, 0, caller);
    const effort = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
    assert.throws(() => run(['run', 'spec-rules', '--caller', caller, '--runner', 'codex', '--model', 'gpt-6-luna', '--effort', 'xhigh', ...base], effort.deps), (err) => err instanceof CheckItError && !(err instanceof RunnerFailed)
      && err.message === "Codex's gpt-6-luna takes no effort xhigh, so spec-rules was not started, and no other is put in its place; it takes low, medium, high", caller);
    assert.equal(effort.spawned.length, 0, caller);
  }
});

test('the proving agent on Codex reproduces in a copy the script makes, the one folder its sandbox may write, and the copy goes with its ledger lines whether the run passed or failed (test double for codex)', () => {
  const ledgerFile = resolve('/work/run.md');
  for (const [name, outcome, passes] of [['passed', writes('PROVEN', completed(1, 0, 1)), true], ['failed', writes(undefined, '', { status: 2 }), false]]) {
    const f = withInputs(fakeDeps({ outcome }));
    if (passes) fromCodex(f.deps, 'proving');
    else assert.throws(() => fromCodex(f.deps, 'proving'), (err) => err instanceof RunnerFailed && /not run, never as passed/.test(err.message), name);
    const { args, opts, copyThere } = f.spawned[0];
    assert.ok(args.includes(`permissions.check-it-review.filesystem={${JSON.stringify(COPY)}="write"}`), name);
    assert.equal(args.filter((a) => a.includes('="write"')).length, 1, name);
    assert.equal(args[args.indexOf('-C') + 1], REPO, name);
    assert.deepEqual(copyThere.sort(), [COPY, join(COPY, 'tree')], name);
    assert.deepEqual(f.copied, [[join(REPO, 'src/a.js'), join(COPY, 'tree', 'src/a.js')], [join(REPO, 'README.md'), join(COPY, 'tree', 'README.md')]], name);
    assert.ok(opts.input.includes(`COPY PART tree=${join(COPY, 'tree')} folder=${COPY}`), name);
    assert.ok(opts.input.indexOf('PROVING PART') < opts.input.indexOf('COPY PART') && opts.input.indexOf('COPY PART') < opts.input.indexOf('WHOSE'), name);
    assert.ok(![...f.dirs].some((d) => d.startsWith(COPY)), name);
    assert.deepEqual(f.ledger, [[ledgerFile, `${COPY} | check-it run proving | copy | step end\n`], [ledgerFile, `${COPY} | deleted, 2.0K\n`]], name);
  }
});

test('a proving folder an earlier run left is not taken over or deleted: the run stops before anything starts (test double for codex)', () => {
  const f = withInputs(fakeDeps({ outcome: writes('R', completed(1, 0, 1)) }));
  f.dirs.add(COPY);
  assert.throws(() => fromCodex(f.deps, 'proving'), (err) => err instanceof CheckItError && !(err instanceof RunnerFailed) && /proving is already there/.test(err.message));
  assert.equal(f.spawned.length, 0);
  assert.ok(f.dirs.has(COPY));
  assert.deepEqual(f.ledger, []);
});

test('no review but the proving agent gets a folder to write, and the proving prompt Claude is handed has no copy in it (test double for codex)', () => {
  const f = withInputs(fakeDeps({ outcome: writes('R', completed(1, 0, 1)) }));
  fromCodex(f.deps, 'bug');
  assert.ok(!f.spawned[0].args.some((a) => a.includes('="write"')));
  assert.deepEqual(f.copied, []);
  assert.ok(!run(['prompt', 'proving', ...base, '--findings', FINDINGS], f.deps).includes('COPY PART'));
});

test('the calling product is required, and each product reaches only the runners its column names', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
  throwsCheck(() => run(['run', 'bug', '--runner', 'codex', '--model', 'gpt-6.1-sol', ...base], deps), /needs --caller <product>, the product running check-it, one of claude, codex/);
  throwsCheck(() => run(['run', 'bug', '--caller', 'gemini', '--runner', 'codex', '--model', 'gpt-6.1-sol', ...base], deps), /no calling product named gemini; one of claude, codex/);
  throwsCheck(() => run(['run', 'bug', '--caller', 'codex', '--runner', 'claude', '--model', 'opus', ...base], deps), /^no runner named claude; one of codex$/);
  throwsCheck(() => run(['run', 'bug', '--caller', 'claude', '--runner', 'claude', '--model', 'opus', ...base], deps), /a review on Claude Code itself is started with Agent/);
  assert.equal(spawned.length, 0);
  assert.deepEqual(route('proving', 'codex', 'codex').refused, undefined);
  assert.match(route('proving', 'claude', 'codex').refused, /runs only on Claude Code itself/);
  assert.match(route('bug', 'claude', 'codex').fallBack, /^Run bug again with Agent as check-it-reviewer on its Claude model/);
  assert.equal(route('bug', 'codex', 'codex').fallBack, 'Codex has no other product to fall back to, so report bug as not run, never as passed');
  assert.deepEqual(Object.keys(CALLERS), ['claude', 'codex']);
});

test('readModels reads each slug with its efforts, and anything that is not a catalog as none', () => {
  assert.deepEqual(readModels(CATALOG), new Map([['gpt-6.1-sol', ['low', 'medium', 'high', 'xhigh']], ['gpt-6-luna', ['low', 'medium', 'high']]]));
  assert.deepEqual(readModels(JSON.stringify({ models: [{ slug: 'a', supported_reasoning_levels: ['low'] }, { name: 'no slug' }, { slug: 'b' }] })), new Map([['a', ['low']], ['b', []]]));
  for (const text of ['', 'not json', 'null', '{"models":{}}', '[]']) assert.equal(readModels(text), undefined, text);
});

test('from Codex, the decision model at a cluster\'s confirm stop saves each child\'s answer under its own name, as name --child puts it (test double for codex)', () => {
  const f = withInputs(fakeDeps({ outcome: writes('PICKED', completed(1, 0, 1)) }));
  const out = fromCodex(f.deps, 'pick-confirm', ['--sheet', '/work/sheet.md', '--child', '#12']);
  assert.equal(f.files[resolve('/work/sheet.12.pick-confirm.md')], 'PICKED');
  assert.match(out, /^report: .*sheet\.12\.pick-confirm\.md\n/);
  throwsCheck(() => fromCodex(f.deps, 'bug', ['--sheet', '/work/sheet.md', '--child', '#12']), /--child applies only to/);
  throwsCheck(() => fromCodex(f.deps, 'pick-confirm', ['--child', '#12']), /--child needs --sheet/);
});

test('a proving folder another run makes between the look and the make is not shared: making it is the check, and the run stops (test double for codex)', () => {
  const f = withInputs(fakeDeps({ outcome: writes('R', completed(1, 0, 1)) }));
  f.deps.exists = () => false;
  const make = f.deps.makeFolder;
  f.deps.makeFolder = (p) => {
    if (p === COPY) f.dirs.add(COPY);
    return make(p);
  };
  assert.throws(() => fromCodex(f.deps, 'proving'), (err) => err instanceof CheckItError && !(err instanceof RunnerFailed) && /proving is already there, made by another proving run/.test(err.message));
  assert.equal(f.spawned.length, 0);
  assert.ok(f.dirs.has(COPY));
  assert.deepEqual(f.ledger, []);
});

test('a copy the script cannot delete is named in what it prints, its ledger line left open, and the review\'s outcome kept (test double for codex)', () => {
  const ledgerFile = resolve('/work/run.md');
  const stuck = () => {
    throw new Error('EACCES: permission denied');
  };
  const ok = withInputs(fakeDeps({ outcome: writes('PROVEN', completed(1, 0, 1)) }));
  ok.deps.removeTree = stuck;
  const out = fromCodex(ok.deps, 'proving');
  assert.match(out, /^report: .*check-it\.proving\.md\ncost: .*\nleft: Its copy .*proving could not be deleted \(EACCES: permission denied\), so delete it as its line in the ledger says\.\n$/);
  assert.equal(ok.files[join(RUN, 'check-it.proving.md')], 'PROVEN');
  assert.deepEqual(ok.ledger, [[ledgerFile, `${COPY} | check-it run proving | copy | step end\n`]]);
  const bad = withInputs(fakeDeps({ outcome: writes(undefined, '', { status: 2 }) }));
  bad.deps.removeTree = stuck;
  assert.throws(() => fromCodex(bad.deps, 'proving'), (err) => err instanceof RunnerFailed && err.exitCode === 4
    && /not run, never as passed\. Its copy .*proving could not be deleted \(EACCES: permission denied\)/.test(err.message));
});
