// What a contributor clone may send: Claude attribution in commits, tags,
// pushes, PR, issue and release text is blocked, and a Claude or AI mention in
// a message's prose asks. `no-attribution.mjs` is the hook that runs it.

import { resolve } from 'node:path';

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

// A redirection (`2>&1`, `> out.log`, `&>`, PowerShell's `*>` and `2>$null`) is
// dropped with its file descriptor and its target, so neither reads as an argument.
// The target of `<` is kept as an input file and that of `<<<` as a string, since
// either can be a message read from stdin. `shell` is `bash` or `powershell`: it
// decides the escape character and whether `*` before `>` is a file descriptor.
function tokenize(text, shell) {
  const escape = shell === 'powershell' ? '`' : '\\';
  const tokens = [];
  let word = null;
  let quoted = false;
  let target = null;
  const flush = () => {
    if (word !== null) {
      if (target === null) tokens.push({ word });
      else if (target !== 'drop') tokens.push({ [target]: word });
      target = null;
    }
    word = null;
    quoted = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      const end = text.indexOf("'", i + 1);
      const stop = end === -1 ? text.length : end;
      word = (word ?? '') + text.slice(i + 1, stop);
      quoted = true;
      i = stop;
    } else if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === escape && j + 1 < text.length) j++;
        s += text[j++];
      }
      word = (word ?? '') + s;
      quoted = true;
      i = j;
    } else if (c === escape && i + 1 < text.length) {
      // An escaped newline continues the line.
      if (text[i + 1] === '\n' || text.startsWith('\r\n', i + 1)) {
        flush();
        i += text[i + 1] === '\r' ? 2 : 1;
      } else {
        word = (word ?? '') + text[++i];
        quoted = true;
      }
    } else if (c === '<' || c === '>' || (c === '&' && text[i + 1] === '>')) {
      const fd = shell === 'powershell' ? /^(\d+|\*)$/ : /^\d+$/;
      if (!quoted && fd.test(word ?? '')) word = null;
      flush();
      if (text.startsWith('<<<', i)) {
        target = 'string';
        i += 2;
      } else if (c === '<' && !'<>&'.includes(text[i + 1])) {
        target = 'input';
      } else {
        // `>&`, `<&`, `>|` and `<<` are one operator; `&>` and `>>` repeat this branch.
        if ('&|<'.includes(text[i + 1])) i++;
        target = 'drop';
      }
    } else if (c === '#' && word === null) {
      // A comment runs to the end of the line.
      while (i + 1 < text.length && text[i + 1] !== '\n') i++;
    } else if (shell === 'powershell' && c === '&' && text[i + 1] !== '&') {
      // PowerShell's call operator: `& git push` runs git. The first `&` of `&&`
      // still ends the command.
      flush();
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

// One simple command each: its words, the files and strings redirected into its
// stdin, and the command piped into it, if any.
function segments(tokens) {
  const blank = (piped) => ({ words: [], input: [], string: [], piped });
  const out = [blank(null)];
  for (const t of tokens) {
    const seg = out[out.length - 1];
    if (t.op) out.push(blank(t.op === '|' ? seg : null));
    else if (t.input !== undefined) seg.input.push(t.input);
    else if (t.string !== undefined) seg.string.push(t.string);
    else seg.words.push(t.word);
  }
  for (const seg of out) {
    let i = 0;
    while (i < seg.words.length && /^[A-Za-z_]\w*=/.test(seg.words[i])) i++;
    seg.words = seg.words.slice(i);
  }
  return out.filter((seg) => seg.words.length > 0);
}

const READERS = ['cat', 'type', 'get-content', 'gc'];
const READER_VALUES = ['-encoding', '-totalcount', '-tail', '-head', '-first', '-last', '-delimiter', '-readcount', '-filter', '-include', '-exclude', '-stream'];

const ECHOES = ['echo', 'printf', 'write-output'];

// The text an `echo`, `printf` or `Write-Output` writes to its stdout.
function echoed(words) {
  if (!ECHOES.includes(words[0].toLowerCase())) return [];
  return [words.slice(1).join(' ')];
}

// The files a `cat`, `type` or `Get-Content` writes to its stdout.
function readerFiles(words) {
  if (!READERS.includes(words[0].toLowerCase())) return [];
  const files = [];
  for (let k = 1; k < words.length; k++) {
    const w = words[k].toLowerCase();
    if (READER_VALUES.includes(w)) k++;
    else if (!w.startsWith('-')) files.push(words[k]);
  }
  return files;
}

const isTool = (word, name) => {
  const base = word.split(/[\\/]/).pop();
  return base === name || base === `${name}.exe`;
};

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

// A message file flag's value: a file to read, or `-` for stdin.
function fileValue(value, found) {
  if (value === '-') found.stdin = true;
  else if (value) found.files.push(value);
}

function messageFlags(rest, found) {
  for (let k = 0; k < rest.length; k++) {
    let v = takeValue(rest, k, ['-m'], ['--message']);
    if (v) { found.prose.push(v[0] ?? ''); k = v[1]; continue; }
    v = takeValue(rest, k, ['-F'], ['--file']);
    if (v) { fileValue(v[0], found); k = v[1]; }
  }
}

// The branch a `switch`, `checkout` or `branch -m` leaves current. A word that may
// be a path rather than a branch (`checkout x`) counts: it only widens the check.
function switchTargets(sub, rest) {
  const create = { switch: ['-c', '-C', '--create', '--force-create', '--orphan'], checkout: ['-b', '-B', '--orphan'] }[sub] ?? [];
  const positional = [];
  let moved = sub !== 'branch';
  for (let k = 0; k < rest.length; k++) {
    const w = rest[k];
    // `checkout [<tree-ish>] -- <paths>` restores files and leaves HEAD where it is.
    if (w === '--' && sub === 'checkout') return [];
    const v = takeValue(rest, k, create.filter((f) => f.length === 2), create.filter((f) => f.length > 2));
    if (v) return v[0] ? [v[0]] : [];
    if (sub === 'branch' && ['-m', '-M', '--move'].includes(w)) moved = true;
    else if (!w.startsWith('-') || w === '-') positional.push(w);
  }
  if (!moved || positional.length === 0) return [];
  return [sub === 'branch' ? positional[positional.length - 1] : positional[0]];
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
  } else if (sub === 'switch' || sub === 'checkout' || sub === 'branch') {
    found.switches = switchTargets(sub, rest);
  } else {
    return null;
  }
  return found;
}

// A branch an earlier part of the command switches to that no word names.
const UNKNOWN = Symbol('unnamed branch');

// The branch `gh pr checkout` leaves current: `-b` or a branch argument names it;
// a number or URL names a pull request whose head branch only GitHub knows.
function checkoutTargets(rest) {
  let target = null;
  for (let k = 0; k < rest.length; k++) {
    const v = takeValue(rest, k, ['-b'], ['--branch']);
    if (v) return v[0] ? [v[0]] : [];
    if (rest[k] === '--detach') return [];
    if (['-R', '--repo'].includes(rest[k])) k++;
    else if (!rest[k].startsWith('-')) target ??= rest[k];
  }
  if (target === null) return [UNKNOWN];
  return /^\d+$/.test(target) || /^https?:/.test(target) ? [UNKNOWN] : [target];
}

function parseGh(words) {
  const [, group, verb, ...rest] = words;
  const found = { prose: [], files: [], branches: [], pushes: [] };
  if (group === 'pr' && (verb === 'checkout' || verb === 'co')) {
    found.switches = checkoutTargets(rest);
    return found;
  }
  const spec = GH_FLAGS[group];
  if (spec && spec.verbs.has(verb)) {
    let head = null;
    for (let k = 0; k < rest.length; k++) {
      let v = takeValue(rest, k, ...spec.prose);
      if (v) { found.prose.push(v[0] ?? ''); k = v[1]; continue; }
      v = takeValue(rest, k, ...spec.files);
      if (v) { fileValue(v[0], found); k = v[1]; continue; }
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
      if (v) { fileValue(v[0], found); k = v[1]; continue; }
      v = takeValue(fields, k, ['-f', '-F'], ['--field', '--raw-field']);
      if (!v) continue;
      k = v[1];
      const value = (v[0] ?? '').replace(/^[^=]*=/, '');
      if (value === '@-') found.stdin = true;
      else if (value.startsWith('@')) found.files.push(value.slice(1));
      else values.push(value);
    }
    // A GET sends its fields as a query, and a query is not something published.
    if (!read) found.prose.push(...values);
    return found;
  }
  return null;
}

// What one push sends: the revisions whose messages leave, and the branch names
// that land upstream. `switched` holds the branches an earlier part of the same
// command may have made current; HEAD stands for those as well as for its own.
function pushed(push, git, dir, switched) {
  const switchedTo = () => {
    // A later tool call reads HEAD once the switch has happened.
    if (switched.includes(UNKNOWN)) throw new Error('gh pr checkout switches to a branch this check cannot name; run the push as its own command');
    return switched;
  };
  const current = () => [git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(), ...switchedTo()];
  if (push.all) {
    const names = git(dir, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']).split('\n').filter(Boolean);
    return { revs: ['--branches'], dests: push.del ? [] : names };
  }
  if (push.refspecs.length === 0) return { revs: ['HEAD', ...switchedTo()], dests: push.del ? [] : current() };
  const head = (r) => r === 'HEAD' || r === '@';
  const revs = [];
  const dests = [];
  for (const spec of push.refspecs) {
    const bare = spec.replace(/^\+/, '');
    if (bare.startsWith('-')) throw new Error(`refspec "${spec}" reads as an option`);
    const [src, dest] = bare.split(':');
    if (src) revs.push(src, ...(head(src) ? switchedTo() : []));
    // Deleting a branch (`-d`, or an empty source) sends no name worth keeping out.
    if (push.del || !src) continue;
    const name = dest ?? src;
    dests.push(...(head(name) ? current() : [name]));
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

const resolves = (rev, git, dir) => {
  try {
    git(dir, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]);
    return true;
  } catch {
    return false;
  }
};

// The `git log` arguments for commits not yet on any remote. With no
// remote-tracking ref at all that is the whole history, upstream's included, so
// the check refuses rather than reading every commit as new. A rev that does not
// resolve yet — a branch the same command creates — stands for every local branch.
function unpushedRange(revs, git, dir) {
  if (!git(dir, ['for-each-ref', '--count=1', '--format=%(refname)', 'refs/remotes']).trim()) {
    throw new Error('no remote-tracking refs, so nothing tells what is new; run git fetch first');
  }
  const named = revs.filter((r) => r !== '--branches');
  const found = named.filter((r) => resolves(r, git, dir));
  const branches = found.length < named.length || named.length < revs.length ? ['--branches'] : [];
  const tail = found.length ? ['--end-of-options', ...found] : [];
  return ['--not', '--remotes', '--not', ...branches, ...tail];
}

const SHELLS = { bash: '-c', sh: '-c', zsh: '-c', pwsh: '-command', powershell: '-command' };

// Git Bash on Windows names a drive as `/c/...`, which node reads as a folder.
const local = (path, shell) =>
  shell === 'bash' && process.platform === 'win32' && /^\/[a-zA-Z](\/|$)/.test(path) ? `${path[1].toUpperCase()}:${path.slice(2) || '/'}` : path;

// Gathers what one command string, run by `shell`, sends into `acc`; a shell
// handed a command with `-c` / `-Command` has that command gathered too.
function collect(command, cwd, { readFile, git }, acc, shell) {
  const { text, bodies } = liftBodies(command);
  const expand = (s) => s.replace(/__BODY_(\d+)__/g, (_m, n) => bodies[Number(n)]);
  let relevant = false;

  for (const seg of segments(tokenize(text, shell))) {
    const { words } = seg;
    const nested = Object.keys(SHELLS).find((s) => isTool(words[0], s));
    if (nested) {
      const flag = SHELLS[nested];
      const at = words.findIndex((w, k) => k > 0 && (w.toLowerCase() === flag || w.toLowerCase() === '-c'));
      if (at > 0 && at + 1 < words.length) {
        // A POSIX shell takes one argument; PowerShell joins the rest.
        const inner = flag === '-c' ? words[at + 1] : words.slice(at + 1).join(' ');
        const innerShell = flag === '-c' ? 'bash' : 'powershell';
        relevant = collect(expand(inner), cwd, { readFile, git }, acc, innerShell) || relevant;
      }
      continue;
    }
    const found = isTool(words[0], 'git') ? parseGit(words, cwd)
      : isTool(words[0], 'gh') ? parseGh(words) : null;
    if (!found) continue;
    if (found.switches) {
      acc.switched ??= new Map();
      const dir = found.dir ?? cwd;
      const key = resolve(dir);
      const names = acc.switched.get(key) ?? [];
      for (const name of found.switches) {
        if (name === UNKNOWN) { names.push(name); continue; }
        // git refuses a branch named like an option, so that switch moves nothing.
        if (name.startsWith('-') && name !== '-') continue;
        // `-` is the branch before this one; it is unknown only where git has none.
        if (name !== '-' && !name.startsWith('@{-')) { names.push(name); continue; }
        try {
          names.push(git(dir, ['rev-parse', '--abbrev-ref', name === '-' ? '@{-1}' : name]).trim());
        } catch { /* git has no previous branch, so the switch fails and nothing moves */ }
      }
      acc.switched.set(key, names);
      continue;
    }
    relevant = true;
    const dir = found.dir ?? cwd;
    for (const p of found.prose) acc.prose.push(expand(p));
    // A redirected or piped file is opened by the shell, so it is found from the
    // shell's directory, not from `git -C`.
    const stdin = found.stdin ? [...seg.input, ...(seg.piped ? readerFiles(seg.piped.words) : [])] : [];
    const read = [...found.files.map((f) => [dir, f]), ...stdin.map((f) => [cwd, f])];
    for (const [base, f] of read) {
      const content = f === '/dev/null' ? '' : readFile(resolve(base, local(f, shell)));
      acc.prose.push(content);
      acc.format.push(content);
    }
    if (found.stdin) {
      acc.prose.push(...seg.string.map(expand));
      if (seg.piped) acc.prose.push(...echoed(seg.piped.words).map(expand));
    }
    acc.branches.push(...found.branches);
    for (const push of found.pushes) {
      const { revs, dests } = pushed(push, git, dir, acc.switched?.get(resolve(dir)) ?? []);
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
 * @param {{command: string, cwd: string, shell?: 'bash' | 'powershell'}} call
 * @param {{readFile: (path: string) => string, git: (cwd: string, args: string[]) => string}} deps
 * @returns {{action: 'pass' | 'ask' | 'block', reason?: string}}
 */
export function inspect({ command, cwd, shell = 'bash' }, deps) {
  try {
    const acc = { format: [], prose: [], branches: [] };
    if (!collect(command, cwd, deps, acc, shell)) return { action: 'pass' };
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
    const shell = tool_name === 'PowerShell' ? 'powershell' : 'bash';
    return inspect({ command: tool_input?.command ?? '', cwd, shell }, deps);
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
