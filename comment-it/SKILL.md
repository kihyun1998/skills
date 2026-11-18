---
name: comment-it
description: "Judge the comments and lint suppressions in a scope against the repository's comment rule, and report each one that breaks it. Use when `check-it` measures a code change, or with a path to survey the comments already there."
context: fork
background: false
---

# comment-it — judge comments against the repository's rule

**This runs in a fresh agent, not in the session that wrote the code**, as
`lens` does. Everything it reads arrives in the argument: the repository's root
and the scope. **Edit nothing and write no file**; the report is the whole
result, returned as the final message. The caller deletes, fixes and carries.

## The scope

- **A diff** — what `check-it` passes: `git diff HEAD` plus every untracked
  file, or a commit range. Only comments and suppressions the diff adds or
  changes are read; old ones are left for a run over a path.
- **A path** — what a person passes to survey what is already there: a file, a
  directory, or the whole repository. Every comment in it is read.

Where the argument names neither, say so first and stop.

## The rule comes from the repository, never from here

Read the repository's comment rule from its `CLAUDE.md`, or from `AGENTS.md`
where that is the only guidance file. This skill holds no copy of the list;
judge against what that file says today.

- **Contributor mode** — a `CLAUDE.local.md` comment rule that defers to the
  upstream repository's own guidance: **do not run.** Report *"contributor
  mode: comments follow upstream; not run"* and nothing else.
- **No comment rule** in either file: **judge nothing and flag nothing for
  deletion.** Report that the rule is missing and that `grill-the-graph` writes
  it.

## What is judged

**The kinds a comment may be are the rule's list**; sort each comment in scope
against it. Recognising a license header, a doc comment or a tool directive
needs no more than its form, where the rule lists that form; a doc comment on a
private item is not on a public API. Two kinds need judging:

- **A claim of an outside cause** — behaviour forced by a dependency, platform,
  vendor or protocol the repository cannot reshape, Rust's `SAFETY:` on
  `unsafe` included: kept **only once the cause is shown true today on a live
  path.** Read the nearby code; where the claim is not obvious there, trace the
  named symbol or call. A surprise in this repository's own code is not an
  outside cause, and naming a dependency proves nothing.
- **An issue or RFC link** passes where it explains a constraint the code cannot
  express; a link beside an explanation of our own code does not carry it.

A comment the list does not allow is outside it.
**When unsure whether a comment is on the list, it is outside it.** *Important*,
*do not remove*, *for now*, *too risky* and a long justification are leads to
read, not proof; a long justification with no proven outside cause is a finding.

For each finding, say what its content is, since that decides where it goes:

| The comment | Where it goes |
|---|---|
| says what the code is; commented-out code | deleted; nothing moves |
| a to-do, a *for now* | deleted; the work it names is done in this change or carried as an item |
| explains a workaround or a surprise in this repository's code | the code is fixed; nothing is kept. Name the exact symbol whose rename, extraction, type or redesign would make it obvious |
| a constraint on our own code — *do not remove*, *talk to X first* | deleted, and raised as a check candidate |
| a measured value, a design reason, history | where the rule's destination sentence sends it: the map, the records, or the commit message |

**Lint suppressions** in scope — an `// ignore:`, `eslint-disable`,
`#[allow(...)]`, `@ts-expect-error`, `# noqa` and their kind: kept only where
the rule it silences is wrong here, pedantic, or style only. A suppression of a
correctness or safety rule is a finding, whatever reason sits beside it; look
the rule up before judging, and name the symbol it was silencing. The per-site
suppressions a new check adds at its existing violations, each with its reason,
are that check's baseline (`encode-it`), not findings: count them in one line.

## The report

One line per finding: `file:line`, the comment or suppression quoted, which of
**outside the list**, **outside cause not shown** or **suppression of a
correctness or safety rule**, and where it goes from the table. Cite by re-opening the source.
Then one line naming the rule read (its file and the destination sentence) and
the scope. A scope with nothing to flag is reported as clean; that is a result.
