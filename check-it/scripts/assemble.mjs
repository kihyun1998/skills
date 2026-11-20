import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
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
  lens: { skill: 'lens', file: 'reviewers/lens.md' },
  comments: { skill: 'comment-it', file: 'reviewers/comment-it.md' },
  proving: { file: 'reviewers/proving.md', findings: true },
  pick: { file: 'reviewers/decision-model.md' },
  'pick-confirm': { file: 'reviewers/decision-model.md', confirm: true },
};

export const REPORTS = [...Object.keys(REVIEWS), 'verify', 'findings', 'change'];
const PER_CHILD = new Set(['pick-confirm', 'change']);

const ALLOWED = {
  range: ['repo'],
  name: ['repo', 'sheet', 'run-folder', 'child'],
  verify: ['repo', 'covered'],
  prompt: ['repo', 'issue', 'run-folder', 'ledger', 'findings', 'change'],
};

export const USAGE = `Usage: node check-it.mjs <command> [options]

  range                         the files the diff touches: git diff HEAD plus every untracked file
  name <report> (--sheet <run sheet> | --run-folder <dir>) [--child <issue>]
                                where a report is saved; <report> is one of
                                ${REPORTS.join(', ')}
  verify --covered <file> ...   the files the diff touches that a verify skill covers, or none
  prompt <review> --issue <issue> --run-folder <dir> --ledger <file> [--findings <report> ...] [--change <file>]
                                the prompt handed to Agent as it is; <review> is one of
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

export function changedFiles(repo, deps) {
  const tracked = zsplit(deps.git(repo, ['diff', 'HEAD', '--name-only', '--no-renames', '-z']));
  const untracked = zsplit(deps.git(repo, ['ls-files', '--others', '--exclude-standard', '-z']));
  return { tracked, untracked };
}

const shown = (path) => (/[\u0000-\u001f\u007f`]/.test(path) ? JSON.stringify(path) : `\`${path}\``);

export function listing({ tracked, untracked }) {
  if (tracked.length + untracked.length === 0) {
    fail('the diff is empty: git diff HEAD and git ls-files --others --exclude-standard print nothing');
  }
  return [
    ...tracked.map((p) => `- ${shown(p)}`),
    ...untracked.map((p) => `- ${shown(p)} (untracked)`),
  ].join('\n');
}

export function reportPath(name, opts) {
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
  if (runFolder) {
    const dir = resolve(opts.cwd, runFolder);
    if (!opts.isDir(dir)) fail(`the run folder ${dir} is not a folder`);
    return join(dir, `check-it.${name}.md`);
  }
  if (!/\.md$/i.test(opts.sheet)) fail(`the run sheet ${opts.sheet} does not end in .md`);
  return `${resolve(opts.cwd, opts.sheet).slice(0, -3)}${child}.${name}.md`;
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

export function assemblePrompt(review, opts, deps) {
  const spec = REVIEWS[review];
  if (!spec) fail(`no review named ${review ?? '(none)'}; one of ${Object.keys(REVIEWS).join(', ')}`);
  for (const key of ['issue', 'run-folder', 'ledger']) if (!opts[key]) fail(`prompt ${review} needs --${key}`);
  if (spec.findings && !opts.findings?.length) fail(`prompt ${review} needs --findings <report> for each report whose findings it proves`);
  if (!spec.findings && opts.findings) fail(`--findings applies only to proving`);
  if (spec.confirm && !opts.change) fail(`prompt ${review} needs --change <file> holding the issue and the two statements`);
  if (!spec.confirm && opts.change) fail(`--change applies only to pick-confirm`);

  const repo = repoRoot(opts, deps);
  const runFolder = resolve(deps.cwd, opts['run-folder']);
  if (!deps.isDir(runFolder)) fail(`the run folder ${runFolder} is not a folder`);
  const checkIt = join(deps.skills, 'check-it');
  const change = spec.confirm
    ? 'not written yet. The issue and the two statements of what it is and what it will do stand in its place, at the end of this prompt.'
    : `\`git diff HEAD\` in the repository, plus every untracked file, so a new file is in it. The files it touches:\n\n${listing(changedFiles(repo, deps))}`;
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
    return fill(piece(ownPart(read(deps, path, path).trim()).trim(), path), values, path);
  };

  const parts = [part('reviewers/brief.md')];
  if (spec.skill) {
    const path = join(skillDir, 'SKILL.md');
    parts.push(`# Your method: the body of ${path}, below its frontmatter\n\n${piece(skillBody(read(deps, path, path), path), `the body of ${path}`)}`);
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
    parts.push(`# The planned change: the issue and the two statements\n\n${read(deps, p, `the planned change ${p}`).trim()}`);
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
    case 'range': {
      extra(0);
      return `${listing(changedFiles(repoRoot(opts, deps), deps))}\n`;
    }
    case 'name': {
      extra(1);
      return `${reportPath(args[0], { ...opts, cwd: deps.cwd, isDir: deps.isDir })}\n`;
    }
    case 'verify': {
      extra(0);
      const repo = repoRoot(opts, deps);
      const matched = matchCovered(changedFiles(repo, deps), opts.covered, repo, deps.isFile);
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
