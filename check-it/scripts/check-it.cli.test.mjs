import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REVIEWS } from './assemble.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'check-it-cli-')));
const linked = join(scratch, 'scripts');
symlinkSync(here, linked, 'junction');
after(() => {
  unlinkSync(linked);
  rmSync(scratch, { recursive: true, force: true });
});

const git = (cwd, ...args) => {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

const repo = join(scratch, 'repo');
mkdirSync(join(repo, 'src'), { recursive: true });
writeFileSync(join(repo, 'src', 'kept.c'), 'int kept;\n');
writeFileSync(join(repo, 'src', 'moved.c'), 'int moved;\n');
git(repo, 'init', '-q');
git(repo, 'add', '.');
git(repo, 'commit', '-q', '-m', 'base');
git(repo, 'mv', 'src/moved.c', 'src/renamed.c');
writeFileSync(join(repo, 'src', 'kept.c'), 'int kept = 1;\n');
writeFileSync(join(repo, 'src', 'new file.c'), 'int fresh;\n');
const top = resolve(git(repo, 'rev-parse', '--show-toplevel').trim());
const runFolder = join(scratch, 'run');
mkdirSync(runFolder);
writeFileSync(join(scratch, 'run.bug.md'), 'BUG FINDING ONE\n');
writeFileSync(join(scratch, 'run.change.md'), 'THE ISSUE AND TWO STATEMENTS\n');

const call = (entry, args, cwd = repo) =>
  spawnSync(process.execPath, [join(entry, 'check-it.mjs'), ...args], { cwd, encoding: 'utf8', windowsHide: true });

const brief = ['--issue', 'owner/repo#7', '--run-folder', runFolder, '--ledger', join(scratch, 'run.made.md')];

for (const [name, entry] of [['directly', here], ['through a link', linked]]) {
  test(`range names both paths of a move and the untracked file when run ${name}`, () => {
    const r = call(entry, ['range']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.stdout.trim().split('\n').sort(), [
      '- `src/kept.c`', '- `src/moved.c`', '- `src/new file.c` (untracked)', '- `src/renamed.c`',
    ]);
  });

  test(`every review's prompt assembles from the real skill files when run ${name}`, () => {
    for (const review of Object.keys(REVIEWS)) {
      const extra = review === 'proving' ? ['--findings', join(scratch, 'run.bug.md')]
        : review === 'pick-confirm' ? ['--change', join(scratch, 'run.change.md')] : [];
      const r = call(entry, ['prompt', review, ...brief, ...extra]);
      assert.equal(r.status, 0, `${review}: ${r.stderr}`);
      assert.match(r.stdout, /^# How you work\n/, review);
      assert.doesNotMatch(r.stdout, /Read when `check-it`|`check-it`'s script puts this first/, review);
      assert.doesNotMatch(r.stdout, /\{\{\w+\}\}/, review);
      assert.ok(r.stdout.includes(top), review);
    }
  });

  test(`lens's prompt carries lens's real body and an absolute skill folder when run ${name}`, () => {
    const r = call(entry, ['prompt', 'lens', ...brief]);
    assert.equal(r.status, 0, r.stderr);
    const lensDir = join(dirname(dirname(realpathSync(here))), 'lens');
    assert.ok(r.stdout.includes(`# Your method: the body of ${join(lensDir, 'SKILL.md')}`));
    assert.ok(r.stdout.includes(`resolve from \`${lensDir}\``));
    assert.doesNotMatch(r.stdout, /^name: lens$/m);
  });

  test(`the decision model's prompt names its role, at the start and at the confirm stop, when run ${name}`, () => {
    for (const [review, extra] of [['pick', []], ['pick-confirm', ['--change', join(scratch, 'run.change.md')]]]) {
      const r = call(entry, ['prompt', review, ...brief, ...extra]);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^\*\*You are the decision model\.\*\*/m, review);
    }
  });

  test(`verify matches a covered file the diff touches, and stops on one not in the tree, when run ${name}`, () => {
    const r = call(entry, ['verify', '--covered', 'src/new file.c', '--covered', 'src/moved.c']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(r.stdout.trim().split('\n').sort(), ['src/moved.c', 'src/new file.c']);
    const none = call(entry, ['verify', '--covered', 'src/untouched.c']);
    assert.equal(none.status, 1);
    assert.match(none.stderr, /src\/untouched\.c is not a file in the repository/);
  });

  test(`name puts a report in the run folder where there is no run sheet when run ${name}`, () => {
    const r = call(entry, ['name', 'findings', '--run-folder', runFolder]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `${join(runFolder, 'check-it.findings.md')}\n`);
  });

  test(`a missing piece exits 1 with the reason on stderr and nothing on stdout when run ${name}`, () => {
    const r = call(entry, ['prompt', 'proving', ...brief]);
    assert.equal(r.status, 1);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /^check-it: prompt proving needs --findings/);
  });
}

test('outside a repository the git failure is the error', () => {
  const outside = join(scratch, 'norepo');
  mkdirSync(outside);
  const r = call(here, ['range'], outside);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^check-it: git rev-parse --show-toplevel failed/);
});

test('a repository with no commit yet stops at git diff HEAD', () => {
  const fresh = join(scratch, 'fresh');
  mkdirSync(fresh);
  git(fresh, 'init', '-q');
  writeFileSync(join(fresh, 'a.c'), 'x');
  const r = call(here, ['range'], fresh);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /git diff HEAD .*failed/);
});
