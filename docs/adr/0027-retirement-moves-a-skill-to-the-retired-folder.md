# Retirement moves a skill to `retired/`, and five skills move there now

> **Amended by [ADR-0078](0078-work-skills-move-to-their-own-repo.md).** The
> three ADR-0021 skills below, and ADR-0021 itself, now live in
> `kihyun-work-skills`'s `retired/` and `docs/adr/`. The rule this record sets is
> unchanged; only where those three sit moved.

[ADR-0019](0019-theflow-is-frozen-thegraph-inherits-by-copy.md) froze `theflow`
and left retirement as *"the maintainer's call, made by feel after use."* This is
that call. `theflow` and its setup half `grill-the-flow` move to
[`retired/`](../../retired/) and are no longer installed.

`grill-the-flow` goes with it and not separately. It exists only to author the
bindings `theflow` reads, and it reads `theflow`'s own schema at runtime to know
what to ask. Retiring one and keeping the other would leave a builder for a
method nobody runs.

## `retired/` is a mechanism, not a label

The install scripts scan **top-level** directories for a `SKILL.md` — `for dir in
"$repo_root"/*/` in the shell script, `Get-ChildItem -Directory` in the
PowerShell one — and prune any link they own whose `<name>/SKILL.md` no longer
exists. So moving a folder into `retired/` removes the skill *and* cleans up its
link on the next run, with **no list to edit in either script**.

That is why the folder is the mechanism. An uninstall expressed as an exclusion
list is a second place to forget; an uninstall expressed as a move cannot
disagree with itself.

## The three ADR-0021 skills move too

[ADR-0021](https://github.com/kihyun1998/kihyun-work-skills/blob/main/docs/adr/0021-the-paste-file-pipeline-is-retired.md) declared
`to-external-issue`, `weekly-digest`, and `unexported-archives` retired — *"not
maintained, not extended, not the answer to any question the repo still asks"* —
and they stayed installed at the top level for the whole time since. That is the
exact state ADR-0021 opened by naming as the defect:

> **An undeclared retirement is indistinguishable from a live skill.**

A *declared* retirement that is still installed is barely better: it is
indistinguishable at the point of use, which is where it matters. Two of the
three no longer have an input at all — `weekly-digest` read the archive
`to-external-issue` wrote, and `unexported-archives` differenced against exports
nothing produces — so they are not merely unmaintained, they cannot run.

They move here with the other two. Making the declaration and the removal the
same act is the point: ADR-0021's gap was that a retirement needed a second,
separate step nobody was holding, and a folder move leaves no such step.

## What retirement does not touch

`grill-the-flow` wrote `docs/agents/theflow.md` into every repository it
onboarded, and those bindings docs are **live input**, not residue:
`grill-the-graph`'s primary path compiles one into a graph rather than
re-interrogating from scratch, which is what makes adopting `thegraph` a compile
instead of a migration. Retiring the pair retires the skills, not what they
produced. A repository that has not yet been built into a graph loses nothing it
needs — its bindings doc is exactly what the successor wants.

> **Amended by [ADR-0034](0034-bindings-are-spent-at-the-first-build.md).** The
> paragraph above is true only for a repository that has **not** been built into a
> graph. The compile is what *consumes* the bindings, so a repository already
> holding `docs/agents/thegraph.md` has spent them — nothing reads them, nothing
> maintains them, and stating it unconditionally sent this session's own advice
> the wrong way on a live repo.

The skills stay readable in the repo for the same reason: someone reading a
`docs/agents/theflow.md` needs to be able to read the skill that specified it.

## Consequences

- **Two still-installed skills now point into `retired/`.** `checkup` names
  `retired/theflow/SKILL.md` § *Bindings the skill expects* as the schema a
  bindings doc is checked against, and `unregistered-archives` names
  `retired/unexported-archives/SKILL.md` as the counterpart whose question it
  supersedes. Every other cross-reference is between skills that moved together,
  so those relative paths still resolve unchanged.
- **All five slash commands stop resolving after the next install run.** A
  repository still on the seven-step method invokes nothing; the move is what
  makes that visible rather than leaving a frozen method quietly reachable. For
  the ADR-0021 three this changes little in practice — two of them had no input
  left — but it closes the gap between what the README said and what was loaded.
- **The listing budget drops by 5,425 characters** across the five —
  `theflow` 1,536 (capped from 3,611, the single largest entry),
  `grill-the-flow` 1,174, `unexported-archives` 1,130, `to-external-issue` 802,
  `weekly-digest` 783. Measured against a listing roughly 3× its budget, this is
  real but not the fix; see [the restructure spec](../thegraph-restructure.md)
  for what is.
- **Any of them can come back** by moving the folder out again. Retirement here
  is reversible in one command, which is the appropriate weight for a call
  ADR-0019 explicitly left to feel rather than to a metric.
- **`retired/` is now the repo's uninstall verb.** A later retirement is a folder
  move plus a notice, with no script, no list, and no second step to forget.
