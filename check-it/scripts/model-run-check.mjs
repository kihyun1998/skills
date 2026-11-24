import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';

const AI_PACKAGES = ['@anthropic-ai/claude-code', '@openai/codex', '@google/gemini-cli'];
const AI_NAMES = new Set(['claude', 'claude-code', 'codex', 'agy', 'gemini']);

const WRAPPERS = new Set([
  'env', 'exec', 'command', 'builtin', 'nohup', 'sudo', 'doas', 'time', 'nice', 'ionice', 'stdbuf',
  'timeout', 'xargs', 'npx', 'bunx', 'pnpx', 'call', 'start', 'start-process', 'saps',
]);
const WRAPPER_VALUE_FLAGS = new Set(['-u', '-g', '-n', '-s', '-k', '-i', '-o', '-e', '-I', '-L', '-P', '-d', '-E', '-a', '-c', '-p', '-C']);
const RUNNERS = new Map([
  ['pnpm', new Set(['dlx', 'exec'])],
  ['yarn', new Set(['dlx', 'exec'])],
  ['npm', new Set(['exec', 'x'])],
  ['bun', new Set(['x'])],
]);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd']);
const STRING_RUNNERS = new Set(['eval', 'iex', 'invoke-expression']);

const KEYWORDS = new Set(['!', 'if', 'then', 'else', 'elif', 'while', 'until', 'do', 'time', 'fi', 'done', 'esac']);
const REDIRECT = /^[0-9*]*(>&|<&|&>>?|>>?\|?|<<?<?)/;

const READERS = new Set([
  'cat', 'head', 'tail', 'wc', 'grep', 'egrep', 'fgrep', 'rg', 'ls', 'dir', 'tree', 'file', 'stat', 'du', 'df',
  'pwd', 'echo', 'printf', 'true', 'false', 'test', '[', '[[', ']]', 'which', 'type', 'whereis', 'basename',
  'dirname', 'realpath', 'readlink', 'diff', 'cmp', 'comm', 'cut', 'tr', 'nl', 'od', 'xxd', 'hexdump',
  'strings', 'md5sum', 'sha1sum', 'sha256sum', 'jq', 'column', 'fold', 'paste', 'rev', 'date', 'whoami',
  'hostname', 'uname', 'export', 'unset', 'sleep', 'sed', 'sort', 'find', 'uniq',
  'get-content', 'gc', 'get-childitem', 'gci', 'select-string', 'sls', 'test-path', 'get-item', 'gi',
  'get-itemproperty', 'gp', 'resolve-path', 'rvpa', 'get-location', 'gl', 'measure-object', 'measure',
  'select-object', 'select', 'where-object', 'where', '?', 'sort-object', 'format-table', 'ft', 'format-list',
  'fl', 'out-string', 'out-host', 'write-output', 'write', 'write-host', 'convertfrom-json', 'convertto-json',
  'get-filehash', 'compare-object', 'group-object', 'get-command', 'gcm', 'get-date', 'join-path', 'split-path',
  'get-process', 'gps', 'get-ciminstance',
]);
const READER_WRITE_FLAGS = new Map([
  ['sed', /^(-i.*|--in-place.*|-[a-zA-Z]*i[a-zA-Z]*)$/],
  ['sort', /^(-o.*|--output.*)$/],
  ['find', /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/],
  ['rg', /^--pre(=.*)?$/],
  ['tree', /^-o$/],
  ['file', /^-C$/],
  ['date', /^(-s.*|--set.*)$/],
]);
const SED_PRINT = /^((\d+|\$)(,(\d+|\$|\+\d+))?|\/[^/]*\/(,\/[^/]*\/)?)p$/;
const ASSIGNERS = new Set(['export', 'declare', 'typeset', 'local', 'readonly']);
const CD = new Set(['cd', 'chdir', 'pushd', 'popd', 'set-location', 'sl', 'push-location', 'pop-location']);
const GIT_READS = new Set([
  'diff', 'log', 'show', 'status', 'blame', 'annotate', 'grep', 'ls-files', 'ls-tree', 'rev-parse', 'rev-list',
  'cat-file', 'shortlog', 'describe', 'merge-base', 'show-ref', 'name-rev', 'whatchanged', 'diff-tree',
  'diff-files', 'diff-index', 'for-each-ref', 'count-objects', 'check-ignore', 'check-attr', 'var', 'help',
  'version',
]);
const GIT_READ_FORMS = new Map([
  ['stash', (a) => ['list', 'show'].includes(a[0])],
  ['worktree', (a) => a[0] === 'list'],
  ['remote', (a) => a.length === 0 || (a.every((x) => x.startsWith('-')) && a.every((x) => /^(-v|--verbose)$/.test(x)))],
  ['config', (a) => a.some((x) => /^(--get|--get-all|--get-regexp|--list|-l)$/.test(x))],
  ['tag', (a) => a.length === 0 || a.some((x) => /^(-l|--list)$/.test(x))],
  ['reflog', (a) => a.length === 0 || a[0] === 'show'],
  ['branch', (a) => a.every((x) => x.startsWith('-') && !/^(-[dDmMcCuf]|--delete|--move|--copy|--force|--set-upstream-to.*|--unset-upstream|--edit-description)$/.test(x))],
]);
const WRITERS = new Set([
  'rm', 'rmdir', 'unlink', 'mv', 'touch', 'mkdir', 'chmod', 'chown', 'truncate', 'shred', 'tee',
  'remove-item', 'ri', 'del', 'erase', 'rd', 'move-item', 'mi', 'move', 'rename-item', 'rni', 'ren',
  'new-item', 'ni', 'md', 'set-content', 'sc', 'add-content', 'ac', 'clear-content', 'clc', 'out-file',
  'tee-object', 'set-item', 'si', 'clear-item', 'cli',
]);
const COPIERS = new Set(['dd', 'cp', 'copy-item', 'copy', 'cpi', 'rsync', 'robocopy', 'xcopy', 'ln', 'tar']);
const PS_PATH_PARAMS = /^-(path|literalpath|lp|pspath|filepath|destination|dest|target|targetpath)$/i;
const PS_OTHER_VALUE_PARAMS = /^-(erroraction|ea|value|encoding|itemtype|type|name|filter|include|exclude|stream|delimiter|width|inputobject|newname|credential)$/i;
const PS_COLON = /^(-[A-Za-z]+):(.+)$/;
const SINKS = new Set(['/dev/null', 'nul', '$null', 'nul:']);

const KILL_NAMES = new Set(['pkill', 'killall']);

const FILE_TOOLS = new Set(['Write', 'Edit']);
const INTERPRETERS = new Set(['node', 'bun', 'deno', 'python', 'python3', 'py', 'perl', 'ruby', 'php']);
const INLINE_FLAG = /^(-[a-zA-Z]*[ecpEr]|--eval|--print)$/;
const IN_PLACE = new Set(['perl', 'ruby']);
const ledgerPath = (word) => /(^|[\\/])([^\\/]*\.)?made\.md$/i.test(word.replace(/[,;)]+$/, ''));
const namesLedger = (word) => /(^|[^A-Za-z0-9_-])made\.md/i.test(word);

const TRACKERS = new Set(['gh', 'glab']);
const TRACKER_READS = new Map([
  ['gh', new Map([
    ['issue', new Set(['view', 'list', 'status'])],
    ['pr', new Set(['view', 'list', 'status', 'diff', 'checks'])],
  ])],
  ['glab', new Map([
    ['issue', new Set(['view', 'list', 'status'])],
    ['mr', new Set(['view', 'list', 'diff', 'checks'])],
  ])],
]);
const TRACKER_VALUE_FLAGS = new Set(['-R', '--repo', '--hostname']);
const API_LONG_VALUE_FLAGS = new Set(['--header', '--jq', '--template', '--hostname', '--preview', '--cache']);
const API_SHORT_VALUE_FLAGS = 'XfFHqtp';
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

const name = (word) => word.split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');

function withoutHeredocBodies(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let ends = [];
  for (const line of lines) {
    if (ends.length) {
      const [end, tabs] = ends[0];
      if ((tabs ? line.replace(/^\t+/, '') : line) === end) ends.shift();
      continue;
    }
    out.push(line);
    for (const m of line.matchAll(/<<(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/g)) ends.push([m[3], m[1] === '-']);
  }
  return out.join('\n');
}

function substitutions(text, ps = false) {
  const unquoted = text.replace(/'[^']*'/g, "''");
  const found = [];
  for (const m of unquoted.matchAll(/\$\(([^()]*)\)/g)) found.push(m[1]);
  if (!ps) for (const m of unquoted.matchAll(/`([^`]*)`/g)) found.push(m[1]);
  return found;
}

function segments(text, ps = false) {
  const out = [];
  let words = [];
  let word = null;
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endSegment = (by) => {
    endWord();
    if (words.length) out.push({ words, by });
    else if ((by === '|' || by === '&') && out.length && out[out.length - 1].words && out[out.length - 1].by === by) out[out.length - 1].by = by + by;
    words = [];
    if (by === '(') out.push({ open: true });
    if (by === ')') out.push({ close: true });
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      const j = text.indexOf("'", i + 1);
      const end = j < 0 ? text.length : j;
      word = (word ?? '') + text.slice(i + 1, end);
      i = end;
    } else if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < text.length && text[j] !== '"') {
        if (ps ? text[j] === '\x60' : text[j] === '\\' && '$`"\\'.includes(text[j + 1] ?? '')) j++;
        s += text[j++];
      }
      word = (word ?? '') + s;
      i = j;
    } else if (c === '$' && text[i + 1] === '{') {
      const j = text.indexOf('}', i);
      const end = j < 0 ? text.length - 1 : j;
      word = (word ?? '') + text.slice(i, end + 1);
      i = end;
    } else if (ps && c === '\x60' && i + 1 < text.length) {
      word = (word ?? '') + text[++i];
    } else if (!ps && c === '\\' && i + 1 < text.length && !/[A-Za-z0-9]/.test(text[i + 1])) {
      word = (word ?? '') + text[++i];
    } else if (/\s/.test(c) && c !== '\n' && c !== '\r') {
      endWord();
    } else if (';&|(){}\n\r`'.includes(c)) {
      if ((c === '&' || c === '|') && word !== null && /[<>]$/.test(word)) {
        word += c;
        continue;
      }
      endSegment(c);
    } else if ((c === '<' || c === '>') && word !== null && !REDIRECT.test(word) && !/^[0-9*]+$/.test(word)) {
      endWord();
      word = c;
    } else {
      word = (word ?? '') + c;
    }
  }
  endSegment(null);
  return out;
}

const isAi = (word) => AI_NAMES.has(name(word)) || AI_PACKAGES.some((p) => word.includes(p));

function aiInWords(words, depth) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || KEYWORDS.has(w)) {
      i++;
      continue;
    }
    const n = name(w);
    if (isAi(w)) return true;
    if (n === 'command' && /^-[vV]$/.test(words[i + 1] ?? '')) return false;
    if (WRAPPERS.has(n)) return words.slice(i + 1).some(isAi) || aiInWords(words.slice(i + 1).filter((x) => !x.startsWith('-')), depth);
    if (n === 'node' || n === 'bun' || n === 'deno') return words.slice(i + 1).some((x) => AI_PACKAGES.some((p) => x.includes(p)));
    if (RUNNERS.has(n) && RUNNERS.get(n).has(words[i + 1])) return words.slice(i + 2).some(isAi);
    return false;
  }
  return false;
}

function killByName(cmd) {
  const n = name(cmd[0] ?? '');
  const rest = cmd.slice(1).map((x) => x.toLowerCase());
  if (KILL_NAMES.has(n)) return n;
  if (n === 'taskkill' && rest.some((x, j) => /^(\/\/?|-)im$/.test(x) || (/^(\/\/?|-)fi$/.test(x) && /imagename/.test(rest[j + 1] ?? '')))) return 'taskkill by image name';
  if ((n === 'stop-process' || n === 'spps') && rest.some((x) => /^-(n|na|nam|name|processname)(:.*)?$/.test(x))) return 'Stop-Process -Name';
  if (n === 'kill' && rest.some((x) => /^-(na|nam|name)(:.*)?$/.test(x))) return 'Stop-Process -Name';
  if (n === 'wmic' && rest.includes('process') && rest.some((x) => /name/.test(x)) && rest.some((x) => /^(delete|terminate|call)$/.test(x))) return 'wmic by name';
  return null;
}

function listsByName(cmd) {
  const n = name(cmd[0] ?? '');
  if (n !== 'get-process' && n !== 'gps') return false;
  const args = cmd.slice(1);
  return !args.some((a) => /^-id$/i.test(a)) && (args.some((a) => /^-(n|na|nam|name|processname)$/i.test(a)) || args.some((a) => !a.startsWith('-')));
}

const STOPPERS = new Set(['stop-process', 'spps', 'kill']);

function apiRead(args) {
  let method = null;
  let input = false;
  let endpoint = null;
  const fields = [];
  const take = (flag, value) => {
    if (flag === 'X') method = value;
    else if (flag === 'f' || flag === 'F') fields.push(value ?? '');
  };
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    const long = /^(--[a-z-]+)(?:=(.*))?$/.exec(a);
    if (long) {
      const [, flag, inline] = long;
      const value = () => (inline !== undefined ? inline : args[++k]);
      if (flag === '--method') method = value();
      else if (flag === '--field' || flag === '--raw-field') fields.push(value() ?? '');
      else if (flag === '--input') {
        input = true;
        value();
      } else if (API_LONG_VALUE_FLAGS.has(flag)) value();
    } else if (/^-[A-Za-z]/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        if (API_SHORT_VALUE_FLAGS.includes(a[j])) {
          take(a[j], a.slice(j + 1) || args[++k]);
          break;
        }
      }
    } else if (endpoint === null) endpoint = a;
  }
  if (input) return false;
  if (endpoint === 'graphql') {
    const query = fields.find((f) => f.startsWith('query='));
    return query !== undefined && !query.startsWith('query=@') && !fields.some((f) => /\b(mutation|subscription)\b/i.test(f));
  }
  return fields.length === 0 && (method === null || method.toUpperCase() === 'GET');
}

function trackerCall(cmd) {
  const n = name(cmd[0] ?? '');
  if (!TRACKERS.has(n)) return null;
  const args = cmd.slice(1);
  const words = [];
  for (let k = 0; k < args.length; k++) {
    if (TRACKER_VALUE_FLAGS.has(args[k])) k++;
    else if (!args[k].startsWith('-')) words.push(args[k]);
  }
  const [sub, verb] = words;
  const read = sub === 'api' ? apiRead(args.slice(args.indexOf('api') + 1)) : TRACKER_READS.get(n).get(sub)?.has(verb) ?? false;
  return { read, what: [n, sub, sub === 'api' ? undefined : verb].filter(Boolean).join(' ') };
}

function shellBody(words, i) {
  const k = words.findIndex((x, j) => j > i && (/^-[a-z]{0,3}c[a-z]{0,3}$/.test(x) || /^(\/c|-command|-c)$/i.test(x)));
  return k > 0 ? words.slice(k + 1).filter((x, j) => !(j === 0 && x === '--')).join(' ') : null;
}

function unwrap(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (w.startsWith('-')) i += WRAPPER_VALUE_FLAGS.has(w) ? 2 : 1;
    else if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || /^[0-9.]+[smhd]?$/.test(w)) i++;
    else break;
  }
  return words.slice(i);
}

function expand(word, env) {
  let unknown = false;
  const lookup = (k) => {
    const v = env[k] ?? env[Object.keys(env).find((e) => e.toLowerCase() === k.toLowerCase()) ?? ''];
    if (v === undefined) unknown = true;
    return v ?? '';
  };
  let s = word
    .replace(/^~(?=$|[\\/])/, () => lookup('HOME') || lookup('USERPROFILE'))
    .replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/gi, (_, k) => lookup(k))
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => lookup(k))
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, k) => lookup(k))
    .replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (_, k) => lookup(k));
  if (unknown || /[$`]/.test(s)) return null;
  return s;
}

function canonical(path, drives) {
  let s = path.replace(/\\/g, '/');
  if (drives) {
    const m = /^\/([A-Za-z])(\/|$)/.exec(s) ?? /^\/cygdrive\/([A-Za-z])(\/|$)/.exec(s);
    if (m) s = m[1] + ':/' + s.slice(m[0].length);
  }
  s = s.replace(/^([A-Za-z]):(?!\/)/, '$1:/');
  const drive = /^[A-Za-z]:/.exec(s)?.[0] ?? '';
  let rest = posix.normalize(s.slice(drive.length) || '/');
  if (rest.length > 1) rest = rest.replace(/\/$/, '');
  const out = drive + rest;
  return drive || drives ? out.toLowerCase() : out;
}

function isAbsolute(p) {
  return /^([A-Za-z]:)?[\\/]/.test(p) || /^[A-Za-z]:$/.test(p);
}

function resolve(cwd, word, ctx) {
  if (SINKS.has(word.toLowerCase())) return { sink: true };
  const s = expand(word, ctx.env);
  if (s === null) return null;
  if (isAbsolute(s)) return { path: canonical(s, ctx.drives) };
  if (cwd === null) return null;
  return { path: canonical(cwd + '/' + s, ctx.drives) };
}

function inside(ctx, resolved) {
  if (resolved === null) return true;
  if (resolved.sink) return false;
  return ctx.roots.some((root) => resolved.path === root || resolved.path.startsWith(root + '/'));
}

const cwdInside = (ctx, cwd) => inside(ctx, cwd === null ? null : { path: cwd });

function positional(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const colon = PS_COLON.exec(a);
    if (colon && PS_PATH_PARAMS.test(colon[1])) out.push(colon[2]);
    else if (colon && PS_OTHER_VALUE_PARAMS.test(colon[1])) continue;
    else if (PS_PATH_PARAMS.test(a)) out.push(args[++i]);
    else if (PS_OTHER_VALUE_PARAMS.test(a)) i++;
    else if (a === '--') out.push(...args.slice(i + 1).filter(Boolean)), (i = args.length);
    else if (!a.startsWith('-')) out.push(a);
  }
  return out.filter((x) => x !== undefined);
}

function writeTargets(n, args) {
  if (WRITERS.has(n)) return positional(args);
  if (n === 'dd') return args.filter((a) => a.startsWith('of=')).map((a) => a.slice(3));
  if (n === 'tar') {
    const bundle = /^[a-zA-Z]+$/.test(args[0] ?? '') ? args[0] : '';
    const short = args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join('') + bundle;
    const value = (re) => {
      const k = args.findIndex((a) => re.test(a));
      if (k < 0) return null;
      const eq = args[k].indexOf('=');
      return eq > 0 ? args[k].slice(eq + 1) : args[k + 1];
    };
    if (/x/.test(short) || args.some((a) => /^--(extract|get)$/.test(a))) return [value(/^(-C|--directory(=.*)?)$/) ?? '.'];
    const f = value(/^(-[a-zA-Z]*f|--file(=.*)?)$/) ?? (bundle.includes('f') ? args[1] : null);
    return f && f !== '-' ? [f] : [];
  }
  if (n === 'cp' || n === 'ln') {
    const t = args.findIndex((a) => a === '-t' || a.startsWith('--target-directory'));
    if (t >= 0) return [args[t].includes('=') ? args[t].split('=')[1] : args[t + 1]];
  }
  if (n === 'copy-item' || n === 'copy' || n === 'cpi' || n === 'cp') {
    const d = args.findIndex((a) => /^-dest(ination)?$/i.test(a));
    if (d >= 0) return [args[d + 1]];
  }
  if (n === 'robocopy' || n === 'xcopy') return positional(args).filter((a) => !/^\/[A-Za-z]+(:.*)?$/.test(a)).slice(1, 2);
  return positional(args).slice(-1);
}

function dirArg(n, args) {
  if (args.includes('-')) return { to: null };
  const pos = positional(args);
  if (n === 'popd' || n === 'pop-location') return { pop: true };
  if (pos.length === 0) return n === 'pushd' || n === 'push-location' ? { pop: false, to: null } : { to: '~' };
  if (pos[0] === '-') return { to: null };
  return { to: pos[0] };
}

function gitCheck(words, cwd, ctx, assigned) {
  let i = 1;
  let dir = cwd;
  let named = assigned.some((a) => /^GIT_(DIR|WORK_TREE)=/.test(a) && inside(ctx, resolve(cwd, a.slice(a.indexOf('=') + 1), ctx)));
  let config = assigned.some((a) => /^(GIT_[A-Z_]*|PAGER|LESSOPEN|LESSCLOSE)=/.test(a) && !/^GIT_(DIR|WORK_TREE)=/.test(a));
  while (i < words.length && words[i].startsWith('-')) {
    const w = words[i];
    const pathOption = /^--(git-dir|work-tree)(=(.*))?$/.exec(w);
    if (w === '-C') {
      const r = resolve(dir, words[i + 1] ?? '', ctx);
      dir = r?.path ?? null;
      i += 2;
    } else if (pathOption) {
      const value = pathOption[2] ? pathOption[3] : words[i + 1];
      if (inside(ctx, resolve(dir, value ?? '', ctx))) named = true;
      i += pathOption[2] ? 1 : 2;
    } else if (w === '-c' || w === '--config-env' || w.startsWith('--config-env=') || w.startsWith('--exec-path')) {
      config = true;
      i += w === '-c' || w === '--config-env' ? 2 : 1;
    } else i++;
  }
  const sub = words[i];
  const args = words.slice(i + 1);
  for (let k = 0; k < args.length; k++) {
    const o = /^--output(=(.*))?$/.exec(args[k]);
    if (!o) continue;
    const target = o[1] ? o[2] : args[k + 1];
    const res = resolve(dir, target ?? '', ctx);
    if (res === null) return refusal('unknown', target ?? '--output');
    if (inside(ctx, res)) return refusal('repo-write', 'git ' + sub + ' --output');
  }
  const pager = args.some((a) => /^(-O.*|--open-files-in-pager.*)$/.test(a));
  const read = sub === undefined || sub === '--version' || sub === '--help' ||
    (!pager && (GIT_READS.has(sub) || (GIT_READ_FORMS.has(sub) && GIT_READ_FORMS.get(sub)(args))));
  const isInside = named || cwdInside(ctx, dir);
  if (isInside && config) return refusal('repo-run', 'git with configuration set in the command');
  if (isInside && pager) return refusal('repo-run', 'git ' + sub + ' -O');
  if (read) return null;
  return nonReadRefusal(words, dir, ctx, isInside, 'git ' + sub);
}

function readerCheck(n, args) {
  if (!READERS.has(n)) return false;
  const bad = READER_WRITE_FLAGS.get(n);
  if (bad && args.some((a) => bad.test(a))) return false;
  if ((n === 'uniq' || n === 'xxd') && positional(args).length > 1) return false;
  if (n === 'hostname' && positional(args).length > 0) return false;
  if (n === 'sed') {
    const e = args.flatMap((a, k) => (a === '-e' || a === '--expression' ? [args[k + 1]] : a.startsWith('--expression=') ? [a.slice(13)] : []));
    const scripts = e.length ? e : positional(args).slice(0, 1);
    if (args.some((a) => a === '-f' || a.startsWith('--file')) || !scripts.every((s) => s !== undefined && SED_PRINT.test(s))) return false;
  }
  return true;
}

const refusal = (rule, detail) => ({ rule, detail });

function splitRedirects(all) {
  const redirects = [];
  const operators = [];
  const words = [];
  for (let j = 0; j < all.length; j++) {
    const w = all[j];
    const m = REDIRECT.exec(w);
    if (m) {
      if (/[&]$/.test(m[0]) && w.slice(m[0].length) === '' && /^[0-9-]+$/.test(all[j + 1] ?? '')) {
        j++;
        continue;
      }
      if (/[&]$/.test(m[0]) && /^[0-9-]+$/.test(w.slice(m[0].length))) continue;
      if (/^[0-9*]*</.test(m[0])) {
        if (w.slice(m[0].length) === '') j++;
        continue;
      }
      const target = w.slice(m[0].length) || all[++j];
      if (target !== undefined) {
        redirects.push(target);
        operators.push(m[0]);
      }
    } else words.push(w);
  }
  return { redirects, operators, words };
}

const PATH_START = /(?<![\w.~$%\\/-])(?:[A-Za-z]:)?[\\/]/g;
const PATH_END = /^($|[\/\s'"\x60,;)\]}|<>])/;
const PATH_SHAPED = /^(\$(\{?[A-Za-z_]|env:|\(|$)|~|%[A-Za-z_]|[A-Za-z]:|[\\/])/i;

function argumentPaths(word) {
  const out = [word];
  const eq = /^(-{1,2}[A-Za-z0-9][\w-]*|[A-Za-z_]\w*)=(.*)$/.exec(word);
  if (eq) out.push(eq[2]);
  const colon = PS_COLON.exec(word);
  if (colon) out.push(colon[2]);
  const bundle = /^-[A-Za-z]+/.exec(word);
  if (bundle) for (let k = 2; k <= bundle[0].length; k++) out.push(word.slice(k));
  return [...new Set(out)].filter((p) => p !== '');
}

function embedsRoot(word, ctx) {
  for (const m of word.matchAll(PATH_START)) {
    const tail = canonical(word.slice(m.index), ctx.drives);
    if (ctx.roots.some((root) => tail.startsWith(root) && PATH_END.test(tail.slice(root.length)))) return true;
  }
  return false;
}

function argumentRefusal(words, cwd, ctx) {
  for (const a of words) {
    for (const p of argumentPaths(a)) {
      const res = resolve(cwd, p, ctx);
      if (res === null) {
        if (PATH_SHAPED.test(p)) return refusal('unknown', p);
      } else if (inside(ctx, res)) return refusal('repo-arg', { what: words[0], arg: a });
    }
    if (embedsRoot(a, ctx)) return refusal('repo-arg', { what: words[0], arg: a });
  }
  return null;
}

function nonReadRefusal(words, cwd, ctx, isInside = cwdInside(ctx, cwd), detail = words.join(' ')) {
  return isInside ? refusal('repo-run', detail) : argumentRefusal(words, cwd, ctx);
}

function targetRefusal(targets, cwd, ctx, label) {
  for (const t of targets) {
    const res = resolve(cwd, t, ctx);
    if (res === null) return refusal('unknown', t);
    if (inside(ctx, res)) return refusal('repo-write', label(t));
  }
  return null;
}

function setVariable(ctx, key, value) {
  ctx.env = { ...ctx.env, [key]: value === undefined ? undefined : expand(value, ctx.env) ?? undefined };
}

function variableAssignment(cmd) {
  const m = /^\$(env:)?([A-Za-z_][A-Za-z0-9_]*)(=(.*))?$/i.exec(cmd[0] ?? '');
  if (!m) return null;
  if (m[3] !== undefined) return { key: m[2], value: cmd.length === 1 ? m[4] : undefined };
  if (cmd[1] === '=') return { key: m[2], value: cmd.length === 3 ? cmd[2] : undefined };
  return null;
}

const stopsOnError = (args) => args.some((a, k) => /^-(erroraction|ea)(:stop)?$/i.test(a) && (/:stop$/i.test(a) || /^stop$/i.test(args[k + 1] ?? '')));

function moveTo(n, args, state, ctx) {
  const d = dirArg(n, args);
  const old = state.cwd;
  let next;
  if (d.pop) next = state.stack.length ? state.stack.pop() : null;
  else {
    if (n === 'pushd' || n === 'push-location') state.stack.push(old);
    next = d.to === null ? null : resolve(old, d.to, ctx)?.path ?? null;
  }
  if (state.by === '|') return;
  const trusted = state.by === '&&' || state.by === null || (state.ps && stopsOnError(args) && state.by !== '||');
  if (trusted) {
    if (state.by === '&&' && state.fallback === undefined) state.fallback = old;
    state.cwd = next;
  } else state.cwd = old !== null && cwdInside(ctx, old) ? old : next;
}

function appends(n, args) {
  if (n === 'add-content' || n === 'ac') return true;
  if (n === 'tee') return args.some((a) => /^(-[a-zA-Z]*a[a-zA-Z]*|--append)$/.test(a));
  if (n === 'out-file' || n === 'tee-object') return args.some((a) => /^-append(:\$true)?$/i.test(a));
  return false;
}

function inlineCode(args) {
  const out = [];
  for (let k = 0; k < args.length; k++) {
    const eq = /^--(eval|print)=(.*)$/.exec(args[k]);
    if (eq) out.push(eq[2]);
    else if (INLINE_FLAG.test(args[k]) && args[k + 1] !== undefined) out.push(args[++k]);
  }
  return out;
}

function sortOutput(args) {
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === '-o' || a === '--output') return args[k + 1];
    const m = /^(-o|--output=)(.+)$/.exec(a);
    if (m) return m[2];
  }
  return undefined;
}

function ledgerRewrite(cmd, redirects, operators) {
  const k = redirects.findIndex((t, j) => ledgerPath(t) && !/>>$/.test(operators[j]));
  if (k >= 0) return refusal('ledger', 'a redirection with ' + operators[k].replace(/^[0-9*&]*/, '') + ' to ' + redirects[k]);
  if (cmd.length === 0 || variableAssignment(cmd)) return null;
  const n = name(cmd[0]);
  const args = cmd.slice(1);
  const hit = (targets) => targets.find((t) => t !== undefined && ledgerPath(t))?.replace(/[,;)]+$/, '');
  const first = hit([cmd[0]]);
  if (first) return refusal('ledger', 'a call that takes ' + first + ' as its argument');
  if ((WRITERS.has(n) && !appends(n, args)) || COPIERS.has(n)) {
    const t = hit(writeTargets(n, args));
    if (t) return refusal('ledger', cmd[0] + ' on ' + t);
  }
  if (n === 'sed' && args.some((a) => READER_WRITE_FLAGS.get('sed').test(a))) {
    const t = hit(positional(args));
    if (t) return refusal('ledger', 'sed -i on ' + t);
  }
  if (n === 'sort') {
    const t = hit([sortOutput(args)]);
    if (t) return refusal('ledger', 'sort -o on ' + t);
  }
  if (IN_PLACE.has(n) && args.some((a) => /^-[a-zA-Z]*i/.test(a))) {
    const t = hit(positional(args));
    if (t) return refusal('ledger', cmd[0] + ' -i on ' + t);
  }
  if (INTERPRETERS.has(n) && inlineCode(args).some(namesLedger)) return refusal('ledger', cmd[0] + ' with inline code that names a ledger');
  return null;
}

function inspectWords(all, state, ctx, depth) {
  const { redirects, operators, words } = splitRedirects(all);

  let i = 0;
  const assigned = [];
  while (i < words.length && (ASSIGNMENT.test(words[i]) || KEYWORDS.has(words[i]))) {
    if (!KEYWORDS.has(words[i])) assigned.push(words[i]);
    i++;
  }
  const cmd = words.slice(i);

  if (ctx.rules.has('model') && aiInWords(words, depth)) {
    const cli = words.find(isAi) ?? 'an AI CLI';
    return refusal('model', name(cli));
  }
  const tracker = trackerCall(cmd);
  if (ctx.rules.has('tracker') && tracker && !tracker.read) return refusal('tracker', tracker.what);
  if (ctx.rules.has('kill')) {
    const k = killByName(cmd) ?? (state.pipedFromNamed && STOPPERS.has(name(cmd[0] ?? '')) ? 'Get-Process by name piped to Stop-Process' : null);
    if (k) return refusal('kill', k);
  }
  if (ctx.rules.has('ledger')) {
    const found = ledgerRewrite(cmd, redirects, operators);
    if (found) return found;
  }

  const repo = ctx.rules.has('repo') && ctx.roots.length > 0;
  const redirectRefusal = () => (repo ? targetRefusal(redirects, state.cwd, ctx, (t) => 'a redirection to ' + t) : null);
  const n = cmd.length ? name(cmd[0]) : '';

  if (cmd.length && (SHELLS.has(n) || STRING_RUNNERS.has(n))) {
    const body = SHELLS.has(n) ? shellBody(cmd, 0) : cmd.slice(1).join(' ');
    if (body !== null) {
      const ps = SHELLS.has(n) ? ['pwsh', 'powershell', 'cmd'].includes(n) : state.ps;
      return inspect(body, { cwd: state.cwd, stack: [], ps }, ctx, depth + 1) ?? redirectRefusal();
    }
    return (repo ? nonReadRefusal(cmd, state.cwd, ctx) : null) ?? redirectRefusal();
  }
  if (cmd.length && (WRAPPERS.has(n) || (RUNNERS.has(n) && RUNNERS.get(n).has(cmd[1])))) {
    const rest = cmd.slice(RUNNERS.has(n) && !WRAPPERS.has(n) ? 2 : 1);
    const inner = unwrap(rest);
    if (n === 'command' && /^-[vV]$/.test(cmd[1] ?? '')) return null;
    if (repo && !cwdInside(ctx, state.cwd)) {
      const found = argumentRefusal([cmd[0], ...rest.slice(0, rest.length - inner.length)], state.cwd, ctx);
      if (found) return found;
    }
    if (inner.length) return inspectWords([...inner, ...redirects.map((r, j) => operators[j] + r)], state, ctx, depth);
  }

  if (!repo) return null;

  const r = redirectRefusal();
  if (r) return r;

  if (cmd.length === 0) {
    for (const a of assigned) setVariable(ctx, a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1));
    return null;
  }
  const args = cmd.slice(1);
  const variable = variableAssignment(cmd);
  if (variable) {
    setVariable(ctx, variable.key, variable.value);
    return null;
  }
  if (ASSIGNERS.has(n)) {
    for (const a of args) if (ASSIGNMENT.test(a)) setVariable(ctx, a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1));
    return null;
  }
  if (n === 'for' || n === 'read') {
    for (const a of n === 'for' ? args.slice(0, 1) : args.filter((x) => !x.startsWith('-'))) if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(a)) setVariable(ctx, a, undefined);
    return null;
  }
  if (CD.has(n)) {
    moveTo(n, args, state, ctx);
    return null;
  }

  if (WRITERS.has(n) || COPIERS.has(n)) {
    const targets = writeTargets(n, args);
    if (targets.length === 0 && n !== 'tar' && n !== 'dd') return refusal('unknown', cmd[0] + ' with no path written in the command');
    return targetRefusal(targets, state.cwd, ctx, (t) => cmd[0] + ' on ' + t);
  }
  if (n === 'sed' && args.some((a) => READER_WRITE_FLAGS.get('sed').test(a))) {
    const pos = positional(args);
    const found = targetRefusal(args.some((a) => a === '-e' || a === '-f') ? pos : pos.slice(1), state.cwd, ctx, (t) => 'sed -i on ' + t);
    if (found) return found;
  }
  if (n === 'find' && args.some((a) => READER_WRITE_FLAGS.get('find').test(a))) {
    const k = args.findIndex((a) => /^[-(!]/.test(a));
    const found = targetRefusal(args.slice(0, k < 0 ? args.length : k), state.cwd, ctx, (t) => 'find on ' + t);
    if (found) return found;
  }
  if (n === 'git') return gitCheck(cmd, state.cwd, ctx, assigned);

  if (readerCheck(n, args) || tracker?.read) return null;
  return nonReadRefusal(cmd, state.cwd, ctx);
}

function inspect(command, state, ctx, depth) {
  if (depth > 8) return refusal('depth', 'nested too deep');
  const text = withoutHeredocBodies(command);
  for (const s of substitutions(text, state.ps)) {
    const found = inspect(s, { cwd: state.cwd, stack: [], ps: state.ps }, ctx, depth + 1);
    if (found) return found;
  }
  const saved = [];
  let prev = null;
  let named = false;
  for (const seg of segments(text, state.ps)) {
    if (seg.open) {
      saved.push({ cwd: state.cwd, fallback: state.fallback });
      state.fallback = undefined;
      continue;
    }
    if (seg.close) {
      if (saved.length) ({ cwd: state.cwd, fallback: state.fallback } = saved.pop());
      continue;
    }
    named = prev !== null && prev.by === '|' && (named || listsByName(unwrap(prev.words)));
    state.pipedFromNamed = named;
    state.by = seg.by;
    const found = inspectWords(seg.words, state, ctx, depth);
    if (found) return found;
    if (seg.by !== '&&' && seg.by !== '|' && state.fallback !== undefined) {
      if (state.fallback === null || cwdInside(ctx, state.fallback)) state.cwd = state.fallback;
      state.fallback = undefined;
    }
    prev = seg;
  }
  return null;
}

const ruleOnly = (rule, command) =>
  typeof command === 'string'
    ? inspect(command, { cwd: null, stack: [], ps: false }, { rules: new Set([rule]), roots: [], env: {}, drives: false }, 0)
    : null;

export function startsAiCli(command) {
  return ruleOnly('model', command) !== null;
}

export function killsByImageName(command) {
  const found = ruleOnly('kill', command);
  return found === null ? null : found.detail;
}

const REAL_FS = {
  exists: existsSync,
  read: (p) => {
    try {
      return readFileSync(p, 'utf8');
    } catch {
      return null;
    }
  },
  list: (p) => {
    try {
      return readdirSync(p);
    } catch {
      return [];
    }
  },
};

export function findRoot(dir, exists = existsSync) {
  if (typeof dir !== 'string' || dir === '') return null;
  let d = dir.replace(/\\/g, '/').replace(/\/+$/, '');
  for (;;) {
    if (exists(d + '/.git')) return d;
    const up = d.replace(/\/[^/]*$/, '');
    if (up === d || up === '' || /^[A-Za-z]:$/.test(d)) return null;
    d = up;
  }
}

function protectedRoots(rootDir, fs, drives) {
  const join = (base, rel) => (isAbsolute(rel) ? rel : base + '/' + rel);
  let gitDir = rootDir + '/.git';
  const pointer = /^gitdir:\s*(.+)$/m.exec(fs.read(gitDir) ?? '');
  if (pointer) gitDir = join(rootDir, pointer[1].trim());
  const common = fs.read(gitDir + '/commondir');
  const commonDir = common ? join(gitDir, common.trim()) : gitDir;
  const commonPath = canonical(commonDir, drives);
  const main = commonPath.endsWith('/.git') ? commonPath.slice(0, -5) : canonical(rootDir, drives);
  const roots = [canonical(rootDir, drives), main, main + '.worktrees'];
  for (const w of fs.list(commonDir + '/worktrees')) {
    const g = fs.read(commonDir + '/worktrees/' + w + '/gitdir');
    if (g) roots.push(canonical(g.trim().replace(/[\\/]\.git$/, ''), drives));
  }
  return [...new Set(roots)];
}

export const ALL_RULES = ['repo', 'model', 'kill', 'tracker', 'ledger'];

export const WORKER_RULES = ['kill', 'ledger'];

function message(who, found, root) {
  const by = who + ': ';
  switch (found.rule) {
    case 'model':
      return by + 'a review starts no model run, so this command, which starts ' + found.detail + ', is refused (#131, #143). ' +
        'Report the finding unproven instead, with what would show it: how many runs, on which model, and their estimated cost. ' +
        "Whether to spend them is the person's, at check-it's question.";
    case 'kill':
      return by + 'this command kills processes by image name (' + found.detail + "), and a process found by name may be the person's, so it is refused (#144). " +
        "Kill only a process whose command line holds the run folder's path, by its id, as clean-it/RULES.md Processes says.";
    case 'tracker':
      return by + '\x60' + found.detail + '\x60 is not a tracker read, and a review only reads a tracker, so it is refused (#146). ' +
        'Read with view, list, status, diff or checks, gh api or glab api with GET and no fields, or a GraphQL query, and write in your report what the command would have done.';
    case 'ledger':
      return by + 'the run ledger is shared by every agent of the run and only appended to, and ' + found.detail + ' would rewrite it, dropping lines others appended meanwhile, so it is refused (#138). ' +
        'Add a new line with >> (Add-Content in PowerShell): a deletion is a new line naming the path, \x60<path> | deleted, <size>\x60, never an edit of an existing line, as clean-it/RULES.md The ledger says.';
    case 'repo-run':
      return by + '\x60' + found.detail + '\x60 would run inside the reviewed repository (' + root + '), where only read commands run, so it is refused (#143). ' +
        'Run it in your copy, in your own folder in the run folder, with cd to the copy in the same command.';
    case 'repo-arg':
      return by + '\x60' + found.detail.what + '\x60 is not a read, and its argument ' + found.detail.arg + ' names a path inside the reviewed repository (' + root + '), so it is refused (#147). ' +
        'Point it at your copy instead.';
    case 'repo-write':
      return by + 'this command writes inside the reviewed repository (' + root + ') through ' + found.detail + ', so it is refused (#143). Write only in your copy.';
    case 'unknown':
      return by + 'whether ' + found.detail + ' is inside the reviewed repository (' + root + ') cannot be told from the command, so it is refused (#143). Write the path literally.';
    default:
      return by + 'the command is nested too deep to read, so it is refused.';
  }
}

export function decide(stdin, { rules = ALL_RULES, who = 'check-it-reviewer', env = {}, fs = REAL_FS } = {}) {
  let input;
  try {
    input = JSON.parse(stdin);
  } catch {
    return { code: 2, message: who + ': the hook could not read its input, so the call is refused' };
  }
  const set = new Set(rules);
  if (FILE_TOOLS.has(input?.tool_name)) {
    const path = input?.tool_input?.file_path;
    if (!set.has('ledger')) return { code: 0 };
    if (typeof path !== 'string' || path === '') return { code: 2, message: who + ': the call carries no file path to read, so it is refused' };
    return ledgerPath(path) ? { code: 2, message: message(who, refusal('ledger', 'this ' + input.tool_name + ' on ' + path)) } : { code: 0 };
  }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string') return { code: 2, message: who + ': the call carries no command to read, so it is refused' };
  const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : null;
  if (set.has('repo') && cwd === null) return { code: 2, message: who + ': the call carries no working directory, so whether it runs inside the reviewed repository cannot be told, and it is refused' };
  const rootDir = set.has('repo') ? findRoot(env.CLAUDE_PROJECT_DIR || cwd, fs.exists) : null;
  const drives = /^[A-Za-z]:/.test(rootDir ?? cwd ?? '');
  const roots = rootDir === null ? [] : protectedRoots(rootDir, fs, drives);
  const ctx = { rules: set, roots, env, drives };
  const ps = input.tool_name === 'PowerShell';
  const found = inspect(command, { cwd: cwd === null ? null : canonical(cwd, drives), stack: [], ps }, ctx, 0);
  return found ? { code: 2, message: message(who, found, rootDir) } : { code: 0 };
}
