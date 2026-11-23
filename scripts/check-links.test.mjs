import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brokenLinks, isChecked } from './check-links.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-links.mjs');

function check(docs, others = []) {
  const files = Object.entries(docs).map(([path, text]) => ({ path, text }));
  return brokenLinks(files, [...Object.keys(docs), ...others]);
}

test('a relative link to a missing file is reported with its file, line and target', () => {
  const found = check({ 'docs/adr/0001-a.md': 'intro\n\nsee [b](0002-b.md) and [c](0003-c.md)\n' }, ['docs/adr/0002-b.md']);
  assert.deepEqual(found, [{ file: 'docs/adr/0001-a.md', line: 3, target: '0003-c.md', resolved: 'docs/adr/0003-c.md' }]);
});

test('a link to a folder resolves when a file under it exists, with or without a trailing slash', () => {
  const found = check({ 'docs/adr/0001-a.md': '[x](../../promote/) [y](../../retired/promote) [z](../../spine/)' }, ['retired/promote/SKILL.md', 'promote/SKILL.md']);
  assert.deepEqual(found.map((b) => b.target), ['../../spine/']);
});

test('links inside fenced code, inline code and HTML comments are not links', () => {
  const text = '```\n[a](gone-1.md)\n```\n~~~md\n[b](gone-2.md)\n~~~\nuse `[c](gone-3.md)` here\n<!-- [d](gone-4.md) -->\n[e](gone-5.md)\n';
  assert.deepEqual(check({ 'a.md': text }), [{ file: 'a.md', line: 9, target: 'gone-5.md', resolved: 'gone-5.md' }]);
});

test('a link whose text is inline code is still checked', () => {
  assert.deepEqual(check({ 'docs/adr/x.md': 'see [`promote`](../../promote/SKILL.md)' }).map((b) => b.resolved), ['promote/SKILL.md']);
});

test('URLs, mail links and same-page anchors are skipped; an anchor on a file checks the file', () => {
  const text = '[a](https://example.com/x.md) [b](mailto:a@b.c) [c](#top) [d](b.md#part) [e](gone.md#part)';
  assert.deepEqual(check({ 'a.md': text }, ['b.md']).map((b) => b.target), ['gone.md#part']);
});

test('a percent-encoded target is decoded, and a title after the target is ignored', () => {
  assert.deepEqual(check({ 'a.md': '[x](my%20file.md "Title") [y](<other file.md>)' }, ['my file.md', 'other file.md']), []);
});

test('a reference definition is checked like an inline link', () => {
  assert.deepEqual(check({ 'a.md': 'see [x][1]\n\n[1]: gone.md\n' }).map((b) => [b.line, b.target]), [[3, 'gone.md']]);
});

test('a link that climbs out of the repository does not resolve', () => {
  assert.deepEqual(check({ 'a.md': '[x](../outside.md)' }).map((b) => b.resolved), ['../outside.md']);
});

test('a link starting with / resolves from the repository root', () => {
  assert.deepEqual(check({ 'docs/a.md': '[x](/README.md) [y](/gone.md)' }, ['README.md']).map((b) => b.resolved), ['gone.md']);
});

test('files under retired/ are not checked, and links into retired/ still resolve', () => {
  const found = check({ 'retired/x/SKILL.md': '[a](../../gone.md)', 'b.md': '[r](retired/x/SKILL.md)' });
  assert.deepEqual(found, []);
});

test('inline code ends at a blank line, so a link after an unclosed backtick is checked', () => {
  const text = 'a `tick\n\n[x](gone-para.md)\n\nmore`\n';
  assert.deepEqual(check({ 'a.md': text }).map((b) => [b.line, b.target]), [[3, 'gone-para.md']]);
});

test('a blank line with CRLF endings ends inline code too', () => {
  const text = 'a `tick\r\n\r\n[x](gone-crlf.md)\r\n\r\nmore`\r\n';
  assert.deepEqual(check({ 'a.md': text }).map((b) => [b.line, b.target]), [[3, 'gone-crlf.md']]);
});

test('a list item, heading or quote line ends inline code', () => {
  const text = '- run `foo\n- see [a](gone-list.md) and `bar`\n\nx `y\n## [b](gone-head.md) `z`\n\n> q `r\n> [c](gone-quote.md) `s`\n';
  assert.deepEqual(check({ 'a.md': text }).map((b) => b.target), ['gone-list.md', 'gone-head.md', 'gone-quote.md']);
});

test('a backslash-escaped backtick opens no inline code', () => {
  const text = 'the `**Writes** \\`triggers\\`` clauses\n\na \\` [x](gone-after.md) and `[y](in-code.md)`\n';
  assert.deepEqual(check({ 'a.md': text }).map((b) => b.target), ['gone-after.md']);
});

test('a fence line with an info string does not close a fence', () => {
  const text = '```\n[a](in-fence.md)\n```md\n[b](still-in-fence.md)\n```\n[c](after.md)\n';
  assert.deepEqual(check({ 'a.md': text }).map((b) => b.target), ['after.md']);
});

test('a footnote definition is not a link definition', () => {
  assert.deepEqual(check({ 'a.md': 'text[^1]\n\n[^1]: some footnote\n' }), []);
});

test('a target holding balanced parentheses is read whole', () => {
  assert.deepEqual(check({ 'a.md': '[a](foo_(bar).md) [b](gone_(x).md)' }, ['foo_(bar).md']).map((b) => b.target), ['gone_(x).md']);
});

test('only markdown outside retired/ is checked', () => {
  assert.deepEqual(['a.md', 'docs/adr/x.md', 'retired/x/SKILL.md', 'a.txt', 'retired.md'].filter(isChecked), ['a.md', 'docs/adr/x.md', 'retired.md']);
});

function repo(t, files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-links-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

test('the command exits 1 and names the fix for a broken link, and 0 once it is fixed', (t) => {
  const dir = repo(t, { 'docs/adr/0001-a.md': '[p](../../promote/)\n', 'retired/promote/SKILL.md': 'x\n' });
  const red = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(red.status, 1, red.stdout + red.stderr);
  assert.match(red.stdout, /docs\/adr\/0001-a\.md:1: \.\.\/\.\.\/promote\/ does not resolve \(promote\)$/m);
  assert.match(red.stdout, /retired\//);
  writeFileSync(join(dir, 'docs/adr/0001-a.md'), '[p](../../retired/promote/)\n');
  const green = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(green.status, 0, green.stdout + green.stderr);
  assert.match(green.stdout, /^Every relative link in 1 markdown file resolves\.$/m);
  assert.doesNotMatch(green.stdout, /does not resolve/);
});

test('a markdown file git stores as a symlink is not checked from the link\'s folder', (t) => {
  const dir = repo(t, { 'skills/a/SKILL.md': '[r](../RULES.md)\n', 'skills/RULES.md': 'x\n', 'evals/skills/a/SKILL.md': '[r](../RULES.md)\n' });
  const sha = spawnSync('git', ['hash-object', '-w', '--stdin'], { cwd: dir, input: '../../../skills/a/SKILL.md', encoding: 'utf8' }).stdout.trim();
  spawnSync('git', ['add', 'skills'], { cwd: dir });
  const idx = spawnSync('git', ['update-index', '--add', '--cacheinfo', `120000,${sha},evals/skills/a/SKILL.md`], { cwd: dir, encoding: 'utf8' });
  assert.equal(idx.status, 0, idx.stderr);
  const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^Every relative link in 2 markdown files resolves\.$/m);
});

test('the command still checks when it is run through a linked folder', (t) => {
  const dir = repo(t, { 'a.md': '[g](gone.md)\n' });
  const link = join(dir, 'linked-scripts');
  symlinkSync(dirname(script), link, 'junction');
  const r = spawnSync(process.execPath, [join(link, 'check-links.mjs')], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^a\.md:1: gone\.md does not resolve \(gone\.md\)$/m);
});

test('a tracked file missing on disk neither crashes the command nor resolves a link', (t) => {
  const dir = repo(t, { 'a.md': '[b](b.md) [s](tools/run.sh)\n', 'b.md': 'x\n', 'c.md': '[a](a.md)\n', 'tools/run.sh': 'x\n' });
  spawnSync('git', ['add', '-A'], { cwd: dir });
  for (const path of ['b.md', 'c.md', 'tools/run.sh']) rmSync(join(dir, path));
  const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^a\.md:1: b\.md does not resolve \(b\.md\)$/m);
  assert.match(r.stdout, /^a\.md:1: tools\/run\.sh does not resolve \(tools\/run\.sh\)$/m);
  assert.doesNotMatch(r.stderr, /ENOENT/);
});

test('a tracked file whose folder is now a file neither crashes the command nor resolves a link', (t) => {
  const dir = repo(t, { 'a.md': '[x](d/x.md)\n', 'd/x.md': 'x\n' });
  spawnSync('git', ['add', '-A'], { cwd: dir });
  rmSync(join(dir, 'd'), { recursive: true });
  writeFileSync(join(dir, 'd'), 'x\n');
  const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^a\.md:1: d\/x\.md does not resolve \(d\/x\.md\)$/m);
});

test('a tracked markdown file that is now a folder neither crashes the command nor resolves a link', (t) => {
  const dir = repo(t, { 'a.md': '[y](y.md)\n', 'y.md': '[a](a.md)\n' });
  spawnSync('git', ['add', '-A'], { cwd: dir });
  rmSync(join(dir, 'y.md'));
  mkdirSync(join(dir, 'y.md'));
  const r = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^a\.md:1: y\.md does not resolve \(y\.md\)$/m);
});
