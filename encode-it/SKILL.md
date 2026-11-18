---
name: encode-it
requires: [firsthand]
description: "Turn a repeated correction into a check at the highest level that works. Use when the change being made adds a check, or to find repeated mistakes in a repository's history."
---

# encode-it — turn a repeated correction into a check

A correction a person has made twice will be made a third time. A check makes
the mistake fail where it is written, with a message that says what to do
instead; a prose rule only asks.

Two ways in:

- **`make-it` calls it** when the change being worked adds a check. The
  correction is the issue; go to [Pick the level](#pick-the-level).
- **A person runs it directly** with a scope, to find the repeated mistakes in a
  repository. Start at [A direct run](#a-direct-run).

A repeated correction you notice while doing other work is not built here. Carry
it to `ask-it` as a candidate; a check is built only once a person has kept it
and it is an issue. A repository you contribute to rather than own is out of
scope (ADR-0079).

## A direct run

**Scope.** The run takes one of: a path, a commit range, or a one-sentence
correction. It narrows what is read; with none, the whole repository is in scope.

**Finding classes.** A class is found from:

- closed issue titles (`gh issue list --state closed --limit <all of them>`;
  the default lists 30): the same fix recurring under different titles;
- the rules in instruction files (`CLAUDE.md`, `AGENTS.md`,
  `docs/agents/thegraph.md`) and map notes' traps and invariants
  (`docs/map/`): for each rule, whether today's code breaks it and whether
  anything enforces it.

**Measuring spread.** Suppression clusters, workaround and constraint comments,
and one job done two ways are read only to measure how far a found class has
spread, which is the cleanup list. They never found a class.

Commits are read only to locate the past mistake for the
[proof](#proof), by issue number (`git log --grep "#<n>"`). Session transcripts
are not a source. **Twice counts as repeated**: a class needs two occurrences,
each with an issue, a file line or a comment you can cite.

**Show before building.** For each class, show:

- the class in one line, and its occurrences with their evidence;
- the level you recommend, and why each higher level does not work;
- the message the check would print.

Then ask the person which classes to build. Build only those, **one commit
each**, each through the rest of this skill.

## Pick the level

Take the highest level that works, in this order:

1. **Structure**: remove the possibility (delete the API, move the file behind a
   boundary the build enforces, make the wrong call unreachable).
2. **Types**: make the wrong form fail to compile.
3. **A lint or CI check** whose error names the fix.
4. **A behaviour test.**
5. **Prose** (`CLAUDE.md`, a map note): only for what needs judgement.

The report says why each level above the chosen one did not work. Read the
tool's documentation raw before writing its configuration (`firsthand`):
option names, versions and defaults are facts, not memory.

### Routes per language

Leads, read before use:

- **Rust**: `clippy.toml` `disallowed-methods` / `disallowed-types` with a
  `reason`, which clippy prints at the use site.
- **TypeScript**: ESLint built-ins `no-restricted-imports`,
  `no-restricted-syntax` (AST selectors), `no-restricted-properties`, each
  with a message.
- **Go**: golangci-lint's configuration.
- **Dart**: the official analyzer plugin (`analysis_server_plugin`), as one
  shared package holding a generic *this API is banned, print this message*
  rule, each repository supplying only its list. `custom_lint` is no longer
  developed; do not start on it. **The shared package does not exist yet**: its
  name and home are the maintainer's, so ask before creating it. A rule only one
  repository needs stays in that repository until a second one needs it, then
  moves to the package. Not verified yet: that a plugin can read a
  per-repository list, and that each target package's SDK floor allows 3.10.

## The message

The error names what to use instead (a symbol, a file, a path) and gives the
reason in one line. A bare link is not a message.

> `std::thread::sleep` is banned here: the core never blocks; return a
> `Timeout` event and let the adapter wait.

## Where the pattern is already common

Fail only new occurrences:

- **ESLint**: bulk suppressions (`eslint-suppressions.json`).
- **golangci-lint**: `new-from-merge-base`.
- **Rust and Dart** have no baseline. Fix a few existing sites in the same
  change; where there are many, give each a per-site suppression with a reason.
  That list is the cleanup list.

## Exceptions

Every suppression carries a reason, enforced where the tool can: clippy
`allow_attributes_without_reason`, `eslint-comments/require-description`,
golangci-lint `nolintlint` `require-explanation`. Dart has none found; write
the reason anyway. Exceptions carry no expiry date.

## Proof

A check is done when it **fails on the past mistake**, printing its message, and
**passes on the fix**:

- check out the commit that made the mistake (found by its issue number), or
  replay its diff on today's code, and run the check: it goes red with the
  message;
- run it on the fix: green.

Where the mistake cannot be replayed, a minimal reproduction stands in, and the
report says so. Local and CI run the same command. Where the repository has CI,
the check runs there; where it has none, add the command to the gate list its
guidance names, which is what `check-it` runs.

## Delete the rule it replaces

The prose rule the check replaces (a `CLAUDE.md` line, a
`docs/agents/thegraph.md` line, a map note's trap) is deleted in the same
change. Keep no table pairing rules with their enforcers: the lint configuration
is that list, and what stays in `CLAUDE.md` is judgement.

## The comment check

The mechanical part of a repository's comment rule is a check like any other,
built once a person picks it. A small language-independent script reads the
comments a diff adds and passes only those it can recognise:

- doc comments, and a license header at the top of a file, by position;
- tool directives, by their known prefixes;
- links, by a URL or an issue number;
- behaviour forced from outside, by a marker (`EXTERNAL:`, and Rust's
  `SAFETY:` on `unsafe`).

Any other new comment fails with: fix the code, or mark it if an outside
constraint forces it. It runs where every other check runs. Whether a marker is
honest is judgement, and the script does not make it. Show the marker word and
the script to the person before installing it.
