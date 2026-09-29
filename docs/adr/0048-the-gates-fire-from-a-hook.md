# The gates fire from a hook, because the rule to run them was written three times and did not fire twice

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).
> The command list below, and in the 2026-08-31 amendment, is superseded again.**
> The hook now runs **three** invocations — `check-skills.py`, its `--selftest`,
> and `--resolve`. The eleven that gated this repo's `thegraph` build went with
> the build; the three repo-level gates whose corpus was the `thegraph` skill
> family were retired in the same act.
>
> **The decision stands and its two load-bearing properties are unchanged** —
> every check bare, every check runs. One consequence is not: `gates.py
> --drift-only` read this hook and asserted its own recorded command list against
> it, and that script is gone. **A command deleted from the hook is now silent**,
> which is this record's own failure mode one level up, reintroduced knowingly
> rather than overlooked.

> **Amended 2026-08-31, twice.** The command list and the timing below are
> superseded; the decision and its two load-bearing properties stand unchanged.
> The hook now runs **nine** commands: five repo-level — both scripts, **both**
> of their `--selftest`s, and `check-skills.py --resolve` — and four gating the
> **generated artifacts** under `scripts/thegraph/`, which this record's argument
> never reached. Measured on the development machine: **2.4 s**, best of three,
> against the *"under a second"* recorded below; it read 1.8 s at five commands.
>
> The second amendment is [ADR-0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md),
> and it is this record's own failure recurring one layer down. `gates.py`
> detected its own drift correctly and **changed nothing for eight commits,
> because nothing ran `gates.py`** — the same gap as the two instances below,
> against a set of files this record did not cover.
>
> It was first measured at **5.3 s** and the cost attributed to five Python
> process starts on Windows. **That attribution was wrong**, and wall-clock
> timing could not show it — the noise between runs on this machine is larger
> than the effect being argued about. A profile settled it: the prose reference
> scan was **68%** of the selftest and process start about a quarter of the
> total. Scanning once per check run and compiling the patterns took the hook to
> 1.8 s. The number is kept here with its wrong first cause, because *"five
> Python starts"* was a plausible answer that would have sent the fix at the one
> part of the cost that was not the problem.
>
> **The paragraph headed *"The `--selftest` is in the hook deliberately"* was
> singular, and so was the hook.** Two scripts carried a `--selftest`; this record
> put one of them in the hook. `check-skills.py --selftest` therefore existed,
> documented, and was never run for as long as it existed — a gate that could not
> be seen to fail, inside the record whose whole subject is a gate that did not
> run. It was recorded as blind spot 1 in `docs/agents/thegraph.md` and is closed
> now. See
> [ADR-0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md).

## The two instances

**First**, recorded inside
[ADR-0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md)
as an aside on the `plan` node it was reverting:

> **And `scripts/check-restructure-spec.py` was red at that commit.** The gate
> this repo runs on its own spec, green one commit earlier, unrun. The `gate`
> node's whole content is *run every gate, bare*; the change that added a node
> type did not run the gate that exists to catch exactly that.

**Second**, two commits of the state-model work. `be0c243` added a column to
`thegraph`'s slot table; the checker located that table by matching its full
header, so the new column made it report the table as missing. It stayed red
through `44e51a2` and was noticed only while running the gates for a third
change.

The two are the same failure in the same script against the same file, and in
both the person editing was editing precisely what the gate exists to check.

## Why the answer is not a fourth statement of the rule

The rule was already written in three places: the `gate` skill (*run every gate,
bare*), the `bare` skill, and ADR-0039's own record of the first instance. All
three were in force during the second instance.

`thegraph` says what that means, and says it about itself:

> A bar stated in a document does not fire; the whole reason `gate` is a script
> and the trigger check is a diff match is that a rule you have to remember at
> the end is a rule that gets skipped exactly when the run was long.

A fourth statement is the thing this toolkit spends its own pages refusing. The
gap was never knowledge — it was that nothing ran the checks unless someone chose
to.

## The decision

**A checked-in pre-commit hook at `scripts/hooks/pre-commit`**, enabled per clone
with `git config core.hooksPath scripts/hooks`. It runs `check-skills.py`,
`check-restructure-spec.py`, and that script's `--selftest`. Measured: under a
second for all three.

Two properties are load-bearing and are commented in the hook so an edit does not
quietly remove them:

- **Each check runs bare, never piped.** A pipeline's exit status is the last
  command's, so a check filtered through `tee` or `grep` can never fail the
  commit. This is `bare`'s rule applied to the thing that runs `bare`'s rule.
- **Every check runs, even after one fails.** Short-circuiting with `&&` hides
  the second failure behind the first, and the second is the one you would
  otherwise discover a commit later — which is exactly how the second instance
  above lasted two commits.

**The `--selftest` is in the hook deliberately.** It mutates a known-good input
once per check and requires each mutation to redden. A gate that cannot fail is
not a gate, and both instances here were a gate that was not run rather than one
that could not fail — but the fix for the first is worthless without the second,
and the selftest is what keeps them apart. It was verified before this record:
breaking one slot row blocks the commit, names both failing checks, and passes
again when restored.

## What this does not do

- **It is bypassable.** `--no-verify` skips it, as it skips every hook. A hook is
  a firing mechanism, not enforcement; it removes *forgetting* as a failure mode
  and leaves *deciding to skip* as one, which is the trade every pre-commit hook
  makes.
- **It is per clone.** `core.hooksPath` is local config and cannot be committed,
  so a fresh clone has no hook until the command is run. `CLAUDE.md` carries the
  command; nothing enforces it.
- **There is no CI.** No workflow file exists in this repo, so the hook is not a
  local mirror of a remote gate — it is the only place these checks run without
  being asked.

## Consequences

- The checker regression that caused the second instance is fixed, and it was
  fixed by loosening a **locator**, not an assertion — the header pattern is now
  anchored on the two columns that identify the slot table and tolerant of any
  added between. That distinction is the one `bare` cares about: *never move a
  threshold to turn a build green*.
- ADR-0039 keeps its aside. It recorded the first instance accurately and is not
  amended by this — it named a fact, and this record names what the second
  occurrence of that fact means.
- Two instances is this toolkit's own bar for writing a rule down rather than
  re-deciding it case by case. This record exists because that bar was met, not
  because the fix was large.
