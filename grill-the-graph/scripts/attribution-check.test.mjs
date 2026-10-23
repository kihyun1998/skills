import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { inspect, inspectTool, inspectPrePush } from './attribution-check.mjs';

const TRAILER = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';
const FOOTER = '🤖 Generated with [Claude Code](https://claude.com/claude-code)';

// A repo with nothing unpushed on branch `fix-x`, one remote-tracking ref, and no
// message files. Every rev resolves except those in `missing`; `logged` collects
// the arguments of each `git log`.
function deps({ files = {}, unpushed = '', branch = 'fix-x', previous = null, remotes = 'origin/main\n', missing = [], logged = [] } = {}) {
  return {
    readFile: (path) => {
      const hit = Object.keys(files).find((f) => path.replaceAll('\\', '/').endsWith(f));
      if (hit === undefined) throw new Error(`ENOENT ${path}`);
      return files[hit];
    },
    git: (_cwd, args) => {
      if (args[0] === 'log') { logged.push(args.slice(2)); return unpushed; }
      if (args[0] === 'rev-parse' && args.includes('--verify')) {
        const rev = args[args.length - 1].replace(/\^\{commit\}$/, '');
        if (missing.includes(rev)) throw new Error('Command failed: git rev-parse');
        return `${'c'.repeat(40)}\n`;
      }
      if (args[0] === 'rev-parse' && args[2] === '@{-1}') {
        if (previous === null) throw new Error('Command failed: git rev-parse');
        return `${previous}\n`;
      }
      if (args[0] === 'rev-parse') return `${branch}\n`;
      if (args[0] === 'for-each-ref') return remotes;
      throw new Error(`unexpected git ${args.join(' ')}`);
    },
  };
}

const run = (command, d = deps()) => inspect({ command, cwd: '/repo' }, d).action;
const ps = (command, d = deps()) => inspectTool({ tool_name: 'PowerShell', tool_input: { command }, cwd: '/repo' }, d).action;

test('a command that sends nothing passes', () => {
  assert.equal(run('git status && cargo test'), 'pass');
  assert.equal(run('git -C ~/.claude/skills log --oneline'), 'pass');
});

test('a clean commit passes', () => {
  assert.equal(run('git commit -m "sspi: fix the NTLM length check"'), 'pass');
});

test('a trailer in -m is blocked', () => {
  assert.equal(run(`git commit -m "fix" -m "${TRAILER}"`), 'block');
});

test('a trailer in a bash heredoc is blocked', () => {
  const cmd = `git commit -m "$(cat <<'EOF'\nfix the length check\n\n${TRAILER}\nEOF\n)"`;
  assert.equal(run(cmd), 'block');
});

test('a trailer in a PowerShell here-string is blocked', () => {
  const cmd = `git commit -m @'\nfix the length check\n\n${TRAILER}\n'@`;
  assert.equal(run(cmd), 'block');
});

test('a trailer in a commit message file is blocked', () => {
  const d = deps({ files: { 'msg.txt': `fix\n\n${TRAILER}\n` } });
  assert.equal(run('git commit -F msg.txt', d), 'block');
  assert.equal(run('git commit --file=msg.txt', d), 'block');
});

test('an unreadable message file blocks rather than passing unchecked', () => {
  assert.equal(run('git commit -F missing.txt'), 'block');
});

test('the generated-with footer in a PR body is blocked', () => {
  assert.equal(run(`gh pr create --title "Fix" --body "Summary\n\n${FOOTER}"`), 'block');
  assert.equal(run('gh pr create --title Fix --body "Generated with Claude Code"'), 'block');
});

test('the footer in a --body-file is blocked', () => {
  const d = deps({ files: { 'body.md': `Summary\n\n${FOOTER}\n` } });
  assert.equal(run('gh pr create --title Fix --body-file body.md', d), 'block');
  assert.equal(run('gh pr create --title Fix -F body.md', d), 'block');
});

test('the footer in a comment is blocked', () => {
  assert.equal(run(`gh issue comment 12 --body "Done. ${FOOTER}"`), 'block');
  assert.equal(run(`gh pr review 12 --comment -b "LGTM ${FOOTER}"`), 'block');
  assert.equal(run(`gh api repos/o/r/issues/1/comments -f body="${FOOTER}"`), 'block');
});

test('a push carrying an unpushed commit with a trailer is blocked', () => {
  const d = deps({ unpushed: `fix\n\n${TRAILER}\n\0` });
  assert.equal(run('git push fork fix-x', d), 'block');
});

test('a clean push passes', () => {
  assert.equal(run('git push fork fix-x', deps({ unpushed: 'fix the length check\n\0' })), 'pass');
});

test('a claude/ branch is blocked on push and on PR creation', () => {
  assert.equal(run('git push fork claude/fix-x'), 'block');
  assert.equal(run('git push fork HEAD:claude/fix-x'), 'block');
  assert.equal(run('git push -u fork', deps({ branch: 'claude/fix-x' })), 'block');
  assert.equal(run('gh pr create --head claude/fix-x --title Fix --body x'), 'block');
});

test('a branch with claude/ past its start passes', () => {
  assert.equal(run('git push fork fix/claude/session-docs'), 'pass');
});

test('a Claude or AI mention in prose asks', () => {
  assert.equal(run('git commit -m "Claude found this off-by-one"'), 'ask');
  assert.equal(run('gh pr comment 3 --body "AI-assisted rewrite of the parser"'), 'ask');
});

test('a mention outside any message does not ask', () => {
  assert.equal(run('git -C ~/.claude commit -m "fix the length check"'), 'pass');
});

test('a block outranks an ask', () => {
  assert.equal(run(`git commit -m "Claude fixed it" -m "${TRAILER}"`), 'block');
});

test('chained commands are each checked', () => {
  assert.equal(run(`cargo fmt && git commit -m "fix" -m "${TRAILER}" && git push`), 'block');
});

test('a failing git call blocks rather than passing unchecked', () => {
  const d = deps();
  d.git = () => { throw new Error('not a git repository'); };
  assert.equal(run('git push fork fix-x', d), 'block');
});

test('a mention in a heredoc read from stdin asks', () => {
  assert.equal(run("git commit -F - <<'EOF'\nClaude found this\nEOF"), 'ask');
});

test('a mention in a PowerShell here-string piped to stdin asks', () => {
  assert.equal(run("@'\nClaude found this\n'@ | git commit -F -"), 'ask');
});

// Pushes that do not go through `git push <remote> <branch>`.
test('gh pr create checks the unpushed commits and the current branch, since gh can push', () => {
  assert.equal(run('gh pr create --fill', deps({ unpushed: `fix\n\n${TRAILER}\n\0` })), 'block');
  assert.equal(run('gh pr create -t t -b b', deps({ branch: 'claude/x' })), 'block');
});

test('HEAD and @ resolve to the current branch on push', () => {
  assert.equal(run('git push origin HEAD', deps({ branch: 'claude/x' })), 'block');
  assert.equal(run('git push -u origin @', deps({ branch: 'claude/x' })), 'block');
});

test('an owner-qualified --head and a --repo= push are checked', () => {
  assert.equal(run('gh pr create --head me:claude/x -t t -b b'), 'block');
  assert.equal(run('git push --repo=origin claude/x'), 'block');
});

test('git push --all checks every local branch', () => {
  const d = deps();
  d.git = (_cwd, args) => {
    if (args[0] === 'for-each-ref') return 'main\nclaude/x\n';
    if (args[0] === 'log') return '';
    return 'main\n';
  };
  assert.equal(run('git push --all origin', d), 'block');
});

test('tags, merges, releases and api input files are checked', () => {
  assert.equal(run(`git tag -a v1 -m "v1 ${FOOTER}"`), 'block');
  assert.equal(run(`gh pr merge 3 --squash --body "${FOOTER}"`), 'block');
  assert.equal(run(`gh release create v1 --notes "${FOOTER}"`), 'block');
  const d = deps({ files: { 'body.json': `{"body": "${FOOTER}"}` } });
  assert.equal(run('gh api repos/o/r/issues/1/comments --input body.json', d), 'block');
});

test('a trailer naming Anthropic or using = is blocked', () => {
  assert.equal(run('git commit -m "fix" -m "Co-Authored-By: Opus <noreply@anthropic.com>"'), 'block');
  assert.equal(run('git commit -m fix --trailer "Co-authored-by=Claude <x@y>"'), 'block');
});

// False positives.
test('lowercase ai is not a mention', () => {
  assert.equal(run('git commit -m "move src/ai/ helpers; ai-free path"'), 'pass');
});

test('a read through gh api does not ask', () => {
  assert.equal(run('gh api search/issues -X GET -f q=claude'), 'pass');
});

test('deleting an old claude/ branch is not blocked', () => {
  assert.equal(run('git push -d origin claude/old'), 'pass');
  assert.equal(run('git push origin :claude/old'), 'pass');
});

test('a refspec that git would read as an option is blocked, not passed to git', () => {
  let logged = null;
  const d = deps();
  const git = d.git;
  d.git = (cwd, args) => { if (args[0] === 'log') logged = args; return git(cwd, args); };
  assert.equal(run('git push origin "+--output=/tmp/x"', d), 'block');
  assert.equal(logged, null);
});

// Commands one shell hands to another.
test('a command inside bash -c or pwsh -Command is checked', () => {
  assert.equal(run(`bash -c 'git commit -m "fix" -m "${TRAILER}"'`), 'block');
  assert.equal(run(`powershell -NoProfile -Command "git commit -m fix -m '${TRAILER}'"`), 'block');
  assert.equal(run('pwsh -c "gh pr comment 3 --body \'Claude saw it\'"'), 'ask');
});

// Shell redirections around a push.
test('a redirection is not read as a refspec', () => {
  const cases = [
    'git push -u origin main 2>&1 | tail -6',
    'git push origin main > out.log',
    'git push origin main 2>/dev/null',
    'git push origin main>out.log',
    'git push origin main >> out.log 2>&1',
    'git push origin main &> out.log',
    'git push origin main 2>$null',
    'git push origin main < /dev/null',
    'git push origin main 2>&1 |& tee out.log',
    'git push 2>&1 origin main',
    'git push &>out.log origin main',
    'git push >|out.log origin main',
    'git push 2>&- origin main <<<x',
  ];
  for (const cmd of cases) {
    const logged = [];
    assert.equal(run(cmd, deps({ unpushed: 'fix\n\0', logged })), 'pass', cmd);
    assert.deepEqual(logged, [['--not', '--remotes', '--not', '--end-of-options', 'main']], cmd);
  }
});

// The shell the command runs in decides what `*` before `>` is.
test('*> is a redirection in PowerShell and a glob in bash', () => {
  let logged = [];
  assert.equal(ps('git push origin main *> out.txt', deps({ logged })), 'pass');
  assert.deepEqual(logged, [['--not', '--remotes', '--not', '--end-of-options', 'main']]);
  for (const check of [
    (d) => run('git push origin *>out.txt', d),
    (d) => inspectTool({ tool_name: 'Bash', tool_input: { command: 'git push origin *>out.txt' }, cwd: '/repo' }, d),
    (d) => ps('bash -c "git push origin *>out.txt"', d),
  ]) {
    logged = [];
    check(deps({ missing: ['*'], logged }));
    assert.deepEqual(logged, [['--not', '--remotes', '--not', '--branches']]);
  }
  logged = [];
  run('pwsh -c "git push origin main *> out.txt"', deps({ logged }));
  assert.deepEqual(logged, [['--not', '--remotes', '--not', '--end-of-options', 'main']]);
});

test('a backslash is a path separator in PowerShell and an escape in bash', () => {
  const dirs = (check) => {
    const seen = [];
    const d = deps();
    const git = d.git;
    d.git = (cwd, args) => { seen.push(cwd); return git(cwd, args); };
    check(d);
    return seen;
  };
  assert.ok(dirs((d) => ps('git -C D:\\work\\repo push origin main', d)).every((c) => c === resolve('/repo', 'D:\\work\\repo')));
  assert.ok(dirs((d) => run('git -C a\\ b push origin main', d)).every((c) => c === resolve('/repo', 'a b')));
});

test('a backtick escapes in PowerShell', () => {
  assert.equal(ps('git commit -m "say `"hi`" to Claude"'), 'ask');
  const logged = [];
  ps('git push `\n  origin main', deps({ logged }));
  ps('git push `\r\n  origin main', deps({ logged }));
  run('git push \\\n  origin main', deps({ logged }));
  for (const args of logged) assert.deepEqual(args, ['--not', '--remotes', '--not', '--end-of-options', 'main']);
  assert.equal(logged.length, 3);
});

test('a redirection does not hide a trailer in the pushed commits', () => {
  assert.equal(run('git push origin main 2>&1 | tail -6', deps({ unpushed: `fix\n\n${TRAILER}\n\0` })), 'block');
});

test('a quoted > or & is message text, not a redirection', () => {
  assert.equal(run('git commit -m "Claude > 2>&1 & co"'), 'ask');
  assert.equal(run('git push origin "a>b"', deps({ branch: 'x' })), 'pass');
  // A quoted number before > is a word, not a file descriptor.
  const logged = [];
  run("git push origin '1'>out.log", deps({ logged }));
  assert.deepEqual(logged, [['--not', '--remotes', '--not', '--end-of-options', '1']]);
});

// A message read from stdin (`-F -`) comes from a redirected file, a here-string or a pipe.
test('a message file redirected to stdin is checked', () => {
  const trailer = deps({ files: { 'repo/msg.txt': `fix\n\n${TRAILER}\n` } });
  for (const cmd of [
    'git commit -F - < msg.txt', 'git commit --file=- <msg.txt', '< msg.txt git commit -F -',
    'git tag -a v1 -F - < msg.txt', 'gh pr create -t T --body-file - < msg.txt', 'git -C sub commit -F - < msg.txt',
  ]) assert.equal(run(cmd, trailer), 'block', cmd);
  assert.equal(run('git commit -F - < msg.txt', deps({ files: { 'repo/msg.txt': 'Claude found this\n' } })), 'ask');
  assert.equal(run('git commit -F - < msg.txt', deps({ files: { 'repo/msg.txt': 'fix the check\n' } })), 'pass');
});

test('a redirected file is read against the shell directory, not git -C', () => {
  const d = deps({ files: { 'repo/msg.txt': 'fix\n', 'sub/msg.txt': `fix\n\n${TRAILER}\n` } });
  assert.equal(run('git -C sub commit -F - < msg.txt', d), 'pass');
});

test('a redirected file is read only where the message comes from stdin', () => {
  const trailer = deps({ files: { 'repo/msg.txt': `fix\n\n${TRAILER}\n` } });
  assert.equal(run('git commit -m fix < msg.txt', trailer), 'pass');
  assert.equal(run('git push origin main < msg.txt', trailer), 'pass');
  assert.equal(run('git commit -F - < /dev/null'), 'pass');
  assert.equal(inspect({ command: 'git commit -F - < /dev/null', cwd: 'Z:\\work' }, deps()).action, 'pass');
  // Duplicating a descriptor or an unterminated heredoc names no file.
  assert.equal(run('git commit -F - <&0'), 'pass');
  assert.equal(run('git commit -F - <<EOF'), 'pass');
});

test('gh api reads a field or its input from stdin', () => {
  const trailer = deps({ files: { 'repo/msg.txt': `fix\n\n${TRAILER}\n` } });
  assert.equal(run('gh api repos/o/r/issues/1/comments -F body=@- < msg.txt', trailer), 'block');
  assert.equal(run('gh api repos/o/r/issues/1/comments --input - < msg.txt', trailer), 'block');
});

test('an unreadable redirected message file blocks', () => {
  assert.equal(run('git commit -F - < missing.txt'), 'block');
});

test('a here-string read from stdin is message text', () => {
  assert.equal(run('git commit -F - <<< "Claude found this"'), 'ask');
  assert.equal(run('git commit -m fix <<< "Claude found this"'), 'pass');
});

test('a message file piped into stdin is checked', () => {
  const trailer = deps({ files: { 'repo/msg.txt': `fix\n\n${TRAILER}\n` } });
  assert.equal(run('cat msg.txt | git commit -F -', trailer), 'block');
  assert.equal(ps('Get-Content msg.txt | git commit -F -', trailer), 'block');
  assert.equal(ps('Get-Content -Path msg.txt | git commit -F -', trailer), 'block');
  // The value of -Encoding is not a file.
  assert.equal(ps('Get-Content -Encoding utf8 msg.txt | git commit -F -', deps({ files: { 'repo/msg.txt': 'fix\n' } })), 'pass');
  assert.equal(ps('type msg.txt | git commit -F -', trailer), 'block');
  assert.equal(run('cat msg.txt && git commit -F -', trailer), 'pass');
  assert.equal(run('cat msg.txt | git push origin main', trailer), 'pass');
});

test('a tool named by a Windows path is checked', () => {
  assert.equal(ps(String.raw`& "C:\Program Files\Git\cmd\git.exe" commit -m fix -m "` + TRAILER + '"'), 'block');
  assert.equal(ps(String.raw`& "C:\Program Files\GitHub CLI\gh.exe" pr create -t T --body "` + FOOTER + '"'), 'block');
});

test("PowerShell's call operator does not end the command", () => {
  const trailer = deps({ files: { 'repo/msg.txt': `fix\n\n${TRAILER}\n` } });
  assert.equal(ps('Get-Content msg.txt | & git commit -F -', trailer), 'block');
  const logged = [];
  ps('& git push origin main && git status', deps({ logged }));
  assert.deepEqual(logged, [['--not', '--remotes', '--not', '--end-of-options', 'main']]);
});

test('a comment is not part of the command', () => {
  const logged = [];
  run('git push origin main # push it', deps({ logged }));
  ps('git push origin main # push it', deps({ logged }));
  assert.deepEqual(logged, [
    ['--not', '--remotes', '--not', '--end-of-options', 'main'],
    ['--not', '--remotes', '--not', '--end-of-options', 'main'],
  ]);
  assert.equal(run('git commit -m "Claude #1"'), 'ask');
  assert.equal(run('git commit -m fix#Claude'), 'ask');
  assert.equal(run('# note\ngit push origin claude/x'), 'block');
});

test('text echoed into stdin is message text', () => {
  assert.equal(run('echo "Claude found this" | git commit -F -'), 'ask');
  assert.equal(run("printf 'fix the check\\n' | git commit -F -"), 'pass');
  assert.equal(ps('Write-Output "Claude found this" | git commit -F -'), 'ask');
  assert.equal(run('echo "Claude found this" | git commit -m fix'), 'pass');
});

test('an MSYS drive path is read from that drive in bash on Windows', { skip: process.platform !== 'win32' }, () => {
  const read = [];
  const d = deps();
  d.readFile = (path) => { read.push(path); return 'fix\n'; };
  run('git commit -F /c/work/msg.txt', d);
  run('git commit -F - < /c/work/msg.txt', d);
  // PowerShell has no MSYS drives: `/c/...` is a folder on the current drive.
  inspectTool({ tool_name: 'PowerShell', tool_input: { command: 'git commit -F /c/work/msg.txt' }, cwd: '/repo' }, d);
  assert.deepEqual(read, [resolve('C:/work/msg.txt'), resolve('C:/work/msg.txt'), resolve('/repo', '/c/work/msg.txt')]);
});

// A ref the same command creates does not exist when the hook runs.
test('a branch created earlier in the command is checked against every unpushed commit', () => {
  for (const make of ['git switch -c feat/x', 'git checkout -b feat/x', 'git branch feat/x']) {
    const logged = [];
    const cmd = `${make} && git push -u origin feat/x`;
    assert.equal(run(cmd, deps({ missing: ['feat/x'], unpushed: 'fix\n\0', logged })), 'pass', cmd);
    assert.deepEqual(logged, [['--not', '--remotes', '--not', '--branches']], cmd);
    assert.equal(run(cmd, deps({ missing: ['feat/x'], unpushed: `fix\n\n${TRAILER}\n\0` })), 'block', cmd);
  }
});

test('a missing ref beside a resolved one checks both', () => {
  const logged = [];
  run('git push origin main feat/x', deps({ missing: ['feat/x'], logged }));
  assert.deepEqual(logged, [['--not', '--remotes', '--not', '--branches', '--end-of-options', 'main']]);
});

test('a claude/ branch created in the same command is still blocked', () => {
  assert.equal(run('git switch -c claude/x && git push -u origin claude/x', deps({ missing: ['claude/x'] })), 'block');
});

// A branch the same command switches to is not current yet when the hook runs.
test('a push of HEAD after a switch earlier in the command checks the branch switched to', () => {
  for (const make of [
    'git switch -c claude/x', 'git switch -C claude/x', 'git switch --create claude/x main',
    'git checkout -b claude/x', 'git checkout -B claude/x origin/main', 'git switch --orphan claude/x',
    'git switch claude/x', 'git checkout claude/x', 'git branch -m claude/x', 'git branch -M fix-x claude/x',
  ]) {
    for (const push of ['git push -u origin HEAD', 'git push -u origin', 'git push origin @', 'gh pr create --fill']) {
      const cmd = `${make} && ${push}`;
      assert.equal(run(cmd, deps({ missing: ['claude/x'] })), 'block', cmd);
    }
  }
});

test('the commits of an existing branch switched to are read too', () => {
  const logged = [];
  run('git switch feat && git push -u origin', deps({ logged }));
  run('git switch feat && git push origin HEAD:main', deps({ logged }));
  assert.deepEqual(logged, [
    ['--not', '--remotes', '--not', '--end-of-options', 'HEAD', 'feat'],
    ['--not', '--remotes', '--not', '--end-of-options', 'HEAD', 'feat'],
  ]);
});

test('an attached create flag names the branch switched to', () => {
  for (const make of ['git switch -cclaude/x', 'git switch --create=claude/x', 'git checkout -bclaude/x']) {
    assert.equal(run(`${make} && git push -u origin`, deps({ missing: ['claude/x'] })), 'block', make);
  }
});

test('a switch sends nothing, so text around it is not a message', () => {
  assert.equal(run("git switch -c docs && cat > CLAUDE.md <<'EOF'\nClaude reads this\nEOF"), 'pass');
});

test('the branch the command started on is still checked after a switch', () => {
  assert.equal(run('git checkout README.md && git push', deps({ branch: 'claude/old' })), 'block');
  assert.equal(run('git switch -c fix-y && git push -u origin HEAD', deps({ branch: 'claude/old' })), 'block');
});

test('switch - reads the previous branch', () => {
  assert.equal(run('git switch - && git push', deps({ previous: 'claude/x' })), 'block');
  assert.equal(run('git checkout - && git push', deps({ previous: 'claude/x' })), 'block');
  assert.equal(run('git switch - && git push', deps({ previous: null })), 'pass');
});

test('restoring files, a switch elsewhere and a switch after the push change nothing', () => {
  for (const cmd of [
    'git checkout -- claude/x && git push',
    'git checkout main -- claude/x && git push',
    'git -C ../other switch -c claude/x && git push',
    'git push && git switch -c claude/x',
    'git switch -c claude/x',
    'git branch claude/x && git push',
  ]) {
    const logged = [];
    assert.equal(run(cmd, deps({ logged })), 'pass', cmd);
    for (const args of logged) assert.deepEqual(args, ['--not', '--remotes', '--not', '--end-of-options', 'HEAD'], cmd);
  }
});

test('a switch through -C to the same directory counts', () => {
  assert.equal(run('git -C . switch -c claude/x && git push -u origin', deps({ missing: ['claude/x'] })), 'block');
});

test('a switch target that git would read as an option is not passed to git', () => {
  const seen = [];
  const d = deps();
  const git = d.git;
  d.git = (cwd, args) => { seen.push(...args); return git(cwd, args); };
  run('git switch -c--output=/tmp/x && git push -u origin', d);
  assert.ok(!seen.some((a) => a.startsWith('--output')), seen.join(' '));
});

// gh pr checkout switches to the pull request's head branch, named in the command
// only by -b or a branch argument.
test('a push of HEAD after gh pr checkout of a number or URL blocks, asking for a separate push', () => {
  for (const cmd of [
    'gh pr checkout 12 && git push',
    'gh pr checkout https://github.com/o/r/pull/12 && git push origin HEAD',
    'gh pr co 12 && gh pr create --fill',
    'gh pr checkout -R o/r 12 && git push -u origin @',
    'gh pr checkout 12 && git push origin HEAD:main',
    'gh pr checkout && git push',
  ]) {
    const verdict = inspect({ command: cmd, cwd: '/repo' }, deps());
    assert.equal(verdict.action, 'block', cmd);
    assert.match(verdict.reason, /own command/, cmd);
  }
});

test('gh pr checkout with a known name checks that name', () => {
  assert.equal(run('gh pr checkout claude/x && git push', deps({ missing: ['claude/x'] })), 'block');
  assert.equal(run('gh pr checkout 12 -b claude/x && git push -u origin HEAD', deps({ missing: ['claude/x'] })), 'block');
  assert.equal(run('gh pr checkout 12 --branch=fix-y && git push -u origin HEAD', deps({ missing: ['fix-y'] })), 'pass');
});

test('gh pr checkout leaves a push that names its branch, a detached checkout and an earlier push alone', () => {
  for (const cmd of [
    'gh pr checkout 12 && git push origin feat',
    'gh pr checkout 12 --detach && git push origin feat',
    'gh pr checkout 12 --detach && git push',
    'git push && gh pr checkout 12',
    'gh pr checkout 12',
  ]) assert.equal(run(cmd), 'pass', cmd);
});

test('a switch inside bash -c counts for a push after it', () => {
  assert.equal(run('bash -c "git switch -c claude/x" && git push origin HEAD', deps({ missing: ['claude/x'] })), 'block');
});

test('a clone with no remote-tracking refs blocks a push rather than scanning all history', () => {
  assert.equal(run('git push origin fix-x', deps({ remotes: '' })), 'block');
});

// Tools other than a shell.
const tool = (tool_name, tool_input) => inspectTool({ tool_name, tool_input, cwd: '/repo' }, deps()).action;

test('a GitHub MCP write is checked', () => {
  assert.equal(tool('mcp__github__create_pull_request', { title: 'Fix', body: `x ${FOOTER}`, head: 'fix-x' }), 'block');
  assert.equal(tool('mcp__github__create_pull_request', { title: 'Fix', body: 'x', head: 'claude/x' }), 'block');
  assert.equal(tool('mcp__github__add_issue_comment', { body: 'Claude noticed this' }), 'ask');
  assert.equal(tool('mcp__github__add_issue_comment', { body: 'Fixed in 1a2b3c' }), 'pass');
});

test('an MCP tool that is not GitHub passes untouched', () => {
  assert.equal(tool('mcp__claude_ai_Gmail__send', { body: FOOTER }), 'pass');
});

test('a shell tool goes through the command check', () => {
  assert.equal(tool('PowerShell', { command: `git commit -m "fix" -m "${TRAILER}"` }), 'block');
});

// The git pre-push hook: stdin lines are `<local ref> <local sha> <remote ref> <remote sha>`.
const Z = '0'.repeat(40);
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const prePush = (lines, d = deps()) => inspectPrePush(lines, '/repo', d).action;

test('pre-push blocks a trailer in the pushed range', () => {
  assert.equal(prePush(`refs/heads/fix-x ${A} refs/heads/fix-x ${B}\n`, deps({ unpushed: `fix\n\n${TRAILER}\n\0` })), 'block');
});

test('pre-push blocks a claude/ remote branch and passes a clean push', () => {
  assert.equal(prePush(`refs/heads/x ${A} refs/heads/claude/x ${Z}\n`), 'block');
  assert.equal(prePush(`refs/heads/fix-x ${A} refs/heads/fix-x ${B}\n`), 'pass');
});

test('pre-push lets a branch deletion through', () => {
  assert.equal(prePush(`(delete) ${Z} refs/heads/claude/old ${B}\n`), 'pass');
});

test('pre-push reads an existing branch as a range and a new one against the remotes', () => {
  const seen = [];
  const d = deps();
  const git = d.git;
  d.git = (cwd, args) => { if (args[0] === 'log') seen.push(args.slice(2).join(' ')); return git(cwd, args); };
  prePush(`refs/heads/a ${A} refs/heads/a ${B}\nrefs/heads/n ${A} refs/heads/n ${Z}\n`, d);
  assert.deepEqual(seen, [`--end-of-options ${B}..${A}`, `--not --remotes --not --end-of-options ${A}`]);
});
