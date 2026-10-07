import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The hook is installed as a path through ~/.claude/skills, a link to this repo,
// so the entry has to run when reached through a link as well as directly.
const here = dirname(fileURLToPath(import.meta.url));
const linked = join(mkdtempSync(join(tmpdir(), 'no-attribution-')), 'scripts');
symlinkSync(here, linked, 'junction');

const call = (entry, input, args = []) =>
  spawnSync(process.execPath, [join(entry, 'no-attribution.mjs'), ...args], { input, encoding: 'utf8' });

const trailerCommit = JSON.stringify({
  tool_name: 'Bash',
  cwd: here,
  tool_input: { command: 'git commit -m fix -m "Co-Authored-By: Claude <noreply@anthropic.com>"' },
});

for (const [name, entry] of [['directly', here], ['through a link', linked]]) {
  test(`the hook blocks a trailer when run ${name}`, () => {
    const r = call(entry, trailerCommit);
    assert.equal(r.status, 2, r.stderr);
    assert.match(r.stderr, /Co-Authored-By/);
  });

  test(`the hook passes a clean command when run ${name}`, () => {
    const r = call(entry, JSON.stringify({ tool_name: 'Bash', cwd: here, tool_input: { command: 'git status' } }));
    assert.equal(r.status, 0, r.stderr);
  });

  test(`the pre-push hook blocks a claude/ branch when run ${name}`, () => {
    const z = '0'.repeat(40);
    const r = call(entry, `refs/heads/x ${'a'.repeat(40)} refs/heads/claude/x ${z}\n`, ['--pre-push']);
    assert.equal(r.status, 1, r.stderr);
  });
}
