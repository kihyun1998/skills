#!/usr/bin/env node
// It runs main() unconditionally: it is reached through the ~/.claude/skills
// link, where argv[1] and import.meta.url name different paths.

import { accessSync, chmodSync, constants, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SetupError, run } from './setup.mjs';

const git = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  if (r.error) throw new SetupError(`git could not start: ${r.error.message}`);
  return { status: r.status, stdout: r.stdout };
};

function main() {
  const top = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) {
    process.stderr.write('grill-the-graph: run it inside the repository being set up\n');
    process.exit(1);
  }
  const deps = {
    top: resolve(top.stdout.trim()),
    home: homedir(),
    platform: process.platform,
    skillDir: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    readFile: (path) => {
      try {
        return readFileSync(path, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    writeFile: (path, text, mode) => {
      mkdirSync(dirname(path), { recursive: true });
      const kept = statSync(path, { throwIfNoEntry: false });
      const temp = `${path}.${process.pid}.tmp`;
      writeFileSync(temp, text, { flag: 'wx', mode: 0o600 });
      chmodSync(temp, mode ?? (kept ? kept.mode & 0o777 : 0o644));
      renameSync(temp, path);
    },
    isExecutable: (path) => {
      try {
        accessSync(path, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    },
    git: (args) => git(resolve(top.stdout.trim()), args),
    // On Windows an npm install of Claude Code is `claude.cmd`, which only a shell starts.
    claudeVersion: () => execFileSync('claude', ['--version'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: process.platform === 'win32',
    }),
  };
  let result;
  try {
    result = run(process.argv.slice(2), deps);
  } catch (err) {
    if (!(err instanceof SetupError)) throw err;
    process.stderr.write(`grill-the-graph: ${err.message}\n`);
    process.exit(1);
  }
  process.stdout.write(result.out);
  process.exit(result.code);
}

main();
