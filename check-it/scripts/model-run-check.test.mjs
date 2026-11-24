import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startsAiCli, killsByImageName, decide } from './model-run-check.mjs';

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

test('the worker rules hold the kill rule only', () => {
  const worker = (command) =>
    decide(JSON.stringify({ tool_name: 'Bash', cwd: REPO, tool_input: { command } }), { env, fs, rules: ['kill'], who: 'thegraph-herdr worker' });
  assert.equal(worker('taskkill /IM node.exe').code, 2);
  assert.match(worker('taskkill /IM node.exe').message, /^thegraph-herdr worker: .*#144/);
  assert.equal(worker('cargo clean').code, 0);
  assert.equal(worker('claude -p x').code, 0);
  assert.equal(decide(JSON.stringify({ tool_input: { command: 'ls' } }), { rules: ['kill'] }).code, 0);
});

test('each refusal names its rule and issue', () => {
  assert.match(run('claude -p x').message, /^check-it-reviewer: .*starts claude.*#131/);
  assert.match(run('codex exec x').message, /starts codex/);
  assert.match(run('pkill node').message, /image name.*#144/);
  assert.match(run('cargo clean').message, /#143/);
  assert.match(run('rm -rf D:/repo/x', COPY).message, /writes inside the reviewed repository.*#143/);
});

test('input it cannot read is refused, never let through', () => {
  assert.equal(decide('not json').code, 2);
  assert.equal(decide(JSON.stringify({ tool_input: {} })).code, 2);
  assert.equal(decide(JSON.stringify({ tool_input: { command: 'ls' } })).code, 2);
  assert.equal(decide(JSON.stringify({ cwd: REPO, tool_input: { command: 'ls' } }), { env, fs }).code, 0);
});
