import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { decide } from './model-run-check.mjs';

const SPENT = [/hit your usage limit/i, /reached your usage limit/i, /usage limit reached/i, /quota exceeded/i, /out of credits/i, /spend cap/i];

export const RUNNERS = {
  codex: {
    name: 'Codex',
    locate: locateCodex,
    args: ({ model, tree, report, hook }) => [
      'exec', '-c', 'windows.sandbox="unelevated"',
      '-c', `default_permissions="${PROFILE}"`, '-c', `permissions.${PROFILE}.extends=":read-only"`, '-c', `permissions.${PROFILE}.network.enabled=true`,
      '-c', 'shell_environment_policy.inherit="core"', '--disable', 'multi_agent', '--disable', 'apps', '-c', 'approval_policy="never"',
      '-c', `hooks.PreToolUse=[{matcher="^Bash$",hooks=[{type="command",command=${JSON.stringify(hook)},timeout=30}]}]`,
      '--dangerously-bypass-hook-trust',
      '--ephemeral', '--ignore-user-config', '-m', model, '-C', tree, '--json', '-o', report,
    ],
    hook: ({ node, skills }) => hookCommand(node, join(skills, 'check-it', 'scripts', 'codex-hook.mjs')),
    read: readEvents,
    outOfUsage: (text) => SPENT.some((re) => re.test(text)),
    timeoutMs: 30 * 60 * 1000,
  },
};

const PROFILE = 'check-it-review';

const BARE = /^[^\s"'`$&;|<>()]+$/;

export const hookCommand = (node, script) => (BARE.test(node) && BARE.test(script) ? `${node} ${script}` : undefined);

export function codexVerdict(stdin, { platform, env }) {
  let input;
  try {
    input = JSON.parse(stdin);
  } catch {
    input = null;
  }
  if (platform === 'win32' && input?.tool_name === 'Bash') input.tool_name = 'PowerShell';
  const { CLAUDE_PROJECT_DIR, ...rest } = env;
  const { code, message } = decide(input === null ? stdin : JSON.stringify(input), { who: 'check-it on Codex', env: rest });
  if (code === 0) return '';
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: message } });
}

export function readEvents(stdout) {
  let usage;
  const errors = [];
  for (const line of stdout.split(/\r?\n/)) {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e === null || typeof e !== 'object') continue;
    if (e.type === 'turn.completed' && e.usage) {
      usage ??= { input: 0, cached: 0, output: 0 };
      usage.input += e.usage.input_tokens ?? 0;
      usage.cached += e.usage.cached_input_tokens ?? 0;
      usage.output += e.usage.output_tokens ?? 0;
    } else if (e.type === 'error' && typeof e.message === 'string') {
      errors.push(e.message);
    } else if (e.type === 'turn.failed' && typeof e.error?.message === 'string') {
      errors.push(e.error.message);
    }
  }
  return { usage, errors };
}

export function locateCodex({ platform, pathDirs, isFile, execPath }) {
  if (platform !== 'win32') return { command: 'codex', args: [] };
  for (const dir of pathDirs) {
    const exe = join(dir, 'codex.exe');
    if (isFile(exe)) return { command: exe, args: [] };
    const entry = join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (isFile(join(dir, 'codex.cmd')) && isFile(entry)) return { command: execPath, args: [entry] };
  }
  return undefined;
}

export const spawnRunner = (command, args, { cwd, input, timeout }) => spawnSync(command, args, {
  cwd, input, timeout, encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024,
});
