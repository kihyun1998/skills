import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CALLERS, RUNNERS, route } from './runners.mjs';

export class CheckItError extends Error {}

export class RunnerFailed extends CheckItError {
  exitCode = 4;
}

export class OutOfUsage extends RunnerFailed {
  exitCode = 3;
}

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
  proving: { file: 'reviewers/proving.md', findings: true, copy: 'reviewers/proving-copy.md' },
  pick: { file: 'reviewers/decision-model.md', confirm: false },
  'pick-confirm': { file: 'reviewers/decision-model.md', confirm: true },
};

const CONFIRM_SECTION = 'At the confirm stop';

export const REPORTS = [...Object.keys(REVIEWS), 'verify', 'findings', 'change', 'issue'];
const PER_CHILD = new Set(['pick-confirm', 'change', 'issue']);

const PROMPT_OPTIONS = ['repo', 'issue', 'issue-file', 'run-folder', 'ledger', 'findings', 'change'];

const ALLOWED = {
  record: ['repo', 'run-folder', 'from'],
  claim: ['repo', 'run-folder', 'take'],
  release: ['repo', 'run-folder'],
  range: ['repo', 'run-folder', 'paths'],
  name: ['repo', 'sheet', 'run-folder', 'child'],
  verify: ['repo', 'covered', 'run-folder'],
  prompt: PROMPT_OPTIONS,
  run: [...PROMPT_OPTIONS, 'sheet', 'child', 'caller', 'runner', 'model', 'effort'],
  open: ['sheet', 'run-folder'],
};

export const RECORD = 'check-it.untracked.json';
export const CLAIMS = 'check-it.claimed.json';

export const USAGE = `Usage: node check-it.mjs <command> [options]

  record --run-folder <dir> [--from <earlier dir>]
                                records the untracked files there now, with a hash of each one's
                                content, and the tracked files already modified, with a hash of each
                                one's diff against HEAD, in <dir>/${RECORD}; made once, when a run's first run folder
                                is made, before any change is written. With --from, a run started over
                                or moved keeps the earlier run folder's record instead: it is carried
                                into <dir>, with the earlier folder's claim where it holds one; where
                                the earlier folder holds no record, the record made lists no file, and
                                where that folder is not there, record stops
  claim --run-folder <dir> <path> ... [--take <path> ...]
                                takes each path as this run's, in <dir>/${CLAIMS}, where the run works
                                in the same tree as another run; it stops on a path a run folder named
                                *.made beside <dir> claims, one that differs only in case from a changed
                                one, a folder, or one <dir>'s record lists as there before the run
                                while it is still changed, which is the person's call; --take claims such a path once the person
                                has chosen to take its earlier change as this run's
  release --run-folder <dir> <path> ...
                                takes each path out of the claim in <dir> once its commit has landed;
                                it stops on a path still changed in the tree or not claimed there
  range [--run-folder <dir>] [--paths]
                                the files the diff touches: git diff HEAD plus every untracked file,
                                less those the run folder's record shows unchanged since it was made
                                (unless this run claimed them with --take), and less the files a claim
                                in a run folder named *.made beside <dir> names; with --paths, only
                                the change's paths, one per line, for git add -- $(...); it stops on a
                                path the shell or a git pathspec would not pass whole
  name <report> (--sheet <run sheet> | --run-folder <dir>) [--child <issue>]
                                where a report is saved; <report> is one of
                                ${REPORTS.join(', ')}
  verify --covered <file> ... [--run-folder <dir>]
                                the files the diff touches that a verify skill covers, or none
  prompt <review> --issue <issue> [--issue-file <file>] --run-folder <dir> --ledger <file> [--findings <report> ...] [--change <file>]
                                the prompt handed to Agent as it is, the change read as range reads it,
                                and the issue's text from --issue-file at its end where given;
                                <review> is one of
                                ${Object.keys(REVIEWS).join(', ')}
  run <review> --caller <product> --runner <runner> --model <model> [--effort <effort>] --issue <issue> [--issue-file <file>] --run-folder <dir> --ledger <file> [--findings <report> ...] [--change <file>] [--sheet <run sheet> [--child <issue>]]
                                runs the review as a headless process from the same prompt, saves its
                                report where name puts it (beside --sheet where given) and prints its
                                path and cost line; <product> is the one running check-it, one of
                                ${Object.keys(CALLERS).join(', ')}, and <runner> one of ${Object.keys(RUNNERS).join(', ')}. A model or effort the
                                runner's own listing does not name is refused before anything starts.
                                proving reproduces in a copy the script makes in <dir>/proving and
                                deletes after. Exit 3: the runner is out of usage; exit 4: it failed
                                otherwise; either way the review falls back where its row names
                                another product, and is not run where it names none
  open (--sheet <run sheet> | --run-folder <dir>)
                                opens the findings report, where name findings puts it, in the person's
                                default viewer for a Markdown file and returns once the viewer is started:
                                through ShellExecute (PowerShell) on Windows, open on macOS, xdg-open
                                elsewhere, the spawn hidden; it takes no path, refuses a network or device
                                path, and stops, saying why, where the report is not there or the viewer
                                did not start or did not finish within 30 s

  --repo <dir>                  the repository (default: the one the current folder is in)
`;

const FLAGS = new Set(['--paths']);
const VALUED = new Set(Object.values(ALLOWED).flat().map((key) => `--${key}`).filter((arg) => !FLAGS.has(arg)));
const REPEATED = new Set(['--covered', '--findings', '--take']);

export function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (FLAGS.has(arg)) {
      const key = arg.slice(2);
      if (key in opts) fail(`${arg} is given twice`);
      opts[key] = true;
    } else if (VALUED.has(arg)) {
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
  const tracked = 'tracked' in data ? data.tracked : {};
  if (tracked === null || typeof tracked !== 'object' || Array.isArray(tracked)) bad('its tracked files are not a list of diff hashes');
  madeFor(path, data.repo, repo);
  const hashesOf = (entries, what) => {
    const hashes = new Map();
    for (const [file, hash] of Object.entries(entries)) {
      if (!inRepo(file)) outside(path, file);
      if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) fail(`${path} gives ${shown(file)} something that is not ${what}`);
      hashes.set(file, hash);
    }
    return hashes;
  };
  return { path, hashes: hashesOf(data.untracked, 'a content hash'), tracked: hashesOf(tracked, 'a diff hash') };
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

export const diffHash = (repo, p, deps) => createHash('sha256')
  .update(deps.git(repo, ['diff', 'HEAD', '--binary', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', '--', `:(literal)${p}`]))
  .digest('hex');

const unchangedSince = (all, recorded, taken, now) => {
  const changed = [];
  const leftOut = [];
  for (const p of all) {
    const unchanged = recorded.has(p) && !taken.has(p) && now(p) === recorded.get(p);
    (unchanged ? leftOut : changed).push(p);
  }
  return { changed, leftOut };
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

const trackedNow = (repo, deps) => zsplit(deps.git(repo, ['diff', 'HEAD', '--name-only', '--no-renames', '-z']));

export function changedFiles(repo, deps, runFolder) {
  const allTracked = trackedNow(repo, deps);
  const all = untrackedNow(repo, deps);
  if (runFolder === undefined) return { tracked: allTracked, untracked: all };
  const record = readRecord(runFolder, repo, deps);
  const taken = ownClaim(runFolder, repo, deps)?.files ?? new Set();
  if (!record) return leaveOutTheirs(allTracked, all, othersClaims(runFolder, repo, deps));
  const t = unchangedSince(allTracked, record.tracked, taken, (p) => diffHash(repo, p, deps));
  const u = unchangedSince(all, record.hashes, taken, (p) => deps.hash(join(repo, p)));
  const scoped = leaveOutTheirs(t.changed, u.changed, othersClaims(runFolder, repo, deps));
  return { ...scoped, leftOut: u.leftOut, leftOutTracked: t.leftOut, record: record.path };
}

const repoPath = (repo, p) => {
  const n = normal(resolve(repo, p), repo);
  if (!inRepo(n) || isAbsolute(n)) fail(`${shown(p)} is a path outside the repository ${repo}`);
  return n;
};

const changedNow = (repo, deps) => {
  const { tracked, untracked } = changedFiles(repo, deps, undefined);
  return new Set([...tracked, ...untracked]);
};

const fileCount = (n) => `${n} file${n === 1 ? '' : 's'}`;

export function claimFiles(repo, runFolder, paths, take, deps) {
  if (!paths.length && !take.length) fail('claim needs each path it takes, from the repository\'s root');
  const asPath = (p) => {
    const n = repoPath(repo, p);
    if (deps.isDir(join(repo, n))) fail(`${shown(n)} is a folder: claim each file in it, since a claim matches a file by its whole path`);
    return n;
  };
  const plain = paths.map(asPath);
  const taking = take.map(asPath);
  const wanted = [...plain, ...taking];
  const record = readRecord(runFolder, repo, deps);
  const before = (p) => (record?.tracked.has(p) ? 'modified' : record?.hashes.has(p) ? 'untracked' : undefined);
  const claim = ownClaim(runFolder, repo, deps);
  const mine = claim?.files ?? new Set();
  const others = othersClaims(runFolder, repo, deps);
  const changed = changedNow(repo, deps);
  const byCase = new Map([...changed].map((p) => [p.toLowerCase(), p]));
  const earlier = (p) => (changed.has(p) ? before(p) : undefined);
  for (const p of taking) {
    if (!before(p)) fail(`${shown(p)} is not a file ${record ? record.path : `a record in ${runFolder}`} lists as there before the run, so --take does not apply: claim it without --take`);
  }
  for (const p of wanted) {
    if (mine.has(p)) continue;
    const kind = earlier(p);
    if (kind && !taking.includes(p)) {
      fail(`${shown(p)} was ${kind} before the run began, as ${record.path} records, so writing it is the person's call. Ask them: take its earlier change as this run's (then claim it with --take ${shown(p)}), leave that file alone, or stop the run`);
    }
    const other = others.find((o) => o.files.has(p));
    if (other) fail(`${shown(p)} is claimed by another run in the same tree, in ${other.path}: the two runs' files overlap, so going on is the person's call`);
    const twin = byCase.get(p.toLowerCase());
    if (twin !== undefined && twin !== p) fail(`${shown(p)} differs only in case from ${shown(twin)}, which is changed in the tree: claim it as git names it`);
  }
  const files = [...new Set([...mine, ...wanted])].sort();
  const path = join(runFolder, CLAIMS);
  deps.saveFile(path, claimText(repo, files));
  const added = [...new Set(wanted)].sort();
  return `claimed ${fileCount(added.length)} in ${path}: ${added.map(shown).join(', ')}\n`;
}

export function releaseFiles(repo, runFolder, paths, deps) {
  if (!paths.length) fail('release needs each path its commit took, from the repository\'s root');
  const claim = ownClaim(runFolder, repo, deps);
  if (!claim) fail(`the run folder ${runFolder} holds no claim, so there is nothing to release`);
  const changed = changedNow(repo, deps);
  const gone = new Set(paths.map((p) => {
    const n = repoPath(repo, p);
    if (!claim.files.has(n)) fail(`${shown(n)} is not claimed by this run, in ${claim.path}`);
    if (changed.has(n)) fail(`${shown(n)} is still changed in the tree: release a path once its commit has landed`);
    return n;
  }));
  deps.saveFile(claim.path, claimText(repo, [...claim.files].filter((f) => !gone.has(f)).sort()));
  const released = [...gone].sort();
  return `released ${fileCount(released.length)} from ${claim.path}: ${released.map(shown).join(', ')}\n`;
}

const changeIn = (repo, opts, deps) => changedFiles(repo, deps, opts['run-folder'] && runFolderOf(opts, deps));

const recordAt = (runFolder, deps) => {
  const path = join(runFolder, RECORD);
  if (deps.exists(path)) fail(`the run folder already holds a record at ${path}; it is made once, when the run's first run folder is made, before any change is written`);
  return path;
};

const claimText = (repo, files) => `${JSON.stringify({ repo, files }, null, 2)}\n`;

const recordText = (repo, untracked, tracked) => `${JSON.stringify({ repo, untracked: Object.fromEntries(untracked), tracked: Object.fromEntries(tracked) }, null, 2)}\n`;

const untrackedFiles = (n) => `${n} untracked file${n === 1 ? '' : 's'}`;

const trackedFiles = (n) => `${n} tracked file${n === 1 ? '' : 's'} modified before the run`;

export function carryRecord(repo, runFolder, from, deps) {
  const earlier = resolve(deps.cwd, from);
  if (!deps.isDir(earlier)) fail(`the earlier run folder ${earlier} is not a folder: give the run folder the earlier attempt used, since the step after this one deletes it`);
  const same = deps.realPath(earlier) === deps.realPath(runFolder);
  if (same) {
    const kept = readRecord(runFolder, repo, deps);
    if (kept) return `kept the record ${kept.path}\n`;
  }
  const path = recordAt(runFolder, deps);
  const source = same ? undefined : earlier;
  const record = source && readRecord(source, repo, deps);
  const claim = source && ownClaim(source, repo, deps);
  const claimed = join(runFolder, CLAIMS);
  if (claim && deps.exists(claimed)) fail(`the run folder already holds a claim at ${claimed}, so the earlier run folder's claim is not carried over it`);
  deps.writeFile(path, recordText(repo, record ? record.hashes : [], record ? record.tracked : []));
  const lines = [record
    ? `carried the record of ${untrackedFiles(record.hashes.size)} and ${trackedFiles(record.tracked.size)} from ${record.path} into ${path}`
    : `recorded no file, since there is no record at ${join(source ?? runFolder, RECORD)}: every changed file is listed`];
  if (claim) {
    deps.writeFile(claimed, claimText(repo, [...claim.files].sort()));
    lines.push(`carried the claim of ${fileCount(claim.files.size)} from ${claim.path} into ${claimed}`);
  }
  return `${lines.join('\n')}\n`;
}

export function recordStart(repo, runFolder, deps) {
  const path = recordAt(runFolder, deps);
  const tracked = new Map(trackedNow(repo, deps).map((p) => [p, diffHash(repo, p, deps)]));
  const untracked = new Map();
  const skipped = [];
  for (const p of untrackedNow(repo, deps)) {
    const hash = deps.hash(join(repo, p));
    if (hash === null) skipped.push(p);
    else untracked.set(p, hash);
  }
  deps.writeFile(path, recordText(repo, untracked, tracked));
  const lines = [`recorded ${untrackedFiles(untracked.size)} and ${trackedFiles(tracked.size)} in ${path}`];
  if (skipped.length) lines.push(`not recorded, since it could not be read as a file or a link, so always listed: ${skipped.map(shown).join(', ')}`);
  return `${lines.join('\n')}\n`;
}

const leftOutAny = ({ leftOut = [], leftOutTracked = [], theirs = [] }) => leftOut.length + leftOutTracked.length + theirs.length > 0;

const notEmpty = ({ tracked, untracked, leftOut = [], leftOutTracked = [], record, theirs = [] }) => {
  if (tracked.length + untracked.length > 0) return;
  if (theirs.length) fail('the diff is empty: every changed file is left out, as claimed by another run in the same tree');
  if (leftOut.length + leftOutTracked.length) {
    const n = leftOut.length + leftOutTracked.length;
    const quiet = [...(leftOutTracked.length ? [] : ['git diff HEAD']), ...(leftOut.length ? [] : ['git ls-files --others --exclude-standard'])];
    const lists = [
      ...(leftOutTracked.length ? [`the ${trackedFiles(leftOutTracked.length)} git diff HEAD lists`] : []),
      ...(leftOut.length ? [`the ${untrackedFiles(leftOut.length)} git ls-files --others --exclude-standard lists`] : []),
    ];
    fail(`the diff is empty: ${quiet.map((q) => `${q} prints nothing, and `).join('')}${lists.join(' and ')} ${n === 1 ? 'is' : 'are'} left out as unchanged since ${record} was made`);
  }
  fail('the diff is empty: git diff HEAD and git ls-files --others --exclude-standard print nothing');
};

const UNSAFE = /[\s\u0000-\u001f\u007f*?[\\]|^:/;

export function pathsOnly(files) {
  notEmpty(files);
  const paths = [...files.tracked, ...files.untracked];
  const bad = paths.filter((p) => UNSAFE.test(p));
  if (bad.length) fail(`${bad.map(shown).join(', ')} would not pass whole through the shell's word splitting or a git pathspec, so --paths prints none: name the change's files from range's listing, each quoted, to git --literal-pathspecs add and commit`);
  return `${paths.join('\n')}\n`;
}

export function listing(files) {
  notEmpty(files);
  const { tracked, untracked, leftOut = [], leftOutTracked = [], record, theirs = [] } = files;
  const lines = [
    ...tracked.map((p) => `- ${shown(p)}`),
    ...untracked.map((p) => `- ${shown(p)} (untracked)`),
  ];
  if (leftOutTracked.length) {
    lines.push('', `Left out: modified before the run began, its diff against HEAD unchanged since, as ${record} records:`, ...leftOutTracked.map((p) => `- ${shown(p)}`));
  }
  if (leftOut.length) {
    lines.push('', `Left out: untracked before the run began and unchanged since, as ${record} records:`, ...leftOut.map((p) => `- ${shown(p)}`));
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

export function assemblePrompt(review, opts, deps, copy) {
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
  const issueFile = opts['issue-file'] && resolve(deps.cwd, opts['issue-file']);
  const issueText = issueFile && read(deps, issueFile, `the issue file ${issueFile}`).trim();
  const values = {
    skills: deps.skills,
    repo,
    issue: opts.issue,
    issue_text: issueFile
      ? `at the end of this prompt, as the caller wrote it from the tracker into \`${issueFile}\`: its body and its decision comments. Read the tracker only for what it links to`
      : 'not given: read the issue from the tracker',
    run_folder: runFolder,
    ledger: resolve(deps.cwd, opts.ledger),
    change,
    ...(skillDir && { skill_dir: skillDir }),
    ...(copy && { copy_folder: copy.folder, copy_tree: copy.tree }),
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
  if (copy) parts.push(part(spec.copy));
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
  if (issueFile) parts.push(`# The issue's text\n\n${issueText}`);
  return `${parts.join('\n\n')}\n`;
}

const count = (n) => n.toLocaleString('en-US');

function checkModel(runner, located, review, opts, repo, deps, failed) {
  const { args, read: readList, timeoutMs } = runner.models;
  const r = deps.spawn(located.command, [...located.args, ...args], { cwd: repo, input: '', timeout: timeoutMs });
  const models = r.error || r.status !== 0 ? undefined : readList(r.stdout ?? '');
  if (!models) {
    const why = r.error?.message ?? (r.status !== 0 ? `exit ${r.status}: ${(r.stderr ?? '').trim().slice(-500) || 'it said nothing'}` : 'what it printed is not a model catalog');
    failed(`${runner.name} could not list its models with ${args.join(' ')} (${why}), so ${review} did not run on ${runner.name}`);
  }
  const efforts = models.get(opts.model);
  const notPut = `so ${review} was not started, and no other is put in its place`;
  if (!efforts) fail(`${runner.name} lists no model named ${opts.model}, ${notPut}; it lists ${[...models.keys()].join(', ')}`);
  if (opts.effort !== undefined && !efforts.includes(opts.effort)) fail(`${runner.name}'s ${opts.model} takes no effort ${opts.effort}, ${notPut}; it takes ${efforts.join(', ') || 'none'}`);
}

const sizeText = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)}K` : `${(bytes / 1024 ** 2).toFixed(1)}M`);

function fillCopy(repo, { folder, tree }, ledger, deps) {
  deps.appendFile(ledger, `${folder} | check-it run proving | copy | step end\n`);
  deps.makeDir(tree);
  for (const p of zsplit(deps.git(repo, ['ls-files', '-co', '--exclude-standard', '-z']))) deps.copyEntry(join(repo, p), join(tree, p));
}

function removeCopy(folder, ledger, deps) {
  try {
    const bytes = deps.removeTree(folder);
    deps.appendFile(ledger, `${folder} | deleted, ${sizeText(bytes)}\n`);
    return '';
  } catch (err) {
    return ` Its copy ${folder} could not be deleted (${err.message}), so delete it as its line in the ledger says.`;
  }
}

export function runReview(review, opts, deps) {
  if (!opts.runner) fail(`run ${review ?? ''} needs --runner <runner>, one of ${Object.keys(RUNNERS).join(', ')}`);
  if (!opts.model) fail(`run ${review ?? ''} needs --model <model>, the runner's model from check-it's table`);
  if (!opts.caller) fail(`run ${review ?? ''} needs --caller <product>, the product running check-it, one of ${Object.keys(CALLERS).join(', ')}`);
  const { runner, fallBack, refused } = route(review, opts.caller, opts.runner);
  if (refused) fail(refused);
  const spec = REVIEWS[review];
  const repo = repoRoot(opts, deps);
  const copy = spec?.copy && { folder: join(runFolderOf(opts, deps), 'proving') };
  if (copy) copy.tree = join(copy.folder, 'tree');
  const prompt = assemblePrompt(review, opts, deps, copy);
  const ledger = resolve(deps.cwd, opts.ledger);
  const where = opts.sheet ? { sheet: opts.sheet } : { 'run-folder': opts['run-folder'] };
  const report = reportPath(review, opts.child === undefined ? where : { ...where, child: opts.child }, deps);
  const part = `${report}.part`;
  let left = '';
  const failed = (why) => {
    deps.removeFile(part);
    throw new RunnerFailed(`${why}. ${fallBack}${left && `.${left}`}`);
  };
  const located = deps.locate(opts.runner);
  if (!located) failed(`${opts.runner} is not on PATH, so ${review} did not run on ${runner.name}`);
  checkModel(runner, located, review, opts, repo, deps, failed);
  deps.removeFile(part);
  const hook = runner.hook?.({ node: deps.node, skills: deps.skills });
  if (runner.hook && hook === undefined) failed(`${runner.name} runs its hook command through a shell that a quoted path breaks, and the path of ${deps.node} or of the skills folder ${deps.skills} would need quotes, so ${review} did not run on ${runner.name}`);
  if (copy && !deps.makeFolder(copy.folder)) fail(`${copy.folder} is already there, made by another proving run or left by one that did not end; run proving again once that run has ended, or delete the folder as its line in the ledger says`);
  const start = deps.now();
  let r;
  try {
    if (copy) fillCopy(repo, copy, ledger, deps);
    r = deps.spawn(located.command, [...located.args, ...runner.args({ model: opts.model, effort: opts.effort, tree: repo, report: part, hook, writable: copy?.folder })], { cwd: repo, input: prompt, timeout: runner.timeoutMs });
  } finally {
    if (copy) left = removeCopy(copy.folder, ledger, deps);
  }
  const seconds = Math.round((deps.now() - start) / 1000);
  if (r.error?.code === 'ETIMEDOUT') failed(`${runner.name} did not finish ${review} in ${runner.timeoutMs / 60000} min, so it was stopped`);
  if (r.error) failed(`${runner.name} could not be started as ${located.command}: ${r.error.message}`);
  const { usage, errors } = runner.read(r.stdout ?? '');
  const text = deps.isFile(part) ? deps.readFile(part) : '';
  if (r.status !== 0 || text.trim() === '') {
    const said = [...errors, (r.stderr ?? '').trim()].filter((s) => s !== '');
    const spent = said.find((s) => runner.outOfUsage(s));
    if (spent !== undefined) {
      deps.removeFile(part);
      throw new OutOfUsage(`${runner.name} is out of usage: ${spent}. ${fallBack}${left && `.${left}`}`);
    }
    const last = errors.at(-1) ?? (r.stderr ?? '').trim().slice(-2000);
    if (r.status !== 0) failed(`${runner.name} failed on ${review}, exit ${r.status}: ${last || 'it said nothing'}`);
    failed(`${runner.name} exited 0 on ${review} but wrote no report at ${part}`);
  }
  if (!usage) failed(`${runner.name} printed no turn.completed event on ${review}, so its cost is unknown and the run did not finish`);
  deps.moveFile(part, report);
  return `report: ${report}\ncost: ${review} on ${runner.name} ${opts.model}${opts.effort === undefined ? '' : ` ${opts.effort}`}: ${seconds} s, ${count(usage.input)} input tokens (${count(usage.cached)} cached), ${count(usage.output)} output tokens\n${left && `left: ${left.trim()}\n`}`;
}

const SHELL_OPEN = [
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;',
  'try { [void][System.Diagnostics.Process]::Start((New-Object System.Diagnostics.ProcessStartInfo -Property @{ FileName = $env:CHECK_IT_OPEN; UseShellExecute = $true })) }',
  'catch { $e = $_.Exception; if ($e.InnerException) { $e = $e.InnerException }; [Console]::Error.WriteLine($e.Message); exit 1 }',
].join(' ');

export function opener(platform, path) {
  if (platform === 'win32') return { command: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-Command', SHELL_OPEN], env: { CHECK_IT_OPEN: path } };
  return { command: platform === 'darwin' ? 'open' : 'xdg-open', args: [path], env: {} };
}

export const OPEN_TIMEOUT_MS = 30 * 1000;

const UNC = /^[\\/]{2}/;

export function openReport(opts, deps) {
  for (const given of [opts.sheet, opts['run-folder']].filter((v) => v !== undefined)) {
    const where = resolve(deps.cwd, given);
    if (UNC.test(given) || UNC.test(where)) fail(`could not open ${where}: a network or device path is not opened`);
  }
  const path = reportPath('findings', opts, deps);
  const refuse = (why) => fail(`could not open ${path}: ${why}`);
  if (!deps.isFile(path)) refuse('it is not a file');
  const { command, args, env } = opener(deps.platform, path);
  const r = deps.launch(command, args, { env, timeout: OPEN_TIMEOUT_MS });
  if (r.error?.code === 'ETIMEDOUT') refuse(`${command} did not finish within ${OPEN_TIMEOUT_MS / 1000} s`);
  if (r.error) refuse(`${command} did not start: ${r.error.message}`);
  if (r.status === null) refuse(`${command} did not finish, stopped by ${r.signal}`);
  if (r.status !== 0) refuse(`${command} exited ${r.status}: ${(r.stderr || r.stdout || '').trim()}`);
  return `opened ${path}\n`;
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
      return opts.from === undefined ? recordStart(repo, runFolder, deps) : carryRecord(repo, runFolder, opts.from, deps);
    }
    case 'claim':
    case 'release': {
      if (!opts['run-folder']) fail(`${command} needs --run-folder <dir>`);
      const repo = repoRoot(opts, deps);
      const runFolder = runFolderOf(opts, deps);
      return command === 'claim' ? claimFiles(repo, runFolder, args, opts.take ?? [], deps) : releaseFiles(repo, runFolder, args, deps);
    }
    case 'range': {
      extra(0);
      const repo = repoRoot(opts, deps);
      const files = changeIn(repo, opts, deps);
      return opts.paths ? pathsOnly(files) : `${listing(files)}\n`;
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
    case 'run': {
      extra(1);
      return runReview(args[0], opts, deps);
    }
    case 'open': {
      if (args.length > 0) fail(`open takes no argument, given: ${args.join(' ')}`);
      return openReport(opts, deps);
    }
    case undefined:
      fail(`no command given\n\n${USAGE}`);
    default:
      fail(`unknown command ${command}\n\n${USAGE}`);
  }
}
