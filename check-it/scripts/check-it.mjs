#!/usr/bin/env node
// It runs main() unconditionally: it is reached through the ~/.claude/skills
// link, where argv[1] and import.meta.url name different paths.

import { closeSync, lstatSync, openSync, readFileSync, readSync, readlinkSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { CheckItError, SKILLS, run } from './assemble.mjs';

function hash(path) {
  const st = lstatSync(path, { throwIfNoEntry: false });
  const h = createHash('sha256');
  if (st?.isSymbolicLink()) return h.update('link\0').update(readlinkSync(path)).digest('hex');
  if (!st?.isFile()) return null;
  h.update('file\0');
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    let n;
    while ((n = readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return h.digest('hex');
}

const realDeps = {
  cwd: process.cwd(),
  skills: SKILLS,
  readFile: (path) => readFileSync(path, 'utf8'),
  isDir: (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false,
  isFile: (path) => statSync(path, { throwIfNoEntry: false })?.isFile() ?? false,
  exists: (path) => lstatSync(path, { throwIfNoEntry: false }) !== undefined,
  hash,
  writeFile: (path, text) => writeFileSync(path, text, { flag: 'wx' }),
  git: (dir, args) => {
    try {
      return execFileSync('git', args, {
        cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, maxBuffer: 64 * 1024 * 1024,
      });
    } catch (err) {
      const said = (err.stderr || err.message || '').toString().trim();
      throw new CheckItError(`git ${args.join(' ')} failed in ${dir}: ${said}`);
    }
  },
};

function main() {
  let out;
  try {
    out = run(process.argv.slice(2), realDeps);
  } catch (err) {
    if (!(err instanceof CheckItError)) throw err;
    process.stderr.write(`check-it: ${err.message}\n`);
    process.exit(1);
  }
  process.stdout.write(out);
}

main();
