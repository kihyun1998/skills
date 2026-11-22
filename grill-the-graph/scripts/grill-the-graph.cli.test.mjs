import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOOK_TEXT } from './setup.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const skill = dirname(here);
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'grill-the-graph-cli-')));
const home = join(scratch, 'home');
mkdirSync(join(home, '.claude', 'skills'), { recursive: true });
const installed = join(home, '.claude', 'skills', 'grill-the-graph');
symlinkSync(skill, installed, 'junction');
mkdirSync(join(home, '.config', 'git'), { recursive: true });
writeFileSync(join(home, '.config', 'git', 'ignore'), '**/.claude/settings.local.json\n');
after(() => {
  unlinkSync(installed);
  rmSync(scratch, { recursive: true, force: true });
});

function fakeClaude(version) {
  const bin = mkdtempSync(join(scratch, 'bin-'));
  if (process.platform === 'win32') writeFileSync(join(bin, 'claude.cmd'), `@echo ${version}\r\n`);
  else writeFileSync(join(bin, 'claude'), `#!/bin/sh\necho '${version}'\n`, { mode: 0o755 });
  return bin;
}

const envWith = (bin) => ({
  ...process.env,
  XDG_CONFIG_HOME: join(home, '.config'),
  HOME: home,
  USERPROFILE: home,
  PATH: [bin, dirname(process.execPath), process.env.PATH].join(delimiter),
});

const git = (cwd, ...args) => {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
    cwd, encoding: 'utf8', windowsHide: true, env: envWith(fakeClaude('2.1.330 (Claude Code)')),
  });
  return r;
};

function repo(name) {
  const dir = join(scratch, name);
  mkdirSync(dir);
  assert.equal(git(dir, 'init', '-q').status, 0);
  writeFileSync(join(dir, 'README.md'), 'x\n');
  git(dir, 'add', '.');
  assert.equal(git(dir, 'commit', '-q', '-m', 'base').status, 0);
  return dir;
}

const cli = (cwd, args, version = '2.1.330 (Claude Code)') =>
  spawnSync(process.execPath, [join(installed, 'scripts', 'grill-the-graph.mjs'), ...args], {
    cwd, encoding: 'utf8', windowsHide: true, env: envWith(fakeClaude(version)),
  });

test('install through the skills link writes the settings and a pre-push that blocks a claude/ branch', () => {
  const dir = repo('contributor');
  const remote = join(scratch, 'remote.git');
  assert.equal(git(scratch, 'init', '-q', '--bare', remote).status, 0);
  git(dir, 'remote', 'add', 'origin', remote);
  assert.equal(git(dir, 'push', '-q', 'origin', 'HEAD:refs/heads/main').status, 0);
  assert.equal(git(dir, 'fetch', '-q', 'origin').status, 0);
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.local.json'), '{"permissions":{"allow":["Bash(ls)"]}}\n', { mode: 0o600 });

  const preview = cli(dir, ['install', '--preview']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /^Preview: nothing written\./);
  assert.equal(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'), '{"permissions":{"allow":["Bash(ls)"]}}\n');

  const done = cli(dir, ['install']);
  assert.equal(done.status, 0, done.stderr);
  const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'));
  assert.deepEqual(settings.permissions, { allow: ['Bash(ls)'] });
  const script = `${home.replace(/\\/g, '/')}/.claude/skills/grill-the-graph/scripts/no-attribution.mjs`;
  assert.deepEqual(settings.hooks.PreToolUse[1].hooks[0].args, [script]);
  assert.equal(readFileSync(join(dir, '.git', 'hooks', 'pre-push'), 'utf8'), HOOK_TEXT);
  if (process.platform !== 'win32') {
    assert.equal(statSync(join(dir, '.git', 'hooks', 'pre-push')).mode & 0o111, 0o111);
    assert.equal(statSync(join(dir, '.claude', 'settings.local.json')).mode & 0o777, 0o600, 'the file keeps its mode');
  }

  writeFileSync(join(dir, 'CLAUDE.local.md'), readFileSync(join(skill, 'contributor.md'), 'utf8'));
  writeFileSync(join(dir, '.git', 'info', 'exclude'), 'docs/agents/thegraph.md\nCLAUDE.local.md\n');
  mkdirSync(join(dir, 'docs', 'agents'), { recursive: true });
  writeFileSync(join(dir, 'docs', 'agents', 'thegraph.md'), '# x\n');
  const checked = cli(dir, ['check', '--mode', 'contributor']);
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  assert.doesNotMatch(checked.stdout, /FAIL/);

  const blocked = git(dir, 'push', '-q', 'origin', 'HEAD:refs/heads/claude/x');
  assert.notEqual(blocked.status, 0, 'the pre-push stopped the push');
  assert.match(blocked.stderr, /claude\//);
  writeFileSync(join(dir, 'README.md'), 'y\n');
  git(dir, 'commit', '-q', '-am', 'second');
  const clean = git(dir, 'push', '-q', 'origin', 'HEAD:refs/heads/main');
  assert.equal(clean.status, 0, clean.stderr);
});

test('an old claude stops the install with nothing written and exit 1', () => {
  const dir = repo('old');
  const r = cli(dir, ['install'], '2.1.200 (Claude Code)');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /older than v2\.1\.295/);
  assert.throws(() => statSync(join(dir, '.claude', 'settings.local.json')));
  assert.throws(() => statSync(join(dir, '.git', 'hooks', 'pre-push')));
});

test('check exits 1 and names the failing line', () => {
  const r = cli(repo('empty'), ['check', '--mode', 'own']);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^FAIL docs\/agents\/thegraph\.md exists/m);
});

test('outside a repository it says so and exits 1', () => {
  const r = cli(scratch, ['check', '--mode', 'own']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /inside the repository/);
});
