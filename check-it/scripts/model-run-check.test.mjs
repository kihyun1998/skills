import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startsAiCli, killsByImageName, decide, WORKER_RULES } from './model-run-check.mjs';

const REPO = 'D:/repo';
const COPY = 'C:/Temp/run/copy';
const WORKTREE = 'E:/elsewhere/wt-1';
const FILES = new Map([
  [REPO + '/.git', null],
  [COPY + '/.git', null],
  [REPO + '/.git/worktrees', null],
  [REPO + '/.git/worktrees/wt-1/gitdir', WORKTREE + '/.git\n'],
  [WORKTREE + '/.git', 'gitdir: ' + REPO + '/.git/worktrees/wt-1\n'],
  [REPO + '/.git/worktrees/wt-1/commondir', '../..\n'],
]);
const norm = (p) => p.replace(/\\/g, '/');
const fs = {
  exists: (p) => FILES.has(norm(p)),
  read: (p) => FILES.get(norm(p)) ?? null,
  list: (p) => [...new Set([...FILES.keys()].filter((k) => k.startsWith(norm(p) + '/')).map((k) => k.slice(norm(p).length + 1).split('/')[0]))],
};
const exists = fs.exists;
const env = { CLAUDE_PROJECT_DIR: REPO, TMPDIR: 'C:/Temp', HOME: 'C:/Users/me' };
const run = (command, cwd = REPO, options = {}) =>
  decide(JSON.stringify({ tool_name: 'Bash', cwd, tool_input: { command } }), { env, fs, ...options });
const ps = (command, cwd = REPO) =>
  decide(JSON.stringify({ tool_name: 'PowerShell', cwd, tool_input: { command } }), { env, fs });

test('a command that runs claude is caught, however it is started', () => {
  for (const c of [
    'claude -p "review this"',
    'cd repo && claude -p x',
    'git status; claude --model haiku -p x',
    'FOO=1 BAR=2 claude -p x',
    '/usr/local/bin/claude -p x',
    '"C:/Users/me/.local/bin/claude.exe" -p x',
    '& "C:\\Users\\me\\claude.cmd" -p x',
    'echo $(claude -p x)',
    'out="$(claude -p x)"',
    'echo `claude -p x`',
    'bash -c "claude -p x"',
    "sh -lc 'claude -p x'",
    'cmd /c claude -p x',
    'C:\\Users\\me\\claude.exe -p x',
    'powershell -NoProfile -Command "claude -p x"',
    'env -i PATH=/bin claude -p x',
    'timeout 30 claude -p x',
    'nice -n 5 claude -p x',
    'xargs -n1 claude -p < prompts.txt',
    'printf x | claude -p',
    'npx @anthropic-ai/claude-code -p x',
    'node node_modules/@anthropic-ai/claude-code/cli.js -p x',
    'pnpm dlx claude -p x',
    'npm exec claude -- -p x',
    'eval "claude -p x"',
    'Start-Process claude -ArgumentList "-p x"',
    'iex "claude -p x"',
    'for i in 1 2 3; do claude -p x; done',
    'if true; then claude -p x; fi',
    'while true; do claude -p x; done',
    '! claude -p x',
    'bash -c "for i in 1 2; do claude -p x; done"',
    'timeout -s KILL 30 claude -p x',
    'sudo -u root claude -p x',
    'env -u FOO claude -p x',
    'bash -c -- "claude -p x"',
    '>out.txt claude -p x',
    '2>&1 claude -p x',
    'claude<prompt.txt',
    'npx -y @anthropic-ai/claude-code -p x',
  ]) assert.equal(startsAiCli(c), true, c);
});

test('codex, agy and gemini are caught as claude is', () => {
  for (const c of [
    'codex exec "review"',
    'codex.exe exec --sandbox read-only -',
    'C:/Users/me/AppData/Roaming/npm/codex.cmd exec x',
    'PATH=C:/x:$PATH codex exec x',
    'npx @openai/codex exec x',
    'node node_modules/@openai/codex/bin/codex.js exec x',
    'agy run x',
    'gemini -p x',
    'npx @google/gemini-cli -p x',
    'bash -c "codex exec x"',
    'powershell -Command "& codex exec x"',
    'echo x | codex exec -',
  ]) assert.equal(startsAiCli(c), true, c);
});

test('a command that only names an AI CLI is let through', () => {
  for (const c of [
    'grep -rn claude docs',
    'rg "claude -p" check-it',
    'ls ~/.claude/agents',
    'cat CLAUDE.md claude.md',
    'git log --grep claude',
    'node check-it/scripts/check-it.mjs prompt bug',
    'command -v claude',
    'which claude',
    'echo claude',
    'node --test "check-it/scripts/*.test.mjs"',
    "grep -rn '`claude`' docs",
    "echo '$(claude -p x)'",
    'grep -rn "@anthropic-ai/claude-code" mods',
    'cat node_modules/@anthropic-ai/claude-code/package.json',
    'npm view @anthropic-ai/claude-code version',
    "cat <<'EOF' > f.txt\nclaude -p x\nEOF",
    'cat <<-EOF\n\tclaude -p x\n\tEOF\necho done',
    'sudo -u claude-user ls',
    'rg codex check-it/scripts/runners.mjs',
    'command -v codex',
    'npm view @openai/codex version',
    'echo gemini agy',
  ]) assert.equal(startsAiCli(c), false, c);
});

test('a kill by image name is caught, in Bash and PowerShell forms', () => {
  for (const c of [
    'taskkill /IM node.exe /F',
    'taskkill /f /im cargo.exe',
    'taskkill -im node.exe',
    'taskkill /FI "IMAGENAME eq node.exe"',
    'taskkill //F //IM node.exe',
    'taskkill //FI "IMAGENAME eq node.exe"',
    'Get-Process node | Select-Object -First 1 | Stop-Process',
    'gps cargo | Sort-Object CPU | Select-Object -Last 1 | spps -Force',
    'Stop-Process -Name node',
    'Stop-Process -Name node -Force',
    'stop-process -n node',
    'spps -Name node',
    'kill -Name node',
    'Get-Process node | Stop-Process',
    'gps -Name cargo | Stop-Process -Force',
    'pkill node',
    'pkill -f cargo',
    'killall node',
    'sudo pkill node',
    'timeout 5 killall node',
    'bash -c "pkill node"',
    'powershell -NoProfile -Command "Stop-Process -Name node"',
    'cmd /c taskkill /IM node.exe',
    'git status; taskkill /IM node.exe',
    'echo $(pkill node)',
  ]) assert.notEqual(killsByImageName(c), null, c);
});

test('a kill by process id, or a command that only names a kill, is let through', () => {
  for (const c of [
    'taskkill /PID 1234 /F',
    'Stop-Process -Id 1234',
    'Stop-Process -Id 1234 -Force',
    'kill 1234',
    'kill -9 1234',
    'kill -n 9 1234',
    'Get-Process node',
    'Get-Process node | Select-Object Id; Stop-Process -Id 12',
    'Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*run*" }',
    'grep -rn pkill docs',
    'rg "taskkill /IM" clean-it',
    'echo killall',
  ]) assert.equal(killsByImageName(c), null, c);
});

test('inside the reviewed repository, only read commands run', () => {
  for (const c of [
    'git status',
    'git diff HEAD~1 -- check-it',
    'git log --oneline -5',
    'git show HEAD:check-it/SKILL.md',
    'git ls-files -co --exclude-standard',
    'git branch --show-current',
    'git -C D:/repo diff',
    'cat a.md b.md',
    'grep -rn x .',
    'rg -n "x" check-it',
    'ls -la',
    'head -20 f.md',
    'sed -n 1,5p f.md',
    "sed -n '/error/p' f.md",
    'xxd f.bin',
    'rg --hidden x',
    'find . -name "*.mjs"',
    'wc -l f.md | sort -n',
    'Get-Content f.md',
    'Get-ChildItem -Recurse | Select-String x',
    'git status 2>&1',
    'cat f 2>/dev/null',
    'git diff > C:/Temp/run/d.patch',
    'git diff > $TMPDIR/d.patch',
    'Get-Content f 2>$null',
    'bash -c "git status"',
    'mkdir -p C:/Temp/run/copy',
    'git ls-files -co --exclude-standard | xargs cp --parents -t C:/Temp/run/copy',
    'cp -r src C:/Temp/run/copy/',
    'Copy-Item -Recurse src -Destination C:\\Temp\\run\\copy',
    'tar -cf - . | tar -xf - -C C:/Temp/run/copy',
    'cd C:/Temp/run/copy && cargo clean && npm test',
    'cd /c/Temp/run/copy && make',
    'cd C:/Temp/run/copy && git init -q && npm test && rm -rf target',
    'pushd C:/Temp/run/copy && npm test && popd && git status',
  ]) assert.equal(run(c).code, 0, c);
});

test('inside the reviewed repository, anything else is refused with "run it in your copy"', () => {
  for (const c of [
    'cargo clean',
    'npm test',
    'node --test check-it/scripts',
    'make',
    'bash build.sh',
    'git commit -m x',
    'git stash',
    'git checkout -- .',
    'git branch -D x',
    'cd check-it && make',
    'pushd C:/Temp/run/copy && popd && npm test',
    'sort -o f.md f.md',
    'awk 1 f.md',
    'cd C:/Temp/missing; npm test',
    'cd C:/Temp/missing\nnpm test',
    'cd C:/Temp/x || true; npm test',
    'cd C:/Temp/x | cat; npm test',
    'cd C:/Temp/run/copy && npm test; npm test',
    "sed '1e cargo clean' f.md",
    'sed s/a/b/ f.md',
    'git -c diff.external=evil diff',
    'GIT_EXTERNAL_DIFF=evil git diff',
    'git grep -O x',
    'rg --pre evil x',
    'rg --pre=evil x',
    'cd D:/repo.worktrees/abc && cargo clean',
    'cd E:/elsewhere/wt-1 && cargo clean',
  ]) {
    const r = run(c);
    assert.equal(r.code, 2, c);
    assert.match(r.message, /run it in your copy/i, c);
  }
});

test('a write into the reviewed repository is refused, from inside it or from the copy', () => {
  for (const [c, cwd] of [
    ['rm -rf target', REPO],
    ['echo x > f.txt', REPO],
    ['cat a >> b', REPO],
    ['Remove-Item target -Recurse -Force', REPO],
    ['Set-Content f.txt x', REPO],
    ['cat a | tee out.txt', REPO],
    ['tar czf out.tgz .', REPO],
    ['touch f', REPO],
    ['find . -name x -delete', REPO],
    ['xxd -r in.hex out.bin', REPO],
    ['xxd in.bin out.txt', REPO],
    ['sed -n "w out.txt" in.txt', REPO],
    ['git ls-files | xargs rm', REPO],
    ['find . -name "*.log" | xargs rm -f', REPO],
    ['git diff --output=d.patch', REPO],
    ['bash -c "echo hi" > D:/repo/out.txt', COPY],
    ['git -C C:/Temp/run/copy diff --output=D:/repo/out.patch', COPY],
    ['git --git-dir=D:/repo/.git --work-tree=D:/repo checkout -- .', COPY],
    ['git --work-tree D:/repo checkout -- .', COPY],
    ['GIT_DIR=D:/repo/.git git reset --hard', COPY],
    ['export HOME=D:/repo; rm -rf ~/check-it', COPY],
    ['export TMPDIR=D:/repo; rm -rf $TMPDIR/x', COPY],
    ['declare TMPDIR=D:/repo; rm -rf $TMPDIR/x', COPY],
    ['for TMPDIR in D:/repo; do rm -rf $TMPDIR/x; done', COPY],
    ['rm -rf D:/repo.worktrees/abc/src', COPY],
    ['rm -rf E:/elsewhere/wt-1/src', COPY],
    ['git -C E:/elsewhere/wt-1 clean -fdx', COPY],
    ['sed -i s/a/b/ f.md', REPO],
    ['rm -rf D:/repo/target', COPY],
    ['rm -rf /d/repo/target', COPY],
    ['mv D:/repo/a.md .', COPY],
    ['echo x > D:/repo/f.txt', COPY],
    ['echo x >D:\\repo\\f.txt', COPY],
    ['Remove-Item -Path D:\\repo\\target -Recurse', COPY],
    ['Out-File -FilePath D:/repo/f.txt', COPY],
    ['cp out.txt D:/repo/', COPY],
    ['find D:/repo -name x -delete', COPY],
    ['sed -i s/a/b/ D:/repo/f.md', COPY],
    ['git -C D:/repo commit -m x', COPY],
    ['cd D:/repo && cargo clean', COPY],
    ['bash -c "rm -rf D:/repo/target"', COPY],
  ]) assert.equal(run(c, cwd).code, 2, c + ' in ' + cwd);
});

test('the copy stays fully usable, its own .git included', () => {
  for (const c of [
    'cargo clean',
    'npm test',
    'rm -rf target',
    'git init && git add -A && git commit -qm base',
    'echo x > out.txt',
    'cat D:/repo/f.md',
    'rm -rf $TMPDIR/run/copy/target',
    '(cd D:/repo && git status); rm -rf target',
    'D=C:/Temp/run/copy/x; rm -rf $D',
    'Remove-Item -Recurse -Force C:\\Temp\\run\\copy\\target',
    'export X=C:/Temp/run/copy/x; rm -rf $X',
    'git diff --output=C:/Temp/run/d.patch',
    'bash -c "echo hi" > out.txt',
  ]) assert.equal(run(c, COPY).code, 0, c);
});

test('a non-read command whose argument names the reviewed repository is refused, wherever it runs (#147)', () => {
  for (const [c, cwd] of [
    ['make -C D:/repo', COPY],
    ['npm --prefix D:/repo install', COPY],
    ['curl -o D:/repo/x https://example.com/x', COPY],
    ['cargo build --manifest-path D:/repo/Cargo.toml', COPY],
    ['npm --prefix=D:/repo install', COPY],
    ['curl -oD:/repo/x https://example.com/x', COPY],
    ['cargo build --manifest-path=D:/repo/Cargo.toml', COPY],
    ['make -C ../repo', 'D:/elsewhere'],
    ['npm --prefix=../repo install', 'D:/elsewhere'],
    ['make -C /d/repo', COPY],
    ['make DESTDIR=D:/repo install', COPY],
    ['make -C D:/repo.worktrees/abc', COPY],
    ['make -C E:/elsewhere/wt-1/src', COPY],
    ['timeout 60 make -C D:/repo', COPY],
    ['npx prettier --write D:/repo/f.md', COPY],
    ['bash build.sh D:/repo', COPY],
    ['sort -o D:/repo/f.md f.md', COPY],
    ['uniq f.md D:/repo/f.md', COPY],
    ['git clone C:/Temp/run/copy D:/repo.worktrees/new', COPY],
    ['git -C C:/Temp/run/copy worktree add D:/repo.worktrees/x', COPY],
    [`node -e "require('fs').writeFileSync('D:/repo/x', '')"`, COPY],
    [`python -c "open('D:/repo/x', 'w')"`, COPY],
    ['cd C:/Temp/run/copy && make -C D:/repo', REPO],
    ['make -C $UNSET_VAR', COPY],
    ['make -C ${UNSET_VAR}/x', COPY],
    ['make -C %UNSET_VAR%/x', COPY],
    ['make -C $(pwd)/x', COPY],
    ['env -C D:/repo make', COPY],
    ['npm exec --prefix D:/repo -- make', COPY],
    ['D:/repo/build.sh', COPY],
    ['link /OUT:D:/repo/x.exe', COPY],
    ['curl -sSLoD:/repo/x https://example.com/x', COPY],
  ]) assert.equal(run(c, cwd).code, 2, c + ' in ' + cwd);
  for (const c of [
    'make -C D:\\repo',
    'npm --prefix D:\\repo install',
    'Invoke-WebRequest -Uri https://example.com/x -OutFile D:\\repo\\x',
    'iwr https://example.com/x -OutFile:D:\\repo\\x',
    'cargo build --manifest-path D:\\repo\\Cargo.toml',
  ]) assert.equal(ps(c, COPY).code, 2, c);
  assert.equal(ps('Invoke-WebRequest https://example.com/x -OutFile:..\\repo\\x', 'D:/elsewhere').code, 2);
  assert.equal(ps('csc /out:D:\\repo\\x.exe x.cs', COPY).code, 2);
  const spaced = {
    env: { CLAUDE_PROJECT_DIR: 'D:/repo with space' },
    fs: { exists: (p) => norm(p) === 'D:/repo with space/.git', read: () => null, list: () => [] },
  };
  assert.equal(run(`node -e "require('fs').writeFileSync('D:/repo with space/x', '')"`, COPY, spaced).code, 2);
  assert.equal(run(`node -e "require('fs').writeFileSync('D:/repo with spaceship/x', '')"`, COPY, spaced).code, 0);
});

test('reads of the reviewed repository, and commands on paths outside it, run from anywhere (#147)', () => {
  for (const [c, cwd] of [
    ['cat D:/repo/f.md', COPY],
    ['diff D:/repo/f.md C:/Temp/run/copy/f.md', COPY],
    ['grep -rn x D:/repo', COPY],
    ['sed -n 1,5p D:/repo/f.md', COPY],
    ['git -C D:/repo diff', COPY],
    ['git diff --no-index D:/repo/f.md f.md', COPY],
    ['make -C C:/Temp/run/copy', COPY],
    ['npm --prefix C:/Temp/run/copy test', COPY],
    ['curl -o out.txt https://example.com/x', COPY],
    ['cargo build --manifest-path C:/Temp/run/copy/Cargo.toml', COPY],
    ['node x.mjs D:/repository/f.md', COPY],
    ['make -C D:/repo-other', COPY],
    ['make -C build/d/repo', COPY],
    ['make -C build/$UNSET_VAR', COPY],
    ['timeout 5 cat D:/repo/f.md', COPY],
    ['git -c color.ui=never log -1', COPY],
    ['env -C C:/Temp/run/copy make', COPY],
    [`node -e "console.log([1].map(x=>x/2), /a$/.test(1))"`, COPY],
    ['curl "https://e.com/x?a=$Q"', COPY],
    ['git commit -qm "costs $5/month"', COPY],
    ["awk '{print $1 \"/\" $2}' f.md", COPY],
    ["awk '{print $1}' f.md", COPY],
    ['make -C ../copy', 'C:/Temp/run/other'],
  ]) assert.equal(run(c, cwd).code, 0, c + ' in ' + cwd);
  for (const c of [
    'Get-Content D:\\repo\\f.md',
    'npm --prefix C:\\Temp\\run\\copy test',
  ]) assert.equal(ps(c, COPY).code, 0, c);
});

test('a path whose place cannot be told is refused, never let through', () => {
  for (const [c, cwd] of [
    ['rm -rf $UNSET_VAR/target', COPY],
    ['echo x > $(pwd)/f', COPY],
    ['cd $UNSET_VAR && make', REPO],
    ['cd - && make', REPO],
  ]) assert.equal(run(c, cwd).code, 2, c);
});

test('the repository is found from the working directory where the project folder is not set', () => {
  const noProject = { env: { HOME: 'C:/Users/me' } };
  assert.equal(run('cargo clean', 'D:/repo/check-it', noProject).code, 2);
  assert.equal(run('cargo clean', 'D:/elsewhere', { env: {}, fs: { exists: () => false, read: () => null, list: () => [] } }).code, 0);
  assert.equal(run('cargo clean', WORKTREE + '/src', { env: {} }).code, 2);
  assert.equal(run('cargo clean', REPO + '/src', { env: { CLAUDE_PROJECT_DIR: WORKTREE } }).code, 2);
});

test('PowerShell tool calls are read with PowerShell quoting, where a backslash is a character', () => {
  for (const c of [
    'Stop-Process -Name node',
    'codex exec x',
    'Remove-Item -Recurse target',
    'Set-Location C:\\Temp; Remove-Item -Recurse -Force D:\\repo\\.git',
    'Set-Location D:\\repo\\.claude; Remove-Item -Recurse x',
    'Set-Location C:\\Temp\\typo; Remove-Item -Recurse target',
    'Set-Location C:\\Temp\\run\\copy; npm test',
    '$env:TMPDIR = "D:/repo"; Set-Location C:\\Temp\\run\\copy -ErrorAction Stop; Remove-Item -Recurse $env:TMPDIR\\x',
    '$TMPDIR = "D:/repo"; Set-Location C:\\Temp -ErrorAction Stop; Remove-Item -Recurse $TMPDIR/x',
  ]) assert.equal(ps(c).code, 2, c);
  for (const c of [
    'Get-Content f.md | Select-Object -First 5',
    'Set-Location C:\\Temp\\run\\copy -ErrorAction Stop; npm test',
    'Set-Location C:\\Temp\\run\\copy -ea Stop; Remove-Item -Recurse -Force .\\target',
    'Get-Content D:\\repo\\.github\\workflows\\ci.yml',
  ]) assert.equal(ps(c).code, 0, c);
});

test('the worker rules hold the kill and ledger rules only', () => {
  const worker = (command) =>
    decide(JSON.stringify({ tool_name: 'Bash', cwd: REPO, tool_input: { command } }), { env, fs, rules: WORKER_RULES, who: 'thegraph-herdr worker' });
  assert.equal(worker('taskkill /IM node.exe').code, 2);
  assert.match(worker('taskkill /IM node.exe').message, /^thegraph-herdr worker: .*#144/);
  assert.equal(worker('cargo clean').code, 0);
  assert.equal(worker('claude -p x').code, 0);
  assert.equal(worker('echo x > C:/Temp/thegraph/run.made.md').code, 2);
  assert.match(worker('echo x > C:/Temp/thegraph/run.made.md').message, /^thegraph-herdr worker: .*#138/);
  assert.equal(worker('echo x >> C:/Temp/thegraph/run.made.md').code, 0);
  assert.equal(decide(JSON.stringify({ tool_input: { command: 'ls' } }), { rules: ['kill'] }).code, 0);
});

test('each refusal names its rule and issue', () => {
  assert.match(run('claude -p x').message, /^check-it-reviewer: .*starts claude.*#131/);
  assert.match(run('codex exec x').message, /starts codex/);
  assert.match(run('pkill node').message, /image name.*#144/);
  assert.match(run('cargo clean').message, /#143/);
  assert.match(run('rm -rf D:/repo/x', COPY).message, /writes inside the reviewed repository.*#143/);
  assert.match(run('make -C D:/repo', COPY).message, /\x60make\x60 is not a read.*D:\/repo.*#147/);
});

test('input it cannot read is refused, never let through', () => {
  assert.equal(decide('not json').code, 2);
  assert.equal(decide(JSON.stringify({ tool_input: {} })).code, 2);
  assert.equal(decide(JSON.stringify({ tool_input: { command: 'ls' } })).code, 2);
  assert.equal(decide(JSON.stringify({ cwd: REPO, tool_input: { command: 'ls' } }), { env, fs }).code, 0);
});

const TRACKER_WRITES = [
  'gh issue comment 1 --body x',
  'gh pr comment 2 -b x',
  'gh issue create -t a -b b',
  'gh issue edit 3 --add-label bug',
  'gh issue close 3',
  'gh issue reopen 3',
  'gh pr review 4 --approve',
  'gh pr merge 4',
  'gh label create bug',
  'gh api -X POST repos/o/r/issues/1/comments -f body=x',
  'gh api --method=PATCH repos/o/r/issues/1',
  'gh api --method put repos/o/r/issues/1/lock',
  'gh api -XDELETE repos/o/r/labels/x',
  'gh api repos/o/r/issues/1/comments -f body=x',
  'gh api repos/o/r/issues/1/comments -F body=@f.md',
  'gh api repos/o/r/issues/1/comments --raw-field body=x',
  'gh api repos/o/r/issues/1/comments --field=body=x',
  'gh api --input body.json repos/o/r/issues',
  'glab issue note 1 -m x',
  'glab mr note 2 -m x',
  'glab issue create -t a',
  'glab issue update 1 --label x',
  'glab mr close 2',
  'glab mr approve 2',
  'glab api -X POST projects/1/issues',
  'glab api --method PUT projects/1',
  'glab api projects/1/issues -f title=x',
  '"C:/Program Files/GitHub CLI/gh.exe" issue comment 1 -b x',
  'bash -c "gh issue comment 1 -b x"',
  'env GH_TOKEN=x gh issue close 1',
  'git status && gh issue comment 1 -b x',
  'gh api -X GET repos/o/r/issues/146/comments -f body=x --method POST',
  'gh api -iXDELETE repos/o/r/labels/x',
  'gh api -iX DELETE repos/o/r/labels/x',
  'gh api -X GET repos/o/r/labels/x --method DELETE',
  'gh api --method GET repos/o/r/labels/x -X DELETE',
  'gh api -X GET search/issues -f q=x',
  'glab api -X GET projects/1/issues/2/notes -f body=x --method POST',
  'gh issue -R o/r comment 1 -b x',
  'gh -R o/r issue comment 1 -b x',
  'gh pr --repo o/r merge 2',
  'gh pr --repo=o/r merge 2',
  'glab -R g/p mr approve 2',
  'glab issue comment 779 -m x',
  'glab issue new -t a',
  'glab mr accept 3',
  'gh issue new -t a',
  'gh pr revert 4',
  'gh repo delete o/r --yes',
  'gh workflow run x',
  'gh release create v1',
  'gh secret set X -b y',
  'gh auth token',
  'gh',
  'gh api graphql -f query="mutation { addComment(input: {}) { clientMutationId } }"',
  "gh api graphql -f query='mutation{deleteIssue(input:{issueId:1}){clientMutationId}}'",
  'gh api graphql --input q.json',
  'gh api graphql -f query=@q.graphql',
];

test('a tracker command that is not a known read is refused, in the repository, in a copy and anywhere else', () => {
  for (const c of TRACKER_WRITES) {
    for (const cwd of [REPO, COPY, 'C:/Users/me']) {
      const r = run(c, cwd);
      assert.equal(r.code, 2, `${c} in ${cwd}`);
      assert.match(r.message, /not a tracker read/, c);
      assert.match(r.message, /#146/, c);
    }
  }
  const p = ps('Set-Location C:\\ -ErrorAction Stop; gh issue comment 1 --body x');
  assert.equal(p.code, 2);
  assert.match(p.message, /not a tracker read/);
});

test('a tracker read runs, in the repository too', () => {
  for (const c of [
    'gh issue view 146 --comments',
    'gh pr view 2',
    'gh pr diff 2',
    'gh issue list --state open',
    'gh api repos/o/r/issues/1',
    'gh api repos/o/r/issues/1/comments --paginate',
    'gh api --method GET repos/o/r',
    'gh issue view 146 -R o/r --comments',
    'gh issue -R o/r view 146',
    'gh pr checks 4',
    'gh pr status',
    'gh api graphql -f query="query { viewer { login } }"',
    "gh api graphql -f query='{ repository(owner:\"o\", name:\"r\") { issue(number:1) { title } } }'",
    'gh api graphql -F owner=o -f query="query($owner:String!){ repositoryOwner(login:$owner){ login } }"',
    'glab issue view 779',
    'glab mr view 3',
    'glab api projects/1/issues',
    'glab api -X GET projects/1',
    'glab issue list -R g/p',
    'glab mr diff 3',
  ]) {
    assert.deepEqual(run(c, REPO), { code: 0 }, c);
    assert.deepEqual(run(c, COPY), { code: 0 }, c);
  }
});

test('the tracker rule is check-it-reviewer\'s, not a worker\'s', () => {
  assert.deepEqual(run('gh issue comment 1 -b x', 'C:/Users/me', { rules: ['kill'] }), { code: 0 });
});

const LEDGERS = ['C:/Temp/thegraph/run.made.md', 'C:/Temp/made-20261124-0949-abcd1234/made.md'];
const tool = (tool_name, file_path, rules) =>
  decide(JSON.stringify({ tool_name, cwd: REPO, tool_input: { file_path, content: 'x' } }), { env, fs, ...(rules ? { rules } : {}) });
const ledgerOnly = (command, tool_name = 'Bash') =>
  decide(JSON.stringify({ tool_name, cwd: 'C:/Temp/run', tool_input: { command } }), { env, fs, rules: ['ledger'] });

test('a Write or Edit on a run ledger is refused, and one on any other file is let through', () => {
  for (const L of [...LEDGERS, 'C:\\Temp\\thegraph\\run.made.md', 'C:/Temp/thegraph/RUN.MADE.MD']) {
    for (const t of ['Write', 'Edit']) {
      const refused = tool(t, L);
      assert.equal(refused.code, 2, t + ' ' + L);
      assert.match(refused.message, /^check-it-reviewer: .*appended.*#138/, t + ' ' + L);
      assert.equal(tool(t, L, WORKER_RULES).code, 2, 'worker ' + t + ' ' + L);
    }
  }
  for (const p of ['C:/Temp/run/lens/report.md', 'C:/Temp/thegraph/run.md', 'C:/Temp/thegraph/run.made/notes.md', 'D:/repo/made.md.bak', 'D:/repo/premade.md']) {
    assert.deepEqual(tool('Write', p), { code: 0 }, p);
    assert.deepEqual(tool('Edit', p, WORKER_RULES), { code: 0 }, p);
  }
  assert.deepEqual(tool('Write', LEDGERS[0], ['kill']), { code: 0 });
  assert.equal(decide(JSON.stringify({ tool_name: 'Write', cwd: REPO, tool_input: {} }), { env, fs }).code, 2);
});

test('a shell command that rewrites a run ledger is refused, in every form that names it', () => {
  for (const L of LEDGERS) {
    for (const c of [
      `echo x > ${L}`,
      `cat C:/Temp/run/new.md > ${L}`,
      `printf x >| ${L}`,
      `echo x &> ${L}`,
      `echo x 1> ${L}`,
      `rm ${L}`,
      `mv C:/Temp/run/new.md ${L}`,
      `mv ${L} C:/Temp/run/old.md`,
      `cp C:/Temp/run/new.md ${L}`,
      `sed -i s/a/b/ ${L}`,
      `tee ${L} < C:/Temp/run/new.md`,
      `truncate -s 0 ${L}`,
      `perl -pi -e s/a/b/ ${L}`,
      `node -e "require('fs').writeFileSync('${L}', '')"`,
      `python -c "open('${L}', 'w').write('')"`,
      `bash -c "echo x > ${L}"`,
      `sudo tee ${L} < x`,
      `cd C:/Temp && echo x > ${L}`,
      `sort -o ${L} C:/Temp/run/new.md`,
      `sort --output=${L} C:/Temp/run/new.md`,
      `sort -o${L} ${L}`,
      `echo x >& ${L}`,
      `echo x >|${L}`,
      `ruby -i -pe 'x' ${L}`,
      `bash -c "true" > ${L}`,
    ]) {
      const refused = ledgerOnly(c);
      assert.equal(refused.code, 2, c);
      assert.match(refused.message, /#138/, c);
      assert.equal(run(c, 'C:/Temp/run').code, 2, 'reviewer ' + c);
    }
    for (const c of [
      `Set-Content -Path ${L} -Value x`,
      `Set-Content ${L} x`,
      `'x' | Out-File ${L}`,
      `'x' | Out-File -FilePath ${L}`,
      `Clear-Content ${L}`,
      `Remove-Item ${L}`,
      `New-Item ${L} -Force`,
      `Copy-Item C:/Temp/run/new.md -Destination ${L}`,
      `[IO.File]::WriteAllText('${L}', $s)`,
      `Get-Content ${L} | Where-Object { $_ -notmatch 'x' } | Set-Content ${L}`,
      `Set-Content -Path:${L} -Value x`,
      `'x' | Out-File -FilePath:${L}`,
      `Remove-Item -LiteralPath:${L}`,
    ]) assert.equal(ledgerOnly(c, 'PowerShell').code, 2, c);
  }
});

test('an append to a run ledger, a read of it and a path handed to a script are let through', () => {
  for (const L of LEDGERS) {
    for (const c of [
      `echo "x | deleted, 1M" >> ${L}`,
      `printf '%s\\n' x >> ${L}`,
      `echo x 1>> ${L}`,
      `echo x | tee -a ${L}`,
      `echo x | tee --append ${L}`,
      `cat ${L}`,
      `grep -n deleted ${L}`,
      `cp ${L} C:/Temp/run/copy.md`,
      `node D:/repo/check-it/scripts/check-it.mjs prompt bug --issue x --run-folder C:/Temp/run --ledger ${L}`,
      `echo x > C:/Temp/run/other.md`,
      `cd C:/Temp && echo x >> ${L}`,
      `timeout 5 echo x >> ${L}`,
      `node -e "console.log(process.argv[1])" ${L}`,
      `python -c "import sys; print(sys.argv[1])" ${L}`,
      `echo x >&2 >> ${L}`,
      `echo x 2>& 1 >> ${L}`,
    ]) assert.deepEqual(ledgerOnly(c), { code: 0 }, c);
    for (const c of [
      `Add-Content -Path ${L} -Value x`,
      `Add-Content ${L} x`,
      `'x' | Out-File -Append ${L}`,
      `'x' | Out-File -FilePath ${L} -Append`,
      `'x' | Tee-Object -Append -FilePath ${L}`,
      `Get-Content ${L}`,
      `'x' >> ${L}`,
      `$l='${L}'; Add-Content -Path $l -Value x`,
      `$l = '${L}'; Add-Content $l x`,
      `'x' | Out-File -Append:$true -FilePath ${L}`,
    ]) assert.deepEqual(ledgerOnly(c, 'PowerShell'), { code: 0 }, c);
  }
});

test('a clobbering redirection with >| or >& file writes into the repository and is refused, from inside it or outside (#143)', () => {
  for (const c of ['printf x >| D:/repo/.git/hooks/post-checkout', 'printf x >|D:/repo/x', 'echo x >& D:/repo/.git/hooks/post-checkout', 'echo x >&D:/repo/x']) {
    for (const cwd of ['C:/Temp/run', REPO]) {
      const refused = run(c, cwd);
      assert.equal(refused.code, 2, c + ' in ' + cwd);
      assert.match(refused.message, /writes inside the reviewed repository.*#143/, c + ' in ' + cwd);
    }
  }
  for (const c of ['echo x >&2', 'echo x >& 2', 'ls 2>&1', 'ls 2>& 1 | head', 'echo x >| C:/Temp/run/out.txt', 'echo x >& C:/Temp/run/out.txt', 'cp C:/Temp/a C:/Temp/b >& 2']) {
    assert.deepEqual(run(c, REPO), { code: 0 }, c);
  }
});
