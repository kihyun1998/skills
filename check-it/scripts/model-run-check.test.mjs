import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runsClaude, decide } from './model-run-check.mjs';

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
    'sh -lc \'claude -p x\'',
    'cmd /c claude -p x',
    'C:\\Users\\me\\claude.exe -p x',    'powershell -NoProfile -Command "claude -p x"',
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
  ]) assert.equal(runsClaude(c), true, c);
});

test('a command that only names claude is let through', () => {
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
  ]) assert.equal(runsClaude(c), false, c);
});

test('input it cannot read is refused, never let through', () => {
  assert.equal(decide('not json').code, 2);
  assert.equal(decide(JSON.stringify({ tool_input: {} })).code, 2);
  assert.equal(decide(JSON.stringify({ tool_input: { command: 'ls' } })).code, 0);
});
