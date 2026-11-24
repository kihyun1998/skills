import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REVIEWS, section } from './assemble.mjs';

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

const call = (entry, args, cwd = repo, env = process.env) =>
  spawnSync(process.execPath, [join(entry, 'check-it.mjs'), ...args], { cwd, encoding: 'utf8', windowsHide: true, env });

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

  test(`the confirm stop's wording comes from decision-model.md, and the script holds none of it, when run ${name}`, () => {
    const path = join(here, '..', 'reviewers', 'decision-model.md');
    const confirmPart = section(readFileSync(path, 'utf8').replaceAll('\r\n', '\n'), 'At the confirm stop', path).trim();
    assert.match(confirmPart, /carry none of it out/);
    assert.match(confirmPart, /six answers and the pick list, nothing else/);
    const confirm = call(entry, ['prompt', 'pick-confirm', ...brief, '--change', join(scratch, 'run.change.md')]);
    assert.equal(confirm.status, 0, confirm.stderr);
    assert.ok(confirm.stdout.includes(`${confirmPart}\n\n# The planned change\n\nTHE ISSUE AND TWO STATEMENTS\n`));
    const start = call(entry, ['prompt', 'pick', ...brief]);
    assert.equal(start.status, 0, start.stderr);
    assert.doesNotMatch(start.stdout, /At the confirm stop|carry none of it out|# The planned change/);
    assert.doesNotMatch(readFileSync(join(here, 'assemble.mjs'), 'utf8'), /carry none of it out|six answers|not written yet/);
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

test('a record made before the change leaves out the untracked files unchanged since, and lists the new and the edited', () => {
  const kept = join(scratch, 'kept');
  const folder = join(scratch, 'kept-run');
  mkdirSync(join(kept, 'docs'), { recursive: true });
  mkdirSync(folder);
  writeFileSync(join(kept, 'a.c'), 'int a;\n');
  git(kept, 'init', '-q');
  git(kept, 'add', '.');
  git(kept, 'commit', '-q', '-m', 'base');
  writeFileSync(join(kept, '.DS_Store'), 'finder\n');
  writeFileSync(join(kept, 'docs', 'notes.md'), 'mine\n');
  const made = call(here, ['record', '--run-folder', folder], kept);
  assert.equal(made.status, 0, made.stderr);
  assert.match(made.stdout, /recorded 2 untracked files/);
  assert.equal(call(here, ['record', '--run-folder', folder], kept).status, 1);

  writeFileSync(join(kept, 'docs', 'notes.md'), 'mine, edited by the change\n');
  writeFileSync(join(kept, 'b.c'), 'int b;\n');
  const r = call(here, ['range', '--run-folder', folder], kept);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, [
    '- `b.c` (untracked)',
    '- `docs/notes.md` (untracked)',
    '',
    `Left out: untracked before the run began and unchanged since, as ${join(folder, 'check-it.untracked.json')} records:`,
    '- `.DS_Store`',
    '',
  ].join('\n'));
  const all = call(here, ['range'], kept);
  assert.match(all.stdout, /- `\.DS_Store` \(untracked\)/);
});

test('an untracked link is recorded by where it points, so its target outside the repository is never read', { skip: process.platform === 'win32' && 'a file symlink needs Developer Mode on Windows' }, () => {
  const linkRepo = join(scratch, 'linked-repo');
  const folder = join(scratch, 'linked-run');
  const outside = join(scratch, 'outside.txt');
  mkdirSync(linkRepo);
  mkdirSync(folder);
  writeFileSync(join(linkRepo, 'a.c'), 'int a;\n');
  git(linkRepo, 'init', '-q');
  git(linkRepo, 'add', '.');
  git(linkRepo, 'commit', '-q', '-m', 'base');
  writeFileSync(outside, 'before\n');
  symlinkSync(outside, join(linkRepo, 'out'));
  assert.equal(call(here, ['record', '--run-folder', folder], linkRepo).status, 0);
  writeFileSync(outside, 'after\n');
  writeFileSync(join(linkRepo, 'a.c'), 'int a = 1;\n');
  const r = call(here, ['range', '--run-folder', folder], linkRepo);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^- `a\.c`\n\nLeft out: .*\n- `out`\n$/);
});

test('a link already where the record goes stops record with the reason, not a stack', { skip: process.platform === 'win32' && 'a file symlink needs Developer Mode on Windows' }, () => {
  const folder = join(scratch, 'dangling-run');
  mkdirSync(folder);
  symlinkSync(join(scratch, 'nowhere'), join(folder, 'check-it.untracked.json'));
  const r = call(here, ['record', '--run-folder', folder]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^check-it: the run folder already holds a record at /);
  assert.doesNotMatch(r.stderr, /node:fs|EEXIST/);
});

test('an untracked file that cannot be read is not recorded and is always listed, with no stack', { skip: (process.platform === 'win32' || process.getuid?.() === 0) && 'mode 000 does not stop this user reading the file' }, () => {
  const lockedRepo = join(scratch, 'locked-repo');
  const folder = join(scratch, 'locked-run');
  mkdirSync(lockedRepo);
  mkdirSync(folder);
  writeFileSync(join(lockedRepo, 'a.c'), 'int a;\n');
  git(lockedRepo, 'init', '-q');
  git(lockedRepo, 'add', '.');
  git(lockedRepo, 'commit', '-q', '-m', 'base');
  const locked = join(lockedRepo, 'locked.bin');
  writeFileSync(locked, 'secret\n');
  chmodSync(locked, 0o000);
  try {
    const made = call(here, ['record', '--run-folder', folder], lockedRepo);
    assert.equal(made.status, 0, made.stderr);
    assert.match(made.stdout, /recorded 0 untracked files/);
    assert.match(made.stdout, /not recorded, .* always listed: `locked\.bin`/);
    writeFileSync(join(lockedRepo, 'a.c'), 'int a = 1;\n');
    const r = call(here, ['range', '--run-folder', folder], lockedRepo);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '- `a.c`\n- `locked.bin` (untracked)\n');
  } finally {
    chmodSync(locked, 0o600);
  }
});

test('record --from the run folder through a link to it keeps the record', { skip: process.platform === 'win32' && 'a directory symlink needs Developer Mode on Windows' }, () => {
  const sameRepo = join(scratch, 'same-repo');
  const folder = join(scratch, 'same-run');
  mkdirSync(sameRepo);
  mkdirSync(folder);
  writeFileSync(join(sameRepo, 'a.c'), 'int a;\n');
  git(sameRepo, 'init', '-q');
  git(sameRepo, 'add', '.');
  git(sameRepo, 'commit', '-q', '-m', 'base');
  writeFileSync(join(sameRepo, 'pre.txt'), 'there before\n');
  assert.equal(call(here, ['record', '--run-folder', folder], sameRepo).status, 0);
  const alias = join(scratch, 'same-run-link');
  symlinkSync(folder, alias, 'dir');
  const r = call(here, ['record', '--run-folder', folder, '--from', alias], sameRepo);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `kept the record ${join(folder, 'check-it.untracked.json')}\n`);
});

test('two run folders side by side in one tree: each leaves out what the other claimed, keeps what it changed unclaimed, and the claim is rewritten whole', () => {
  const shared = join(scratch, 'shared');
  const runs = join(scratch, 'runs');
  const first = join(runs, 'first.made');
  const newcomer = join(runs, 'newcomer.made');
  mkdirSync(shared);
  mkdirSync(first, { recursive: true });
  mkdirSync(newcomer);
  writeFileSync(join(shared, 'a.c'), 'int a;\n');
  git(shared, 'init', '-q');
  git(shared, 'add', '.');
  git(shared, 'commit', '-q', '-m', 'base');
  writeFileSync(join(shared, 'a.c'), 'int a = 1;\n');
  const late = call(here, ['claim', '--run-folder', first, 'a.c'], shared);
  assert.equal(late.status, 0, late.stderr);
  for (const path of ['b.c', 'c.c']) {
    const c = call(here, ['claim', '--run-folder', newcomer, path], shared);
    assert.equal(c.status, 0, c.stderr);
  }
  writeFileSync(join(shared, 'b.c'), 'int b;\n');
  writeFileSync(join(shared, 'gen.lock'), 'generated\n');
  assert.deepEqual(readdirSync(newcomer), ['check-it.claimed.json']);
  const claim = join(newcomer, 'check-it.claimed.json');
  const firstClaim = join(first, 'check-it.claimed.json');
  assert.deepEqual(JSON.parse(readFileSync(claim, 'utf8')).files, ['b.c', 'c.c']);
  const mine = call(here, ['range', '--run-folder', newcomer], shared);
  assert.equal(mine.status, 0, mine.stderr);
  assert.equal(mine.stdout, `- \`b.c\` (untracked)\n- \`gen.lock\` (untracked)\n\nLeft out: claimed by another run in the same tree, in ${firstClaim}:\n- \`a.c\`\n`);
  const theirs = call(here, ['range', '--run-folder', first], shared);
  assert.equal(theirs.status, 0, theirs.stderr);
  assert.equal(theirs.stdout, `- \`a.c\`\n- \`gen.lock\` (untracked)\n\nLeft out: claimed by another run in the same tree, in ${claim}:\n- \`b.c\`\n`);
  const refused = call(here, ['claim', '--run-folder', newcomer, 'a.c'], shared);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /`a\.c` is claimed by another run in the same tree/);
});

test('a file committed and released can be claimed by the run beside it, and one not committed cannot be released', () => {
  const tree = join(scratch, 'release-tree');
  const runs = join(scratch, 'release-runs');
  const first = join(runs, 'first.made');
  const second = join(runs, 'second.made');
  mkdirSync(tree);
  mkdirSync(first, { recursive: true });
  mkdirSync(second);
  writeFileSync(join(tree, 'a.c'), 'int a;\n');
  git(tree, 'init', '-q');
  git(tree, 'add', '.');
  git(tree, 'commit', '-q', '-m', 'base');
  assert.equal(call(here, ['claim', '--run-folder', first, 'a.c', 'b.c'], tree).status, 0);
  writeFileSync(join(tree, 'a.c'), 'int a = 1;\n');
  writeFileSync(join(tree, 'b.c'), 'int b;\n');
  const early = call(here, ['release', '--run-folder', first, 'a.c'], tree);
  assert.equal(early.status, 1);
  assert.match(early.stderr, /`a\.c` is still changed in the tree/);
  git(tree, 'commit', '-q', '-m', 'a', '--', 'a.c');
  const refused = call(here, ['claim', '--run-folder', second, 'a.c'], tree);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /`a\.c` is claimed by another run in the same tree/);
  const released = call(here, ['release', '--run-folder', first, 'a.c'], tree);
  assert.equal(released.status, 0, released.stderr);
  assert.deepEqual(JSON.parse(readFileSync(join(first, 'check-it.claimed.json'), 'utf8')).files, ['b.c']);
  const taken = call(here, ['claim', '--run-folder', second, 'a.c'], tree);
  assert.equal(taken.status, 0, taken.stderr);
});

function fakeCodex(name, script) {
  const bin = join(scratch, `codex-${name}`);
  const entryDir = join(bin, 'node_modules', '@openai', 'codex', 'bin');
  mkdirSync(entryDir, { recursive: true });
  const body = `#!/usr/bin/env node\n${script}\n`;
  writeFileSync(join(entryDir, 'codex.js'), body);
  writeFileSync(join(bin, 'codex.cmd'), '@echo off\r\nexit /b 9\r\n');
  writeFileSync(join(bin, 'codex'), body);
  chmodSync(join(bin, 'codex'), 0o755);
  return { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` };
}

const runBug = (env) => call(here, ['run', 'bug', '--runner', 'codex', '--model', 'gpt-x', ...brief], repo, env);
const bugReport = join(runFolder, 'check-it.bug.md');

test('run, through the real script, hands a codex found on PATH the prompt on stdin and saves its report', (t) => {
  t.after(() => rmSync(bugReport, { force: true }));
  const env = fakeCodex('ok', `
const fs = require('node:fs');
const args = process.argv.slice(2);
const input = fs.readFileSync(0, 'utf8');
fs.writeFileSync(args[args.indexOf('-o') + 1], 'SAW ' + (input.startsWith('# How you work') ? 'the prompt' : 'something else') + ' in ' + args[args.indexOf('-C') + 1]);
console.log(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1234, cached_input_tokens: 0, output_tokens: 5 } }));`);
  const r = runBug(env);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /cost: bug on Codex gpt-x: \d+ s, 1,234 input tokens \(0 cached\), 5 output tokens/);
  assert.equal(readFileSync(bugReport, 'utf8'), `SAW the prompt in ${top}`);
});

test('run, through the real script, exits 3 when codex is out of usage and leaves no report', () => {
  const env = fakeCodex('spent', `
console.log(JSON.stringify({ type: 'turn.failed', error: { message: "You've hit your usage limit." } }));
process.exit(1);`);
  const r = runBug(env);
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /^check-it: Codex is out of usage: You've hit your usage limit\./);
  assert.ok(!existsSync(bugReport));
  assert.ok(!existsSync(`${bugReport}.part`));
});
