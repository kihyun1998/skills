import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFUSAL } from './model-run-check.mjs';

const script = fileURLToPath(new URL('./no-model-run.mjs', import.meta.url));

test('the hook refuses a claude command with exit 2 and the reason, and lets any other through with exit 0', () => {
  const run = (input) => spawnSync(process.execPath, [script], { input, encoding: 'utf8' });
  const refused = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'claude -p x' } }));
  assert.equal(refused.status, 2);
  assert.equal(refused.stderr.trim(), REFUSAL);
  const allowed = run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }));
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stderr, '');
  assert.equal(allowed.stdout, '');
});

test('the hook still refuses when it is run through a link, as the installed agent runs it', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'no-model-run-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const link = join(dir, 'no-model-run.mjs');
  symlinkSync(script, link);
  const refused = spawnSync(process.execPath, [link], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'claude -p x' } }),
    encoding: 'utf8',
  });
  assert.equal(refused.status, 2);
  assert.equal(refused.stderr.trim(), REFUSAL);
});
