import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKER_RULES, decide } from './model-run-check.mjs';

const script = (file) => fileURLToPath(new URL('./' + file, import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));
const env = { ...process.env };
delete env.CLAUDE_PROJECT_DIR;
const input = (command, cwd = repo) => JSON.stringify({ tool_name: 'Bash', cwd, tool_input: { command } });
const run = (path, stdin) => spawnSync(process.execPath, [path], { input: stdin, encoding: 'utf8', env, windowsHide: true });

test('the reviewer hook refuses each of the three rules with exit 2 and the reason, and lets a read through with exit 0', () => {
  for (const command of ['claude -p x', 'codex exec x', 'cargo clean', 'taskkill /IM node.exe']) {
    const refused = run(script('no-model-run.mjs'), input(command));
    assert.equal(refused.status, 2, command);
    assert.equal(refused.stderr.trim(), decide(input(command), { env }).message, command);
  }
  const allowed = run(script('no-model-run.mjs'), input('git status'));
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stderr, '');
  assert.equal(allowed.stdout, '');
});

test('the worker hook refuses a kill by image name and lets the reviewer-only rules through', () => {
  const refused = run(script('no-image-kill.mjs'), input('Stop-Process -Name node'));
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /^thegraph-herdr worker: .*#144/);
  for (const command of ['cargo clean', 'claude -p x', 'Stop-Process -Id 1234']) {
    const allowed = run(script('no-image-kill.mjs'), input(command));
    assert.equal(allowed.status, 0, command);
    assert.equal(allowed.stderr, '', command);
  }
});

test('the hooks still refuse when they are run through a link, as the installed agent and settings run them', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'no-model-run-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [file, command] of [['no-model-run.mjs', 'claude -p x'], ['no-image-kill.mjs', 'pkill node']]) {
    const link = join(dir, file);
    symlinkSync(script(file), link);
    const refused = run(link, input(command));
    assert.equal(refused.status, 2, file);
    assert.equal(refused.stderr.trim(), decide(input(command), file === 'no-model-run.mjs' ? { env } : { env, rules: WORKER_RULES, who: 'thegraph-herdr worker' }).message, file);
  }
});

test('both hooks refuse a Write, an Edit or a shell rewrite of the run ledger, and let an append through', () => {
  const ledger = join(tmpdir(), 'thegraph', 'run.made.md');
  const write = (tool_name) => JSON.stringify({ tool_name, cwd: repo, tool_input: { file_path: ledger, content: 'x' } });
  for (const [file, who] of [['no-model-run.mjs', 'check-it-reviewer'], ['no-image-kill.mjs', 'thegraph-herdr worker']]) {
    for (const stdin of [write('Write'), write('Edit'), input(`echo x > "${ledger}"`, tmpdir())]) {
      const refused = run(script(file), stdin);
      assert.equal(refused.status, 2, file + ' ' + stdin);
      assert.match(refused.stderr, new RegExp('^' + who + ': .*#138'), file);
    }
    const appended = run(script(file), input(`echo x >> "${ledger}"`, tmpdir()));
    assert.equal(appended.status, 0, file + ' ' + appended.stderr);
  }
});
