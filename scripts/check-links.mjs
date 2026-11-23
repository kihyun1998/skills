#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const blank = (s) => s.replace(/[^\n]/g, ' ');

export const isChecked = (path) => path.endsWith('.md') && !path.startsWith('retired/');

function closingRun(text, from, length) {
  const paragraphEnd = text.slice(from).search(/\n[ \t]*(?:\n|(?:[-*+]|\d{1,9}[.)])[ \t]|#{1,6}[ \t]|>)/);
  const limit = paragraphEnd < 0 ? text.length : from + paragraphEnd;
  for (let j = from; j < limit;) {
    if (text[j] !== '`') { j++; continue; }
    let run = 1;
    while (text[j + run] === '`') run++;
    if (run === length) return j;
    j += run;
  }
  return -1;
}

function blankInlineCode(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && /[!-/:-@[-`{-~]/.test(text[i + 1] ?? '')) {
      out += text.slice(i, i + 2);
      i += 2;
    } else if (text[i] === '`') {
      let run = 1;
      while (text[i + run] === '`') run++;
      const close = closingRun(text, i + run, run);
      const end = close < 0 ? i + run : close + run;
      out += close < 0 ? text.slice(i, end) : blank(text.slice(i, end));
      i = end;
    } else {
      out += text[i++];
    }
  }
  return out;
}

function stripCode(text) {
  return blankInlineCode(text
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[`~]*[ \t]*$|(?![\s\S]))/gm, blank)
    .replace(/<!--[\s\S]*?-->/g, blank));
}

function targets(text) {
  const found = [];
  const lineAt = (index) => text.slice(0, index).split('\n').length;
  for (const m of text.matchAll(/\]\(\s*(?:<([^>\n]+)>|((?:[^\s()]|\([^\s()]*\))+))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g)) {
    found.push({ line: lineAt(m.index), target: m[1] ?? m[2] });
  }
  for (const m of text.matchAll(/^ {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*(?:<([^>\n]+)>|(\S+))/gm)) {
    found.push({ line: lineAt(m.index), target: m[1] ?? m[2] });
  }
  return found.sort((a, b) => a.line - b.line);
}

function decoded(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function resolveTarget(file, target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('//')) return null;
  let path = target.split('#')[0].split('?')[0];
  if (path === '') return null;
  path = decoded(path);
  const joined = path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(file), path);
  return posix.normalize(joined).replace(/\/$/, '') || '.';
}

export function brokenLinks(files, tracked) {
  const known = new Set();
  for (const path of tracked) {
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) known.add(parts.slice(0, i).join('/'));
  }
  const broken = [];
  for (const { path: file, text } of files) {
    if (!isChecked(file)) continue;
    for (const { line, target } of targets(stripCode(text.replace(/\r\n?/g, '\n')))) {
      const resolved = resolveTarget(file, target);
      if (resolved === null || resolved === '.' || known.has(resolved)) continue;
      broken.push({ file, line, target, resolved });
    }
  }
  return broken;
}

function isFileOnDisk(path) {
  try {
    return !lstatSync(path).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\0').filter(Boolean);

function main() {
  const symlinks = new Set(git('ls-files', '--stage', '-z')
    .filter((entry) => entry.startsWith('120000 '))
    .map((entry) => entry.slice(entry.indexOf('\t') + 1)));
  const tracked = git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    .filter(isFileOnDisk);
  const files = tracked
    .filter((path) => isChecked(path) && !symlinks.has(path) && !lstatSync(path).isSymbolicLink())
    .map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  const broken = brokenLinks(files, tracked);
  for (const b of broken) console.log(`${b.file}:${b.line}: ${b.target} does not resolve (${b.resolved})`);
  if (broken.length > 0) {
    console.log(`\n${broken.length} broken. A retired skill lives under retired/<name>/: point the link there. A document that is gone: keep its name as text and drop the link.`);
    process.exit(1);
  }
  console.log(`Every relative link in ${files.length} markdown file${files.length === 1 ? '' : 's'} resolves.`);
}

if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) main();
