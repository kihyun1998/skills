#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PACKAGE = '@anthropic-ai/claude-code';

const WRAPPERS = new Set([
  'env', 'exec', 'command', 'builtin', 'nohup', 'sudo', 'doas', 'time', 'nice', 'ionice', 'stdbuf',
  'timeout', 'xargs', 'npx', 'bunx', 'pnpx', 'call', 'start', 'start-process', 'saps',
]);
const RUNNERS = new Map([
  ['pnpm', new Set(['dlx', 'exec'])],
  ['yarn', new Set(['dlx', 'exec'])],
  ['npm', new Set(['exec', 'x'])],
  ['bun', new Set(['x'])],
]);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd']);
const STRING_RUNNERS = new Set(['eval', 'iex', 'invoke-expression']);

const KEYWORDS = new Set(['!', 'if', 'then', 'else', 'elif', 'while', 'until', 'do', 'time']);
const REDIRECT = /^[0-9]*(>>?|<<?<?|&>>?|>&|<&)/;

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

function substitutions(text) {
  const unquoted = text.replace(/'[^']*'/g, "''");
  const found = [];
  for (const m of unquoted.matchAll(/\$\(([^()]*)\)/g)) found.push(m[1]);
  for (const m of unquoted.matchAll(/`([^`]*)`/g)) found.push(m[1]);
  return found;
}

function segments(text) {
  const out = [];
  let words = [];
  let word = null;
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endSegment = () => {
    endWord();
    if (words.length) out.push(words);
    words = [];
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
        if (text[j] === '\\' && '$`"\\'.includes(text[j + 1] ?? '')) j++;
        s += text[j++];
      }
      word = (word ?? '') + s;
      i = j;
    } else if (c === '\\' && i + 1 < text.length && !/[A-Za-z0-9]/.test(text[i + 1])) {
      word = (word ?? '') + text[++i];
    } else if (/\s/.test(c) && c !== '\n' && c !== '\r') {
      endWord();
    } else if (';&|(){}\n\r`'.includes(c)) {
      if (c === '&' && word !== null && /[<>]$/.test(word)) {
        word += c;
        continue;
      }
      endSegment();
    } else if ((c === '<' || c === '>') && word !== null && !REDIRECT.test(word) && !/^[0-9]+$/.test(word)) {
      endWord();
      word = c;
    } else {
      word = (word ?? '') + c;
    }
  }
  endSegment();
  return out;
}

const isClaude = (word) => ['claude', 'claude-code'].includes(name(word)) || word.includes(PACKAGE);

function runsInSegment(all, depth) {
  const words = all.filter((w, j) => !REDIRECT.test(w) && !(j > 0 && REDIRECT.test(all[j - 1]) && /^[0-9]*(>>?|<<?|&>>?)$/.test(all[j - 1])));
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || KEYWORDS.has(w)) {
      i++;
      continue;
    }
    const n = name(w);
    if (isClaude(w)) return true;
    if (n === 'command' && /^-[vV]$/.test(words[i + 1] ?? '')) return false;
    if (WRAPPERS.has(n)) return words.slice(i + 1).some(isClaude) || runsInSegment(words.slice(i + 1).filter((x) => !x.startsWith('-')), depth);
    if (n === 'node' || n === 'bun' || n === 'deno') return words.slice(i + 1).some((x) => x.includes(PACKAGE));
    if (RUNNERS.has(n) && RUNNERS.get(n).has(words[i + 1])) return words.slice(i + 2).some(isClaude);
    if (SHELLS.has(n)) {
      const k = words.findIndex((x, j) => j > i && (/^-[a-z]{0,3}c[a-z]{0,3}$/.test(x) || /^(\/c|-command)$/i.test(x)));
      return k > 0 && runsClaude(words.slice(k + 1).filter((x, j) => !(j === 0 && x === '--')).join(' '), depth + 1);
    }
    if (STRING_RUNNERS.has(n)) return runsClaude(words.slice(i + 1).join(' '), depth + 1);
    return false;
  }
  return false;
}

export function runsClaude(command, depth = 0) {
  if (typeof command !== 'string') return false;
  if (depth > 8) return true;
  const text = withoutHeredocBodies(command);
  if (substitutions(text).some((s) => runsClaude(s, depth + 1))) return true;
  return segments(text).some((words) => runsInSegment(words, depth));
}

export const REFUSAL =
  'check-it-reviewer: a review starts no model run, so this command, which runs claude, is refused (#131). ' +
  'Report the finding unproven instead, with what would show it: how many runs, on which model, and their estimated cost. ' +
  "Whether to spend them is the person's, at check-it's question.";

export function decide(stdin) {
  let input;
  try {
    input = JSON.parse(stdin);
  } catch {
    return { code: 2, message: 'check-it-reviewer: the hook could not read its input, so the call is refused' };
  }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string') return { code: 2, message: 'check-it-reviewer: the call carries no command to read, so it is refused' };
  return runsClaude(command) ? { code: 2, message: REFUSAL } : { code: 0 };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const { code, message } = decide(readFileSync(0, 'utf8'));
  if (message) process.stderr.write(`${message}\n`);
  process.exit(code);
}
