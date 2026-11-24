import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CheckItError, OutOfUsage, RunnerFailed, SKILLS, run } from './assemble.mjs';
import { RUNNERS, locateCodex, readEvents, spawnRunner } from './runners.mjs';

const REPO = resolve('/work/repo');
const RUN = resolve('/work/run');
const CHECK_IT = join(SKILLS, 'check-it');
const REPORT = join(RUN, 'check-it.bug.md');

const event = (e) => `${JSON.stringify(e)}\n`;
const completed = (input, cached, output) => event({ type: 'turn.completed', usage: { input_tokens: input, cached_input_tokens: cached, output_tokens: output } });

function fakeDeps({ located = { command: 'codex', args: [] }, outcome } = {}) {
  const files = {
    [join(CHECK_IT, 'reviewers/brief.md')]: 'BRIEF repo={{repo}} issue={{issue}}\nchange: {{change}}',
    [join(CHECK_IT, 'reviewers/bug.md')]: 'BUG PART',
    [join(CHECK_IT, 'reviewers/spec-rules.md')]: 'SPEC PART',
  };
  const spawned = [];
  const moved = [];
  const removed = [];
  let clock = 1_000;
  const deps = {
    cwd: resolve('/work'),
    skills: SKILLS,
    readFile: (p) => {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
    isDir: (p) => p === RUN,
    isFile: (p) => p in files,
    exists: (p) => p in files,
    realPath: (p) => p,
    hash: () => null,
    listDir: () => [],
    git: (dir, args) => {
      if (args[0] === 'rev-parse') return `${REPO}\n`;
      if (args[0] === 'diff') return 'src/a.js\0';
      if (args[0] === 'ls-files') return '';
      throw new Error(`unexpected git ${args.join(' ')}`);
    },
    locate: (runner) => (runner === 'codex' ? located : undefined),
    spawn: (command, args, opts) => {
      spawned.push({ command, args, opts });
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
  };
  return { deps, spawned, moved, removed, files };
}

const outFile = (args) => args[args.indexOf('-o') + 1];
const writes = (text, stdout, extra = {}) => ({ args, files }) => {
  if (text !== undefined) files[outFile(args)] = text;
  return { stdout, ...extra };
};

const base = ['--issue', 'owner/repo#7', '--run-folder', RUN, '--ledger', '/work/run.md'];
const runBug = (deps, extra = []) => run(['run', 'bug', '--runner', 'codex', '--model', 'gpt-6.1-sol', ...base, ...extra], deps);
const throwsCheck = (fn, pattern) => assert.throws(fn, (err) => err instanceof CheckItError && pattern.test(err.message));

test('a Codex review is codex exec held read-only, the prompt check-it prints on stdin, in the repository', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('REPORT', completed(100, 40, 7)) });
  runBug(deps);
  assert.equal(spawned.length, 1);
  const { command, args, opts } = spawned[0];
  assert.equal(command, 'codex');
  assert.deepEqual(args, [
    'exec', '-s', 'read-only', '-c', 'windows.sandbox="unelevated"', '-c', 'approval_policy="never"',
    '--ephemeral', '--ignore-user-config', '-m', 'gpt-6.1-sol', '-C', REPO, '--json', '-o', `${REPORT}.part`,
  ]);
  assert.equal(opts.cwd, REPO);
  assert.equal(opts.timeout, 30 * 60 * 1000);
  assert.equal(opts.input, run(['prompt', 'bug', ...base], deps));
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
    throwsCheck(() => run(['run', review, '--runner', 'codex', '--model', 'm', ...base], deps), /runs only on Claude/);
  }
  assert.equal(spawned.length, 0);
});

test('the runner and the model are required, and an unknown runner or a missing codex stops before anything runs', () => {
  const { deps, spawned } = fakeDeps({ outcome: writes('R', completed(1, 0, 1)) });
  throwsCheck(() => run(['run', 'bug', '--model', 'm', ...base], deps), /needs --runner/);
  throwsCheck(() => run(['run', 'bug', '--runner', 'codex', ...base], deps), /needs --model/);
  throwsCheck(() => run(['run', 'bug', '--runner', 'gemini', '--model', 'm', ...base], deps), /no runner named gemini; one of codex/);
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
