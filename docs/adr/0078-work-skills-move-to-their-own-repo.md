# ADR-0078 — Work skills move to their own repo

**Status:** accepted.

Everything that exists only because of the company NIT tracker leaves this
catalog for `kihyun-work-skills`:

- skills: `nit`, `unregistered-archives`
- retired skills: `to-external-issue`, `weekly-digest`, `unexported-archives`
- the `nit` CLI contracts: `docs/nit/`, `docs/agents/nit-update.md`
- records: 0004, 0006, 0007, 0008, 0009, 0010, 0011, 0012, 0013, 0014, 0015,
  0017, 0021, 0023, 0043, 0044, and the vacated 0016, 0018, 0020, 0022, 0024,
  0025 that live inside 0043 and 0044
- `CONTEXT.md`'s vocabulary for them: External issue, Export, Registration,
  Disposition, the nit CLI contracts, and the five `/nit` subcommand sections

## The criterion is the audience, not the method

This catalog is the maintainer's personal toolkit. The NIT skills serve one
employer's intranet tracker and nothing else, and they carry that employer's
project keys, CLI release notes and worklog format. The method skills —
`thegraph` and its siblings, the review and verification passes, the map — are
used at work too, but nothing in them names the company. So the line is drawn at
**what names the company**, not at **what gets used at work**. The method skills
stay here, and the work repo calls them as externals.

## Numbers are kept, not renumbered

The moved records keep their numbers in the new repo, and those numbers are never
reused here. Commit messages, skill prose and consuming repos' `nit-issue.md`
markers cite them by number, and a renumbering would break every one of those
citations without any sign that it had.

## History moves with the files

The new repo was cut with `git filter-repo` from a clone of this one, filtered to
every path the moved files ever held (`to-nit/`, `to-nit-weekly-job/`,
`nit-wiki-*`, the top-level retirees, `docs/nit/`'s flat-file era). `git log`
there answers what it answered here. This repo's own history is **not**
rewritten: it is private, and a force-push to a published `main` costs more than
the old blobs are worth.

## Consequences

- Prose here that still names `nit` or `unregistered-archives` resolves through
  two declared-external rows in `docs/agents/skill-dependencies.md`. Nothing here
  invokes either one.
- ADR-0027 gains a banner, and its link to ADR-0021 now points into the new repo.
- The `*.tgz` and `temp/` ignores went with the skills that produced those files.
