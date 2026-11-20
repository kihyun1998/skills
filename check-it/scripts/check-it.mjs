#!/usr/bin/env node
// It runs main() unconditionally: it is reached through the ~/.claude/skills
// link, where argv[1] and import.meta.url name different paths.

import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CheckItError, SKILLS, run } from './assemble.mjs';

const realDeps = {
  cwd: process.cwd(),
  skills: SKILLS,
  readFile: (path) => readFileSync(path, 'utf8'),
  isDir: (path) => statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false,
  isFile: (path) => statSync(path, { throwIfNoEntry: false })?.isFile() ?? false,
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
