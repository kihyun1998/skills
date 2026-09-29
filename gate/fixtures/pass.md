# Fixture: Pass

**Expected verdict:** Pass
**Decision-tree rule:** Rule 3 (0 hard violations AND 0 missing requirements).

## Scenario

The AFK agent implemented issue #31 ("Add a `--quiet` flag to the CLI"). The PR
adds the flag, a test, and a docs line. `code-review` ran from the merge-base.

Prior `Verdict: Rework` comments on the issue: **0**.

## Sample `code-review` output

### Standards report

> No hard violations.
>
> Judgement-call:
> - `src/cli.ts:88` — the flag handler could be a one-liner; current form is a
>   3-line `if`. Style preference, not a standards breach.

### Spec report

> Spec source: issue #31 body.
>
> - Requirement "expose a `--quiet` flag" — **met**, cited issue #31 line 4.
> - Requirement "suppress non-error output when set" — **met**, cited issue #31
>   line 5.
> - Requirement "covered by a test" — **met**, cited issue #31 line 7.
>
> No missing requirements.

## Why this is Pass

Rule 1 (fallback) does not fire — `code-review` output is well-formed. Rule 2
(circuit breaker) does not fire — 0 prior Rework comments. Rule 3 matches: 0
hard violations and 0 missing requirements. The single judgement-call finding
is recorded in the verdict comment but does not block. The gate proposes
**closing the issue**.
