import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, lstatSync, readlinkSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = dirname(here);
const script = join(here, 'install-skills.sh');
const reviewer = join(repo, 'check-it', 'agents', 'check-it-reviewer.md');

function scratch() {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  mkdirSync(join(home, '.claude', 'agents'), { recursive: true });
  return home;
}

function install(home, args = []) {
  const r = spawnSync('bash', [script, '--claude', ...args], { encoding: 'utf8', env: { ...process.env, HOME: home } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout + r.stderr;
}

test('links check-it-reviewer into ~/.claude/agents, and a second run leaves it', (t) => {
  const home = scratch();
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const link = join(home, '.claude', 'agents', 'check-it-reviewer.md');
  const first = install(home);
  assert.ok(lstatSync(link).isSymbolicLink());
  assert.equal(readlinkSync(link), reviewer);
  assert.match(first, /link {2}check-it-reviewer\.md -> /);
  assert.ok(readdirSync(join(repo, 'docs', 'agents')).some((f) => f.endsWith('.md')));
  assert.deepEqual(readdirSync(join(home, '.claude', 'agents')), ['check-it-reviewer.md']);
  const second = install(home);
  assert.match(second, /ok {4}check-it-reviewer\.md - already linked/);
  assert.equal(readlinkSync(link), reviewer);
});

test('prunes a link into this repo that is no longer an agent, and keeps one from elsewhere', (t) => {
  const home = scratch();
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const agents = join(home, '.claude', 'agents');
  const stale = join(agents, 'gone.md');
  symlinkSync(join(repo, 'check-it', 'agents', 'gone.md'), stale);
  const notAnAgent = join(agents, 'readme.md');
  symlinkSync(join(repo, 'README.md'), notAnAgent);
  const foreignTarget = join(home, 'other.md');
  writeFileSync(foreignTarget, '---\nname: other\ndescription: x\n---\n');
  const foreign = join(agents, 'other.md');
  symlinkSync(foreignTarget, foreign);
  const out = install(home);
  assert.ok(!existsSync(stale) && !lstatSafe(stale));
  assert.ok(!lstatSafe(notAnAgent));
  assert.match(out, /prune gone\.md/);
  assert.ok(lstatSync(foreign).isSymbolicLink());
  assert.ok(lstatSync(join(agents, 'check-it-reviewer.md')).isSymbolicLink());
});

test('a real file where the link belongs is reported and left alone', (t) => {
  const home = scratch();
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const path = join(home, '.claude', 'agents', 'check-it-reviewer.md');
  writeFileSync(path, 'mine');
  const out = install(home);
  assert.match(out, /shadow check-it-reviewer\.md/);
  assert.ok(!lstatSync(path).isSymbolicLink());
  assert.equal(readFileSync(path, 'utf8'), 'mine');
});

test('--codex makes no agents folder', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const r = spawnSync('bash', [script, '--codex'], { encoding: 'utf8', env: { ...process.env, HOME: home, CODEX_HOME: join(home, '.codex') } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!existsSync(join(home, '.codex', 'agents')));
  assert.ok(!existsSync(join(home, '.claude', 'agents')));
});

function lstatSafe(p) {
  try { return lstatSync(p); } catch { return null; }
}
