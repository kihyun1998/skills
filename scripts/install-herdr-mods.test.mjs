import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, mkdirSync, readdirSync, lstatSync, rmdirSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs install-herdr-mods.sh against a scratch HERDR_APP_HOME with a fake herdr-app on PATH.
const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'install-herdr-mods.sh');

const fakeHerdr = `#!/usr/bin/env bash
case "$1" in
    status|do) [ -f "$FAKE_STATUS" ] && [ "$(cygpath -m "$HERDR_APP_HOME" 2>/dev/null || echo "$HERDR_APP_HOME")" = "$FAKE_HOME" ] \
        || { echo "herdr-app: no Herdr window" >&2; exit 2; } ;;
esac
case "$1" in
    status) cat "$FAKE_STATUS" ;;
    do) echo "$*" >> "$FAKE_LOG" ;;
    *) exit 2 ;;
esac
`;

// Unlinks the links the script made into this repo, then removes the scratch root.
function cleanup(root, home) {
  for (const dir of ['mods', 'layouts'].map((d) => join(home, d)).filter(existsSync)) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (!lstatSync(p).isSymbolicLink()) continue;
      try { rmdirSync(p); } catch { unlinkSync(p); }
    }
  }
  rmSync(root, { recursive: true, force: true });
}

function install({ layout, overlays = [], windows, args = [], homeUnset = false }) {
  const root = mkdtempSync(join(tmpdir(), 'herdr-install-'));
  const home = homeUnset ? join(root, '.config', 'herdr-app') : join(root, 'home');
  const bin = join(root, 'bin');
  mkdirSync(home, { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(bin, 'herdr-app'), fakeHerdr);
  chmodSync(join(bin, 'herdr-app'), 0o755);
  const status = join(root, 'status.json');
  if (layout !== undefined) writeFileSync(status, JSON.stringify({ layout, overlays, errors: [] }));
  if (windows !== undefined) writeFileSync(join(home, 'windows.json'), windows);
  const log = join(root, 'do.log');
  const sh = (p) => p.replace(/\\/g, '/');
  const env = { ...process.env, BIN: sh(bin), HERDR_APP_HOME: sh(home), FAKE_HOME: sh(home), FAKE_STATUS: sh(status), FAKE_LOG: sh(log) };
  if (homeUnset) {
    delete env.HERDR_APP_HOME;
    env.HOME = sh(root);
  }
  try {
    const r = spawnSync('bash', ['-c', 'PATH="$(cygpath -u "$BIN" 2>/dev/null || echo "$BIN"):$PATH" exec bash "$0" "$@"', sh(script), ...args], {
      encoding: 'utf8',
      env,
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return { out: r.stdout, opened: existsSync(log) ? readFileSync(log, 'utf8').trim() : '' };
  } finally {
    cleanup(root, home);
  }
}

const notKept = JSON.stringify({ kept: { 'session-restore': {} }, places: {} });
const kept = JSON.stringify({ kept: { 'session-restore': {}, main: { 'session-restore': { kind: 'window', keep: true } } }, places: {} });

test('main shown and the chip not kept there: the script opens it', () => {
  const { out, opened } = install({ layout: 'main', windows: notKept });
  assert.equal(opened, 'do mod.open --name session-restore');
  assert.match(out, /open {2}session-restore/);
  assert.doesNotMatch(out, /To open session-restore/);
});

test('main shown and no windows.json yet: nothing is kept, so it opens', () => {
  const { opened } = install({ layout: 'main' });
  assert.equal(opened, 'do mod.open --name session-restore');
});

test('the chip already kept on main: it does not run mod.open, which would close it', () => {
  const { out, opened } = install({ layout: 'main', windows: kept });
  assert.equal(opened, '');
  assert.match(out, /session-restore - already open on main/);
});

test('no window answers: it says so and prints the command', () => {
  const { out, opened } = install({ windows: notKept });
  assert.equal(opened, '');
  assert.match(out, /no Herdr window answers/);
  assert.match(out, /herdr-app do mod.open --name session-restore/);
});

test('another layout shown: it does not open and does not switch', () => {
  const { out, opened } = install({ layout: 'session-restore', windows: notKept });
  assert.equal(opened, '');
  assert.match(out, /shows the session-restore layout, not main/);
  assert.match(out, /herdr-app do mod.open --name session-restore/);
});

test('windows.json not in a form it reads: it falls back to printing the command', () => {
  for (const windows of ['not json', JSON.stringify({ kept: { main: [] } })]) {
    const { out, opened } = install({ layout: 'main', windows });
    assert.equal(opened, '', windows);
    assert.match(out, /not in a form this script reads/, windows);
    assert.match(out, /herdr-app do mod.open --name session-restore/, windows);
  }
});

test('the chip on screen but not yet in windows.json: it does not run mod.open', () => {
  const { out, opened } = install({ layout: 'main', overlays: ['session-restore'], windows: notKept });
  assert.equal(opened, '');
  assert.match(out, /session-restore - already open on main/);
});

test('a dry run does not open the chip, and says it would', () => {
  const { out, opened } = install({ layout: 'main', windows: notKept, args: ['--dry-run'] });
  assert.equal(opened, '');
  assert.match(out, /would open/);
});

test('HERDR_APP_HOME unset: herdr-app is asked about the same home whose windows.json was read', () => {
  const { opened } = install({ layout: 'main', windows: notKept, homeUnset: true });
  assert.equal(opened, 'do mod.open --name session-restore');
});
