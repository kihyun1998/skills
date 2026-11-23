import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export class CheckItError extends Error {}

const fail = (message) => {
  throw new CheckItError(message);
};

export const SKILLS = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const REVIEWS = {
  refactoring: { file: 'reviewers/refactoring.md' },
  'spec-rules': { file: 'reviewers/spec-rules.md' },
  bug: { file: 'reviewers/bug.md' },
  security: { file: 'reviewers/security.md' },
  lens: { skill: 'lens', file: 'reviewers/lens.md', drop: 'A second reader' },
  comments: { skill: 'comment-it', file: 'reviewers/comment-it.md' },
  proving: { file: 'reviewers/proving.md', findings: true },
  pick: { file: 'reviewers/decision-model.md', confirm: false },
  'pick-confirm': { file: 'reviewers/decision-model.md', confirm: true },
};

const CONFIRM_SECTION = 'At the confirm stop';

export const REPORTS = [...Object.keys(REVIEWS), 'verify', 'findings', 'change'];
const PER_CHILD = new Set(['pick-confirm', 'change']);

const ALLOWED = {
  record: ['repo', 'run-folder', 'from'],
  claim: ['repo', 'run-folder'],
  range: ['repo', 'run-folder'],
  name: ['repo', 'sheet', 'run-folder', 'child'],
  verify: ['repo', 'covered', 'run-folder'],
  prompt: ['repo', 'issue', 'run-folder', 'ledger', 'findings', 'change'],
};

export const RECORD = 'check-it.untracked.json';
export const CLAIMS = 'check-it.claimed.json';

export const USAGE = `Usage: node check-it.mjs <command> [options]

  record --run-folder <dir> [--from <earlier dir>]
                                records the untracked files there now, with a hash of each one's
                                content, in <dir>/${RECORD}; made once, when a run's first run folder
                                is made, before any change is written. With --from, a run started over
                                or moved keeps the earlier run folder's record instead: it is carried
                                into <dir>; where the earlier folder holds none, the record made lists
                                no file, and where that folder is not there, record stops
  claim --run-folder <dir> <path> ...
                                takes each path as this run's, in <dir>/${CLAIMS}, where the run works
                                in the same tree as another run; it stops on a path a run folder named
                                *.made beside <dir> claims, or one already changed that this run has not
                                claimed, or a folder
  range [--run-folder <dir>]    the files the diff touches: git diff HEAD plus every untracked file,
                                less those the run folder's record shows unchanged since it was made;
                                where <dir> holds a claim, only the files it claims, and otherwise less
                                the files a claim in a run folder named *.made beside <dir> names
  name <report> (--sheet <run sheet> | --run-folder <dir>) [--child <issue>]
                                where a report is saved; <report> is one of
                                ${REPORTS.join(', ')}
  verify --covered <file> ... [--run-folder <dir>]
                                the files the diff touches that a verify skill covers, or none
  prompt <review> --issue <issue> --run-folder <dir> --ledger <file> [--findings <report> ...] [--change <file>]
                                the prompt handed to Agent as it is, the change read as range reads it;
                                <review> is one of
                                ${Object.keys(REVIEWS).join(', ')}

  --repo <dir>                  the repository (default: the one the current folder is in)
`;

const VALUED = new Set(Object.values(ALLOWED).flat().map((key) => `--${key}`));
const REPEATED = new Set(['--covered', '--findings']);

export function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined || value === '') fail(`${arg} needs a value`);
      const key = arg.slice(2);
      if (REPEATED.has(arg)) (opts[key] ??= []).push(value);
      else if (key in opts) fail(`${arg} is given twice`);
      else opts[key] = value;
    } else if (arg.startsWith('--')) {
      fail(`unknown option ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0], args: positional.slice(1), opts };
}

export function repoRoot(opts, deps) {
  const start = resolve(deps.cwd, opts.repo ?? '.');
  return resolve(deps.git(start, ['rev-parse', '--show-toplevel']).trim());
}

const zsplit = (out) => out.split('\0').filter((p) => p !== '');

const shown = (path) => (/[\u0000-\u001f\u007f`]/.test(path) ? JSON.stringify(path) : `\`${path}\``);

const untrackedNow = (repo, deps) => zsplit(deps.git(repo, ['ls-files', '--others', '--exclude-standard', '-z']));

const runFolderOf = (opts, deps) => {
  const dir = resolve(deps.cwd, opts['run-folder']);
  if (!deps.isDir(dir)) fail(`the run folder ${dir} is not a folder`);
  return dir;
};

const inRepo = (path) => path !== '' && !path.includes('\0') && !path.startsWith('/') && !path.split('/').includes('..');

const readJson = (path, kind, deps) => {
  const bad = (why) => fail(`${path} is not a ${kind} check-it wrote: ${why}`);
  let data;
  try {
    data = JSON.parse(deps.readFile(path).replace(/^\uFEFF/, ''));
  } catch (err) {
    bad(err.message);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) bad('it is not an object');
  if (typeof data.repo !== 'string') bad('it names no repository');
  return { data, bad };
};

const madeFor = (path, made, repo) => {
  if (resolve(made) !== repo) fail(`${path} was made for ${made}, not ${repo}: run check-it in ${made}, or give it a run folder of its own`);
};

const outside = (path, file) => fail(`${path} names ${shown(file)}, a path outside the repository, so it is not read`);

export function readRecord(runFolder, repo, deps) {
  const path = join(runFolder, RECORD);
  if (!deps.isFile(path)) return undefined;
  const { data, bad } = readJson(path, 'record', deps);
  if (data.untracked === null || typeof data.untracked !== 'object' || Array.isArray(data.untracked)) bad('it lists no untracked files');
  madeFor(path, data.repo, repo);
  const hashes = new Map();
  for (const [file, hash] of Object.entries(data.untracked)) {
    if (!inRepo(file)) outside(path, file);
    if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) fail(`${path} gives ${shown(file)} something that is not a content hash`);
    hashes.set(file, hash);
  }
  return { path, hashes };
}

export function readClaim(dir, deps) {
  const path = join(dir, CLAIMS);
  if (!deps.isFile(path)) return undefined;
  const { data, bad } = readJson(path, 'claim', deps);
  if (!Array.isArray(data.files) || data.files.some((f) => typeof f !== 'string')) bad('it lists no files');
  for (const file of data.files) if (!inRepo(file)) outside(path, file);
  return { path, repo: resolve(data.repo), files: new Set(data.files) };
}

const ownClaim = (runFolder, repo, deps) => {
  const claim = readClaim(runFolder, deps);
  if (claim) madeFor(claim.path, claim.repo, repo);
  return claim;
};

const othersClaims = (runFolder, repo, deps) => {
  const parent = dirname(runFolder);
  const own = basename(runFolder);
  const claims = [];
  for (const name of deps.listDir(parent)) {
    if (name === own || !name.endsWith('.made')) continue;
    try {
      const claim = readClaim(join(parent, name), deps);
      if (claim && claim.repo === repo) claims.push(claim);
    } catch (err) {
      if (!(err instanceof CheckItError)) throw err;
    }
  }
  return claims;
};

const notRecorded = (all, record, repo, deps) => {
  if (!record) return { untracked: all, leftOut: [] };
  const untracked = [];
  const leftOut = [];
  for (const p of all) {
    const unchanged = record.hashes.has(p) && deps.hash(join(repo, p)) === record.hashes.get(p);
    (unchanged ? leftOut : untracked).push(p);
  }
  return { untracked, leftOut };
};

const scopeToClaim = (tracked, untracked, claim) => {
  const notClaimed = [...tracked, ...untracked].filter((p) => !claim.files.has(p));
  return {
    tracked: tracked.filter((p) => claim.files.has(p)),
    untracked: untracked.filter((p) => claim.files.has(p)),
    ...(notClaimed.length && { notClaimed: { claim: claim.path, files: notClaimed } }),
  };
};

const leaveOutTheirs = (tracked, untracked, claims) => {
  const changed = [...tracked, ...untracked];
  const theirs = claims
    .map((c) => ({ claim: c.path, files: changed.filter((p) => c.files.has(p)) }))
    .filter((t) => t.files.length);
  const taken = new Set(theirs.flatMap((t) => t.files));
  return {
    tracked: tracked.filter((p) => !taken.has(p)),
    untracked: untracked.filter((p) => !taken.has(p)),
    ...(theirs.length && { theirs }),
  };
};

export function changedFiles(repo, deps, runFolder) {
  const tracked = zsplit(deps.git(repo, ['diff', 'HEAD', '--name-only', '--no-renames', '-z']));
  const all = untrackedNow(repo, deps);
  if (runFolder === undefined) return { tracked, untracked: all };
  const record = readRecord(runFolder, repo, deps);
  const { untracked, leftOut } = notRecorded(all, record, repo, deps);
  const claim = ownClaim(runFolder, repo, deps);
  const scoped = claim ? scopeToClaim(tracked, untracked, claim) : leaveOutTheirs(tracked, untracked, othersClaims(runFolder, repo, deps));
  return { ...scoped, ...(record && { leftOut, record: record.path }) };
}

export function claimFiles(repo, runFolder, paths, deps) {
  if (!paths.length) fail('claim needs each path it takes, from the repository\'s root');
  const wanted = paths.map((p) => {
    const n = normal(resolve(repo, p), repo);
    if (!inRepo(n) || isAbsolute(n)) fail(`${shown(p)} is a path outside the repository ${repo}`);
    if (deps.isDir(join(repo, n))) fail(`${shown(n)} is a folder: claim each file in it, since a claim matches a file by its whole path`);
    return n;
  });
  const claim = ownClaim(runFolder, repo, deps);
  const mine = claim?.files ?? new Set();
  const others = othersClaims(runFolder, repo, deps);
  const { tracked, untracked } = changedFiles(repo, deps, undefined);
  const changed = new Set([...tracked, ...untracked]);
  const byCase = new Map([...changed].map((p) => [p.toLowerCase(), p]));
  for (const p of wanted) {
    if (mine.has(p)) continue;
    const other = others.find((o) => o.files.has(p));
    if (other) fail(`${shown(p)} is claimed by another run in the same tree, in ${other.path}: the two runs' files overlap, so going on is the person's call`);
    if (changed.has(p)) fail(`${shown(p)} is already changed in the tree, and this run has not claimed it: another run's change, or this run's written before it was claimed; going on is the person's call`);
    const twin = byCase.get(p.toLowerCase());
    if (twin !== undefined) fail(`${shown(p)} differs only in case from ${shown(twin)}, which is changed in the tree: claim it as git names it`);
  }
  const files = [...new Set([...mine, ...wanted])].sort();
  const path = join(runFolder, CLAIMS);
  deps.saveFile(path, `${JSON.stringify({ repo, files }, null, 2)}\n`);
  const added = [...new Set(wanted)].sort();
  return `claimed ${added.length} file${added.length === 1 ? '' : 's'} in ${path}: ${added.map(shown).join(', ')}\n`;
}

const changeIn = (repo, opts, deps) => changedFiles(repo, deps, opts['run-folder'] && runFolderOf(opts, deps));

const recordAt = (runFolder, deps) => {
  const path = join(runFolder, RECORD);
  if (deps.exists(path)) fail(`the run folder already holds a record at ${path}; it is made once, when the run's first run folder is made, before any change is written`);
  return path;
};

const recordText = (repo, entries) => `${JSON.stringify({ repo, untracked: Object.fromEntries(entries) }, null, 2)}\n`;

const untrackedFiles = (n) => `${n} untracked file${n === 1 ? '' : 's'}`;

export function carryRecord(repo, runFolder, from, deps) {
  const earlier = resolve(deps.cwd, from);
  if (!deps.isDir(earlier)) fail(`the earlier run folder ${earlier} is not a folder: give the run folder the earlier attempt used, since the step after this one deletes it`);
  const same = deps.realPath(earlier) === deps.realPath(runFolder);
  if (same) {
    const kept = readRecord(runFolder, repo, deps);
    if (kept) return `kept the record ${kept.path}\n`;
  }
  const path = recordAt(runFolder, deps);
  const record = same ? undefined : readRecord(earlier, repo, deps);
  if (!record) {
    deps.writeFile(path, recordText(repo, []));
    return `recorded no untracked file, since there is no record at ${join(same ? runFolder : earlier, RECORD)}: every untracked file is listed\n`;
  }
  deps.writeFile(path, recordText(repo, record.hashes));
  return `carried the record of ${untrackedFiles(record.hashes.size)} from ${record.path} into ${path}\n`;
}

export function recordUntracked(repo, runFolder, deps) {
  const path = recordAt(runFolder, deps);
  const untracked = new Map();
  const skipped = [];
  for (const p of untrackedNow(repo, deps)) {
    const hash = deps.hash(join(repo, p));
    if (hash === null) skipped.push(p);
    else untracked.set(p, hash);
  }
  deps.writeFile(path, recordText(repo, untracked));
  const lines = [`recorded ${untrackedFiles(untracked.size)} in ${path}`];
  if (skipped.length) lines.push(`not recorded, since it could not be read as a file or a link, so always listed: ${skipped.map(shown).join(', ')}`);
  return `${lines.join('\n')}\n`;
}

const leftOutAny = ({ leftOut = [], notClaimed, theirs = [] }) => leftOut.length > 0 || notClaimed !== undefined || theirs.length > 0;

export function listing({ tracked, untracked, leftOut = [], record, notClaimed, theirs = [] }) {
  if (tracked.length + untracked.length === 0) {
    if (notClaimed) fail('the diff is empty: every changed file is left out, as not claimed by this run, which works in the same tree as another run');
    if (theirs.length) fail('the diff is empty: every changed file is left out, as claimed by another run in the same tree');
    if (leftOut.length) {
      const one = leftOut.length === 1;
      fail(`the diff is empty: git diff HEAD prints nothing, and the ${untrackedFiles(leftOut.length)} git ls-files --others --exclude-standard lists ${one ? 'is' : 'are'} left out as unchanged since ${record} was made`);
    }
    fail('the diff is empty: git diff HEAD and git ls-files --others --exclude-standard print nothing');
  }
  const lines = [
    ...tracked.map((p) => `- ${shown(p)}`),
    ...untracked.map((p) => `- ${shown(p)} (untracked)`),
  ];
  if (leftOut.length) {
    lines.push('', `Left out: untracked before the run began and unchanged since, as ${record} records:`, ...leftOut.map((p) => `- ${shown(p)}`));
  }
  if (notClaimed) {
    lines.push('', `Left out: changed in the tree, but not claimed by this run, which works in the same tree as another run and claims its files in ${notClaimed.claim}:`, ...notClaimed.files.map((p) => `- ${shown(p)}`));
  }
  for (const t of theirs) {
    lines.push('', `Left out: claimed by another run in the same tree, in ${t.claim}:`, ...t.files.map((p) => `- ${shown(p)}`));
  }
  return lines.join('\n');
}

export function reportPath(name, opts, deps) {
  if (!REPORTS.includes(name)) fail(`no report named ${name ?? '(none)'}; one of ${REPORTS.join(', ')}`);
  const runFolder = opts['run-folder'];
  if (opts.sheet && runFolder) fail('give --sheet or --run-folder, not both');
  if (!opts.sheet && !runFolder) fail('give --sheet <run sheet>, or --run-folder <dir> where there is no run sheet');
  let child = '';
  if (opts.child !== undefined) {
    if (!PER_CHILD.has(name)) fail(`--child applies only to ${[...PER_CHILD].join(' and ')}`);
    if (!opts.sheet) fail('--child needs --sheet');
    const id = opts.child.replace(/^#/, '').replace(/\.md$/i, '');
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) fail(`--child ${opts.child} is not an issue number or issue file name`);
    child = `.${id}`;
  }
  if (runFolder) return join(runFolderOf(opts, deps), `check-it.${name}.md`);
  if (!/\.md$/i.test(opts.sheet)) fail(`the run sheet ${opts.sheet} does not end in .md`);
  return `${resolve(deps.cwd, opts.sheet).slice(0, -3)}${child}.${name}.md`;
}

const normal = (path, repo) => {
  const p = isAbsolute(path) ? relative(repo, path) : path;
  return p.replaceAll('\\', '/').replace(/^(\.\/)+/, '');
};

export function matchCovered(files, covered, repo, isFile) {
  if (!covered?.length) fail('give each covered file with --covered <file>');
  const want = new Set(covered.map((c) => normal(c, repo)));
  for (const c of want) {
    if (!files.tracked.includes(c) && !isFile(join(repo, c))) {
      fail(`--covered ${c} is not a file in the repository ${repo}; give each covered file as its path from the repository's root`);
    }
  }
  return [...files.tracked, ...files.untracked].filter((f) => want.has(f));
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/;

export function skillBody(text, path) {
  const m = FRONTMATTER.exec(text);
  if (!m) fail(`${path} has no frontmatter, so it is not a skill's SKILL.md`);
  return text.slice(m[0].length);
}

export function dropStep(text, title, path) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^\d+\. \*\*/.test(l) && l.replace(/^\d+\. \*\*/, '').startsWith(title));
  if (start < 0) fail(`${path} has no step "${title}", which a review cannot run and this script leaves out`);
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === '' || /^\s/.test(lines[end]))) end++;
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n');
}

export function section(text, heading, path) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (start < 0) fail(`${path} has no section "## ${heading}"`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join('\n');
}

const piece = (text, what) => {
  if (typeof text !== 'string' || text.trim() === '') fail(`${what} is empty, so the review would start on an empty brief`);
  return text.trim();
};

const read = (deps, path, what) => {
  let text;
  try {
    text = deps.readFile(path);
  } catch (err) {
    fail(`${what} could not be read: ${err.message}`);
  }
  text = text.replace(/^\uFEFF/, '');
  piece(text, what);
  return text.replaceAll('\r\n', '\n');
};

export function ownPart(text) {
  if (!text.startsWith('# ')) return text;
  const lines = text.split('\n');
  let i = 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  while (i < lines.length && lines[i].trim() !== '') i++;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) return '';
  return [lines[0], '', ...lines.slice(i)].join('\n');
}

export function fill(template, values, what) {
  const names = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  for (const n of names) {
    if (!(n in values)) fail(`${what} has a placeholder {{${n}}} this script does not fill`);
    piece(values[n], `the value for {{${n}}} in ${what}`);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, n) => values[n]);
}

const changeLine = (files) =>
  `\`git diff HEAD\` in the repository, plus every untracked file${leftOutAny(files) ? ' not left out below' : ''}, so a new file is in it. The files it touches:\n\n${listing(files)}`;

export function assemblePrompt(review, opts, deps) {
  const spec = REVIEWS[review];
  if (!spec) fail(`no review named ${review ?? '(none)'}; one of ${Object.keys(REVIEWS).join(', ')}`);
  for (const key of ['issue', 'run-folder', 'ledger']) if (!opts[key]) fail(`prompt ${review} needs --${key}`);
  if (spec.findings && !opts.findings?.length) fail(`prompt ${review} needs --findings <report> for each report whose findings it proves`);
  if (!spec.findings && opts.findings) fail(`--findings applies only to proving`);
  if (spec.confirm && !opts.change) fail(`prompt ${review} needs --change <file> holding the issue and the two statements`);
  if (!spec.confirm && opts.change) fail(`--change applies only to pick-confirm`);

  const repo = repoRoot(opts, deps);
  const runFolder = runFolderOf(opts, deps);
  const checkIt = join(deps.skills, 'check-it');
  const change = spec.confirm ? 'the planned change, at the end of this prompt' : changeLine(changedFiles(repo, deps, runFolder));
  const skillDir = spec.skill ? join(deps.skills, spec.skill) : undefined;
  const values = {
    skills: deps.skills,
    repo,
    issue: opts.issue,
    run_folder: runFolder,
    ledger: resolve(deps.cwd, opts.ledger),
    change,
    ...(skillDir && { skill_dir: skillDir }),
  };
  const part = (rel) => {
    const path = join(checkIt, rel);
    let text = ownPart(read(deps, path, path).trim());
    if (rel === spec.file && spec.confirm !== undefined) {
      const confirmPart = section(text, CONFIRM_SECTION, path);
      if (!spec.confirm) text = text.replace(confirmPart, '');
    }
    return fill(piece(text.trim(), path), values, path);
  };

  const parts = [part('reviewers/brief.md')];
  if (spec.skill) {
    const path = join(skillDir, 'SKILL.md');
    const full = piece(skillBody(read(deps, path, path), path), `the body of ${path}`);
    const body = spec.drop ? dropStep(full, spec.drop, path) : full;
    parts.push(`# Your method: the body of ${path}, below its frontmatter${spec.drop ? `, without the step a review cannot run (${spec.drop})` : ''}\n\n${body}`);
  }
  parts.push(part(spec.file));
  if (spec.findings) {
    const path = join(checkIt, 'SKILL.md');
    parts.push(piece(section(read(deps, path, path), 'Whose is it', path), `*Whose is it* in ${path}`));
    parts.push('# The findings to prove');
    for (const f of opts.findings) {
      const p = resolve(deps.cwd, f);
      parts.push(`## ${p}\n\n${read(deps, p, `the report ${p}`).trim()}`);
    }
  }
  if (spec.confirm) {
    const p = resolve(deps.cwd, opts.change);
    parts.push(`# The planned change\n\n${read(deps, p, `the planned change ${p}`).trim()}`);
  }
  return `${parts.join('\n\n')}\n`;
}

export function run(argv, deps) {
  const { command, args, opts } = parseArgs(argv);
  for (const key of Object.keys(opts)) {
    if (ALLOWED[command] && !ALLOWED[command].includes(key)) fail(`${command} takes no --${key}`);
  }
  const extra = (n) => {
    if (args.length > n) fail(`${command} takes ${n === 0 ? 'no' : n} argument${n === 1 ? '' : 's'}, given: ${args.join(' ')}`);
  };
  switch (command) {
    case 'record': {
      extra(0);
      if (!opts['run-folder']) fail('record needs --run-folder <dir>');
      const repo = repoRoot(opts, deps);
      const runFolder = runFolderOf(opts, deps);
      return opts.from === undefined ? recordUntracked(repo, runFolder, deps) : carryRecord(repo, runFolder, opts.from, deps);
    }
    case 'claim': {
      if (!opts['run-folder']) fail('claim needs --run-folder <dir>');
      const repo = repoRoot(opts, deps);
      return claimFiles(repo, runFolderOf(opts, deps), args, deps);
    }
    case 'range': {
      extra(0);
      const repo = repoRoot(opts, deps);
      return `${listing(changeIn(repo, opts, deps))}\n`;
    }
    case 'name': {
      extra(1);
      return `${reportPath(args[0], opts, deps)}\n`;
    }
    case 'verify': {
      extra(0);
      const repo = repoRoot(opts, deps);
      const matched = matchCovered(changeIn(repo, opts, deps), opts.covered, repo, deps.isFile);
      return matched.length ? `${matched.join('\n')}\n` : 'none\n';
    }
    case 'prompt': {
      extra(1);
      return assemblePrompt(args[0], opts, deps);
    }
    case undefined:
      fail(`no command given\n\n${USAGE}`);
    default:
      fail(`unknown command ${command}\n\n${USAGE}`);
  }
}
