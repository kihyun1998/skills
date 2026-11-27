import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, lstatSync, readlinkSync, symlinkSync, rmSync, realpathSync, chmodSync } from 'node:fs';
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

function installCodex(home, args = [], codexHome = join(home, '.codex')) {
  const r = spawnSync('bash', [script, '--codex', ...args], { encoding: 'utf8', env: { ...process.env, HOME: home, CODEX_HOME: codexHome } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout + r.stderr;
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
  installCodex(home);
  assert.ok(!existsSync(join(home, '.codex', 'agents')));
  assert.ok(!existsSync(join(home, '.claude', 'agents')));
});

const kiSkills = readdirSync(join(repo, 'ki-skills')).filter((d) => existsSync(join(repo, 'ki-skills', d, 'SKILL.md')));

function assertKiLinked(skillsHome) {
  assert.equal(kiSkills.length, 16);
  for (const name of kiSkills) {
    const link = join(skillsHome, name);
    assert.ok(lstatSafe(link)?.isSymbolicLink(), `${name} is not linked`);
    assert.equal(realpathSync(link), realpathSync(join(repo, 'ki-skills', name)));
  }
}

test('links each ki-skills/<name> into ~/.claude/skills, and a second run neither relinks nor prunes them', (t) => {
  const home = scratch();
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const skills = join(home, '.claude', 'skills');
  const first = install(home);
  assertKiLinked(skills);
  assert.match(first, /link {2}ki-tdd -> /);
  assert.ok(!existsSync(join(skills, 'ki-skills')));
  const second = install(home);
  assertKiLinked(skills);
  assert.match(second, /ok {4}ki-tdd - already linked/);
  assert.doesNotMatch(second, /prune ki-|relink ki-/);
});

test('links each ki-skills/<name> into ~/.agents/skills for Codex, and none under $CODEX_HOME/skills', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const codexHome = join(home, 'codex-home');
  const out = installCodex(home, [], codexHome);
  assertKiLinked(join(home, '.agents', 'skills'));
  assert.ok(!existsSync(join(codexHome, 'skills')));
  assert.ok(!existsSync(join(home, '.codex')));
  assert.match(out, /in .*\.agents\/skills\./);
  const second = installCodex(home, [], codexHome);
  assert.match(second, /ok {4}ki-tdd - already linked/);
  assert.doesNotMatch(second, /^ {2}(prune|relink|link) /m);
});

test('a Codex sync prunes its own links from $CODEX_HOME/skills and reports what it leaves there', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const old = join(home, '.codex', 'skills');
  mkdirSync(join(old, '.system', 'codex-own'), { recursive: true });
  const owned = join(old, 'ki-tdd');
  symlinkSync(join(repo, 'ki-skills', 'ki-tdd'), owned, 'junction');
  const ownedGone = join(old, 'ki-gone');
  symlinkSync(join(repo, 'ki-skills', 'ki-gone'), ownedGone, 'junction');
  const excluded = join(old, 'thegraph-herdr');
  symlinkSync(join(repo, 'thegraph-herdr'), excluded, 'junction');
  mkdirSync(join(home, 'elsewhere'));
  const foreign = join(old, 'theirs');
  symlinkSync(join(home, 'elsewhere'), foreign, 'junction');
  const real = join(old, 'mine');
  mkdirSync(real);
  writeFileSync(join(real, 'SKILL.md'), 'mine');
  const out = installCodex(home);
  assert.ok(!lstatSafe(owned) && !lstatSafe(ownedGone) && !lstatSafe(excluded));
  assert.match(out, /prune ki-tdd - moved to .*\.agents\/skills/);
  assert.match(out, /prune ki-gone - no longer a skill in this repo/);
  assert.match(out, /prune thegraph-herdr - excluded from codex/);
  assert.doesNotMatch(out, /prune (ki-gone|thegraph-herdr) - moved to/);
  assert.match(out, /^3 pruned, 0 kept, 0 SHADOWED in /m);
  assert.ok(lstatSync(foreign).isSymbolicLink());
  assert.equal(readFileSync(join(real, 'SKILL.md'), 'utf8'), 'mine');
  assert.match(out, /left {2}theirs - /);
  assert.match(out, /left {2}mine - /);
  assert.doesNotMatch(out, /\.system/);
  assert.ok(existsSync(join(old, '.system', 'codex-own')));
  assertKiLinked(join(home, '.agents', 'skills'));
});

test('a Codex dry-run writes nothing in either skills folder', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const old = join(home, '.codex', 'skills');
  mkdirSync(old, { recursive: true });
  const owned = join(old, 'ki-tdd');
  symlinkSync(join(repo, 'ki-skills', 'ki-tdd'), owned, 'junction');
  const out = installCodex(home, ['--dry-run']);
  assert.match(out, /prune ki-tdd - moved to /);
  assert.match(out, /link {2}ki-tdd -> /);
  assert.match(out, /^\[dry-run\] 1 pruned, 0 kept, 0 SHADOWED in .*\.codex\/skills, /m);
  assert.doesNotMatch(out, /^\d+ pruned/m);
  assert.ok(lstatSync(owned).isSymbolicLink());
  assert.deepEqual(readdirSync(old), ['ki-tdd']);
  assert.ok(!existsSync(join(home, '.agents')));
});

test('a Codex sync keeps the old link of a skill it could not link in ~/.agents/skills', { skip: (process.platform === 'win32' || process.getuid?.() === 0) && 'mode 555 does not stop this user linking into the folder' }, (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  const skills = join(home, '.agents', 'skills');
  t.after(() => { chmodSync(skills, 0o755); rmSync(home, { recursive: true, force: true }); });
  const old = join(home, '.codex', 'skills');
  mkdirSync(old, { recursive: true });
  const owned = join(old, 'ki-tdd');
  symlinkSync(join(repo, 'ki-skills', 'ki-tdd'), owned, 'junction');
  const ownedGone = join(old, 'ki-gone');
  symlinkSync(join(repo, 'ki-skills', 'ki-gone'), ownedGone, 'junction');
  mkdirSync(skills, { recursive: true });
  chmodSync(skills, 0o555);
  const out = installCodex(home);
  assert.match(out, /keep {2}ki-tdd - not linked in .*\.agents\/skills/);
  assert.equal(readlinkSync(owned), join(repo, 'ki-skills', 'ki-tdd'));
  assert.ok(!lstatSafe(ownedGone));
  assert.match(out, /^1 pruned, 1 kept, 0 SHADOWED in /m);
});

test('a real folder of a repo skill in $CODEX_HOME/skills is counted as shadowed and left, even with --replace-copies', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const real = join(home, '.codex', 'skills', 'ki-tdd');
  mkdirSync(real, { recursive: true });
  writeFileSync(join(real, 'SKILL.md'), 'mine');
  for (const args of [[], ['--replace-copies']]) {
    const out = installCodex(home, args);
    assert.match(out, /shadow ki-tdd - a real folder of this repo's skill/);
    assert.match(out, /THEY DIFFER/);
    assert.match(out, /^0 pruned, 0 kept, 1 SHADOWED in .*\.codex\/skills, /m);
    assert.ok(lstatSync(real).isDirectory() && !lstatSync(real).isSymbolicLink());
    assert.equal(readFileSync(join(real, 'SKILL.md'), 'utf8'), 'mine');
  }
});

test('a Codex sync keeps install targets in ~/.agents/skills', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const skills = join(home, '.agents', 'skills');
  mkdirSync(skills, { recursive: true });
  const claudeOnly = join(skills, 'thegraph-herdr');
  symlinkSync(join(repo, 'thegraph-herdr'), claudeOnly, 'junction');
  const stale = join(skills, 'gone');
  symlinkSync(join(repo, 'gone'), stale, 'junction');
  const out = installCodex(home);
  assert.match(out, /prune thegraph-herdr - excluded from codex/);
  assert.match(out, /prune gone - no longer a skill in this repo/);
  assert.ok(!lstatSafe(claudeOnly) && !lstatSafe(stale));
  assert.ok(lstatSync(join(skills, 'thegraph-codex')).isSymbolicLink());
});

test('a real folder in ~/.agents/skills is reported, and --replace-copies moves it to $CODEX_HOME/skills-replaced', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const skills = join(home, '.agents', 'skills');
  const real = join(skills, 'ki-tdd');
  mkdirSync(real, { recursive: true });
  writeFileSync(join(real, 'SKILL.md'), 'mine');
  const out = installCodex(home);
  assert.match(out, /shadow ki-tdd - a real folder shadows the repo skill/);
  assert.equal(readFileSync(join(real, 'SKILL.md'), 'utf8'), 'mine');
  installCodex(home, ['--replace-copies']);
  assert.ok(lstatSync(real).isSymbolicLink());
  const moved = readdirSync(join(home, '.codex', 'skills-replaced'));
  assert.equal(moved.length, 1);
  assert.equal(readFileSync(join(home, '.codex', 'skills-replaced', moved[0], 'SKILL.md'), 'utf8'), 'mine');
  assert.ok(!existsSync(join(home, '.agents', 'skills-replaced')));
});

test('a Codex dry-run previews the same keep as the real run where a real folder holds the name in ~/.agents/skills', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, '.agents', 'skills', 'ki-tdd'), { recursive: true });
  const old = join(home, '.codex', 'skills');
  mkdirSync(old, { recursive: true });
  const owned = join(old, 'ki-tdd');
  symlinkSync(join(repo, 'ki-skills', 'ki-tdd'), owned, 'junction');
  const dry = installCodex(home, ['--dry-run']);
  assert.match(dry, /keep {2}ki-tdd - not linked in /);
  assert.match(dry, /^\[dry-run\] 0 pruned, 1 kept, 0 SHADOWED in /m);
  const real = installCodex(home);
  assert.match(real, /keep {2}ki-tdd - not linked in /);
  assert.match(real, /^0 pruned, 1 kept, 0 SHADOWED in /m);
  assert.ok(lstatSync(owned).isSymbolicLink());
  const replaced = installCodex(home, ['--replace-copies', '--dry-run']);
  assert.match(replaced, /prune ki-tdd - moved to /);
});

test('a $CODEX_HOME/skills that is ~/.agents/skills itself is not pruned', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'install-skills-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, '.codex'));
  mkdirSync(join(home, '.agents', 'skills'), { recursive: true });
  symlinkSync(join(home, '.agents', 'skills'), join(home, '.codex', 'skills'), 'junction');
  installCodex(home);
  const second = installCodex(home);
  assert.doesNotMatch(second, /^ {2}prune /m);
  assertKiLinked(join(home, '.agents', 'skills'));
});

test('prunes a link into ki-skills/ whose skill is gone', (t) => {
  const home = scratch();
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const skills = join(home, '.claude', 'skills');
  mkdirSync(skills, { recursive: true });
  const stale = join(skills, 'ki-gone');
  symlinkSync(join(repo, 'ki-skills', 'ki-gone'), stale, 'junction');
  const out = install(home);
  assert.match(out, /prune ki-gone - no longer a skill in this repo/);
  assert.ok(!lstatSafe(stale));
  assertKiLinked(skills);
});

function lstatSafe(p) {
  try { return lstatSync(p); } catch { return null; }
}
