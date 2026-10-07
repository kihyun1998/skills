#!/usr/bin/env node
// PreToolUse hook (and, with --pre-push, git pre-push hook) for a contributor
// clone. Exit 2 blocks a tool call with the reason on stderr and JSON on stdout
// asks; for git any non-zero exit stops the push. Any failure to check blocks,
// because a PreToolUse hook that exits 1 lets the command run.
//
// It runs main() unconditionally: it is reached through the ~/.claude/skills
// link, where argv[1] and import.meta.url name different paths.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inspectPrePush, inspectTool } from './attribution-check.mjs';

const realDeps = {
  readFile: (path) => readFileSync(path, 'utf8'),
  git: (dir, args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
};

// As a PreToolUse hook: exit 2 blocks, JSON on stdout asks. As a git pre-push
// hook (`--pre-push`): any non-zero exit stops the push.
function main() {
  const prePush = process.argv.includes('--pre-push');
  let stdin;
  try {
    stdin = readFileSync(0, 'utf8');
  } catch (err) {
    process.stderr.write(`Attribution check could not read its input: ${err.message}\n`);
    process.exit(2);
  }
  if (prePush) {
    const verdict = inspectPrePush(stdin, process.cwd(), realDeps);
    if (verdict.action === 'block') {
      process.stderr.write(`${verdict.reason}\n`);
      process.exit(1);
    }
    process.exit(0);
  }
  let input;
  try {
    input = JSON.parse(stdin);
  } catch (err) {
    process.stderr.write(`Attribution check could not read its input: ${err.message}\n`);
    process.exit(2);
  }
  const verdict = inspectTool(
    { tool_name: input.tool_name ?? 'Bash', tool_input: input.tool_input ?? {}, cwd: input.cwd ?? process.cwd() },
    realDeps,
  );
  if (verdict.action === 'block') {
    process.stderr.write(`${verdict.reason}\n`);
    process.exit(2);
  }
  if (verdict.action === 'ask') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: verdict.reason },
    }));
  }
  process.exit(0);
}

main();
