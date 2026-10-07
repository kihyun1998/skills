#!/usr/bin/env node
// PreToolUse hook for a contributor clone: blocks Claude attribution in what a
// Bash or PowerShell command sends out (commits, tags, pushes, PR, issue and
// release text), and asks when the prose of a message mentions Claude or AI.
//
// Exit 2 blocks with the reason on stderr; an ask is JSON on stdout. Any failure
// to check blocks, because a hook that exits 1 lets the command run.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORMAT = [
  [/co-authored-by\s*[:=][^\n]*\b(claude|anthropic)\b/i, 'a Co-Authored-By trailer naming Claude'],
  [/generated with\s*\[?claude code/i, 'a "Generated with Claude Code" footer'],
];
// "AI" and "LLM" are matched in capitals only: lowercase `ai` is a path or a word.
const PROSE = [/\b(claude|anthropic)\b/i, /\b(AI|LLM)\b/];
const CLAUDE_BRANCH = /^([^:/]+:)?(refs\/heads\/)?claude\//i;

const GH_FLAGS = {
  pr: {
    verbs: new Set(['create', 'edit', 'comment', 'review', 'merge']),
    prose: [['-b', '-t'], ['--body', '--title', '--subject']],
    files: [['-F'], ['--body-file']],
  },
  issue: {
    verbs: new Set(['create', 'edit', 'comment']),
    prose: [['-b', '-t'], ['--body', '--title']],
    files: [['-F'], ['--body-file']],
  },
  release: {
    verbs: new Set(['create', 'edit']),
    prose: [['-n', '-t'], ['--notes', '--title']],
    files: [['-F'], ['--notes-file']],
  },
};

// Heredoc and here-string bodies are lifted out before tokenizing, so a quote
// inside a commit message cannot unbalance the command around it.
function liftBodies(command) {
  const bodies = [];
  const keep = (body) => `__BODY_${bodies.push(body) - 1}__`;
  let out = command.replace(
    /<<-?[ \t]*(['"]?)([A-Za-z_][\w-]*)\1([^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/g,
    (_m, _q, _tag, rest, body) => ` ${keep(body)}${rest}`,
  );
  out = out.replace(/@(['"])\r?\n([\s\S]*?)\r?\n\1@/g, (_m, _q, body) => keep(body));
  return { text: out, bodies };
}

function tokenize(text) {
  const tokens = [];
  let word = null;
  const flush = () => {
    if (word !== null) tokens.push({ word });
    word = null;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      const end = text.indexOf("'", i + 1);
      const stop = end === -1 ? text.length : end;
      word = (word ?? '') + text.slice(i + 1, stop);
      i = stop;
    } else if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\' && j + 1 < text.length) j++;
        s += text[j++];
      }
      word = (word ?? '') + s;
      i = j;
    } else if (c === '\\' && i + 1 < text.length && text[i + 1] !== '\n') {
      word = (word ?? '') + text[++i];
    } else if (c === '\n' || c === ';' || c === '|' || c === '&') {
      flush();
      tokens.push({ op: c });
    } else if (c === ' ' || c === '\t' || c === '\r') {
      flush();
    } else {
      word = (word ?? '') + c;
    }
  }
  flush();
  return tokens;
}

function segments(tokens) {
  const out = [[]];
  for (const t of tokens) {
    if (t.op) out.push([]);
    else out[out.length - 1].push(t.word);
  }
  return out
    .map((words) => {
      let i = 0;
      while (i < words.length && /^[A-Za-z_]\w*=/.test(words[i])) i++;
      return words.slice(i);
    })
    .filter((w) => w.length > 0);
}

const isTool = (word, name) => word === name || word.endsWith(`/${name}`) || word === `${name}.exe`;

// Reads a flag's value in any of `-m v`, `-mv`, `--message v`, `--message=v`.
function takeValue(words, i, short, long) {
  const w = words[i];
  for (const s of short) {
    if (w === s) return [words[i + 1], i + 1];
    if (s.length === 2 && w.startsWith(s) && !w.startsWith('--')) return [w.slice(2), i];
  }
  for (const l of long) {
    if (w === l) return [words[i + 1], i + 1];
    if (w.startsWith(`${l}=`)) return [w.slice(l.length + 1), i];
  }
  return null;
}

function messageFlags(rest, found) {
  for (let k = 0; k < rest.length; k++) {
    let v = takeValue(rest, k, ['-m'], ['--message']);
    if (v) { found.prose.push(v[0] ?? ''); k = v[1]; continue; }
    v = takeValue(rest, k, ['-F'], ['--file']);
    if (v) { if (v[0] && v[0] !== '-') found.files.push(v[0]); k = v[1]; }
  }
}

function parseGit(words, cwd) {
  let i = 1;
  let dir = cwd;
  while (i < words.length && words[i].startsWith('-')) {
    if (words[i] === '-C') dir = resolve(cwd, words[++i] ?? '.');
    else if (words[i] === '-c') i++;
    i++;
  }
  const sub = words[i];
  const rest = words.slice(i + 1);
  const found = { prose: [], files: [], branches: [], pushes: [], dir };

  if (sub === 'commit' || sub === 'tag') {
    messageFlags(rest, found);
  } else if (sub === 'push') {
    const push = { refspecs: [], all: false, del: false };
    let remoteNamed = false;
    const positional = [];
    for (let k = 0; k < rest.length; k++) {
      const w = rest[k];
      if (['-o', '--push-option', '--receive-pack', '--exec'].includes(w)) k++;
      else if (w === '--repo') { remoteNamed = true; k++; }
      else if (w.startsWith('--repo=')) remoteNamed = true;
      else if (['--all', '--mirror', '--branches'].includes(w)) push.all = true;
      else if (w === '-d' || w === '--delete') push.del = true;
      else if (!w.startsWith('-')) positional.push(w);
    }
    push.refspecs = remoteNamed ? positional : positional.slice(1);
    found.pushes.push(push);
  } else {
    return null;
  }
  return found;
}

function parseGh(words) {
  const [, group, verb, ...rest] = words;
  const found = { prose: [], files: [], branches: [], pushes: [] };
  const spec = GH_FLAGS[group];
  if (spec && spec.verbs.has(verb)) {
    let head = null;
    for (let k = 0; k < rest.length; k++) {
      let v = takeValue(rest, k, ...spec.prose);
      if (v) { found.prose.push(v[0] ?? ''); k = v[1]; continue; }
      v = takeValue(rest, k, ...spec.files);
      if (v) { if (v[0] && v[0] !== '-') found.files.push(v[0]); k = v[1]; continue; }
      v = group === 'pr' ? takeValue(rest, k, ['-H'], ['--head']) : null;
      if (v) { head = v[0] ?? ''; k = v[1]; }
    }
    // gh pushes the current branch itself when it has to, so a PR is a push.
    if (group === 'pr' && verb === 'create') {
      if (head !== null) found.branches.push(head);
      else found.pushes.push({ refspecs: [], all: false, del: false });
    }
    return found;
  }
  if (group === 'api') {
    const fields = [verb, ...rest];
    const values = [];
    let read = false;
    for (let k = 0; k < fields.length; k++) {
      let v = takeValue(fields, k, ['-X'], ['--method']);
      if (v) { read = (v[0] ?? '').toUpperCase() === 'GET'; k = v[1]; continue; }
      v = takeValue(fields, k, [], ['--input']);
      if (v) { if (v[0] && v[0] !== '-') found.files.push(v[0]); k = v[1]; continue; }
      v = takeValue(fields, k, ['-f', '-F'], ['--field', '--raw-field']);
      if (!v) continue;
      k = v[1];
      const value = (v[0] ?? '').replace(/^[^=]*=/, '');
      if (value.startsWith('@') && value !== '@-') found.files.push(value.slice(1));
      else values.push(value);
    }
    // A GET sends its fields as a query, and a query is not something published.
    if (!read) found.prose.push(...values);
    return found;
  }
  return null;
}

// What one push sends: the revisions whose messages leave, and the branch names
// that land upstream.
function pushed(push, git, dir) {
  const current = () => git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  if (push.all) {
    const names = git(dir, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']).split('\n').filter(Boolean);
    return { revs: ['--branches'], dests: push.del ? [] : names };
  }
  if (push.refspecs.length === 0) return { revs: ['HEAD'], dests: push.del ? [] : [current()] };
  const revs = [];
  const dests = [];
  for (const spec of push.refspecs) {
    const bare = spec.replace(/^\+/, '');
    if (bare.startsWith('-')) throw new Error(`refspec "${spec}" reads as an option`);
    const [src, dest] = bare.split(':');
    if (src) revs.push(src);
    // Deleting a branch (`-d`, or an empty source) sends no name worth keeping out.
    if (push.del || !src) continue;
    const name = dest ?? src;
    dests.push(name === 'HEAD' || name === '@' ? current() : name);
  }
  return { revs, dests };
}

function mentionIn(text) {
  for (const re of PROSE) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

// The `git log` arguments for commits not yet on any remote. With no
// remote-tracking ref at all that is the whole history, upstream's included, so
// the check refuses rather than reading every commit as new.
function unpushedRange(revs, git, dir) {
  if (!git(dir, ['for-each-ref', '--count=1', '--format=%(refname)', 'refs/remotes']).trim()) {
    throw new Error('no remote-tracking refs, so nothing tells what is new; run git fetch first');
  }
  const tail = revs[0] === '--branches' ? revs : ['--end-of-options', ...revs];
  return ['--not', '--remotes', '--not', ...tail];
}

const SHELLS = { bash: '-c', sh: '-c', zsh: '-c', pwsh: '-command', powershell: '-command' };

// Gathers what one command string sends into `acc`; a shell handed a command
// with `-c` / `-Command` has that command gathered too.
function collect(command, cwd, { readFile, git }, acc) {
  const { text, bodies } = liftBodies(command);
  const expand = (s) => s.replace(/__BODY_(\d+)__/g, (_m, n) => bodies[Number(n)]);
  let relevant = false;

  for (const words of segments(tokenize(text))) {
    const shell = Object.keys(SHELLS).find((s) => isTool(words[0], s));
    if (shell) {
      const flag = SHELLS[shell];
      const at = words.findIndex((w, k) => k > 0 && (w.toLowerCase() === flag || w.toLowerCase() === '-c'));
      if (at > 0 && at + 1 < words.length) {
        // A POSIX shell takes one argument; PowerShell joins the rest.
        const inner = flag === '-c' ? words[at + 1] : words.slice(at + 1).join(' ');
        relevant = collect(expand(inner), cwd, { readFile, git }, acc) || relevant;
      }
      continue;
    }
    const found = isTool(words[0], 'git') ? parseGit(words, cwd)
      : isTool(words[0], 'gh') ? parseGh(words) : null;
    if (!found) continue;
    relevant = true;
    const dir = found.dir ?? cwd;
    for (const p of found.prose) acc.prose.push(expand(p));
    for (const f of found.files) {
      const content = readFile(resolve(dir, f));
      acc.prose.push(content);
      acc.format.push(content);
    }
    acc.branches.push(...found.branches);
    for (const push of found.pushes) {
      const { revs, dests } = pushed(push, git, dir);
      acc.branches.push(...dests);
      if (revs.length === 0) continue;
      acc.format.push(git(dir, ['log', '--format=%B%x00', ...unpushedRange(revs, git, dir)]));
    }
  }
  if (relevant) {
    // A body read from stdin (`-F -`, a pipe) is the value of no flag, so every
    // body counts as message text.
    acc.prose.push(...bodies);
    acc.format.push(command);
  }
  return relevant;
}

function judge({ format, prose, branches }) {
  for (const t of format) {
    for (const [re, what] of FORMAT) {
      if (re.test(t)) return { action: 'block', reason: `This contributor clone sends no Claude attribution: remove ${what}.` };
    }
  }
  const branch = branches.find((b) => CLAUDE_BRANCH.test(b));
  if (branch) return { action: 'block', reason: `This contributor clone pushes no claude/ branch: rename ${branch}.` };
  for (const p of prose) {
    const word = mentionIn(p);
    if (word) return { action: 'ask', reason: `The message mentions Claude or AI: "${word}". Send it to the upstream repository anyway?` };
  }
  return { action: 'pass' };
}

const failed = (err) => ({ action: 'block', reason: `Attribution check could not run, so it blocks: ${err.message}` });

/**
 * Decides what one shell command may send.
 * @param {{command: string, cwd: string}} call
 * @param {{readFile: (path: string) => string, git: (cwd: string, args: string[]) => string}} deps
 * @returns {{action: 'pass' | 'ask' | 'block', reason?: string}}
 */
export function inspect({ command, cwd }, deps) {
  try {
    const acc = { format: [], prose: [], branches: [] };
    if (!collect(command, cwd, deps, acc)) return { action: 'pass' };
    return judge(acc);
  } catch (err) {
    return failed(err);
  }
}

const MCP_PROSE = new Set(['body', 'title', 'message', 'comment', 'description', 'notes', 'content']);
const MCP_BRANCH = new Set(['head', 'branch', 'ref']);

/**
 * Decides what one tool call may send: a shell command, or a GitHub MCP write.
 * @param {{tool_name: string, tool_input: object, cwd: string}} call
 */
export function inspectTool({ tool_name, tool_input, cwd }, deps) {
  if (tool_name === 'Bash' || tool_name === 'PowerShell') {
    return inspect({ command: tool_input?.command ?? '', cwd }, deps);
  }
  if (!/^mcp__.*github/i.test(tool_name)) return { action: 'pass' };
  const acc = { format: [], prose: [], branches: [] };
  const walk = (value, key) => {
    if (typeof value === 'string') {
      acc.format.push(value);
      if (MCP_PROSE.has(key)) acc.prose.push(value);
      if (MCP_BRANCH.has(key)) acc.branches.push(value);
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, Array.isArray(value) ? key : k);
    }
  };
  walk(tool_input, '');
  return judge(acc);
}

const ZERO = /^0+$/;

/**
 * Decides a git pre-push: `lines` is the hook's stdin, one
 * `<local ref> <local sha> <remote ref> <remote sha>` per ref pushed.
 */
export function inspectPrePush(lines, cwd, { git }) {
  try {
    const acc = { format: [], prose: [], branches: [] };
    for (const line of lines.split('\n')) {
      const [, local, remoteRef, remote] = line.trim().split(/\s+/);
      if (!local || ZERO.test(local)) continue;
      acc.branches.push(remoteRef.replace(/^refs\/heads\//, ''));
      const range = ZERO.test(remote) ? unpushedRange([local], git, cwd) : ['--end-of-options', `${remote}..${local}`];
      acc.format.push(git(cwd, ['log', '--format=%B%x00', ...range]));
    }
    return judge(acc);
  } catch (err) {
    return failed(err);
  }
}

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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
