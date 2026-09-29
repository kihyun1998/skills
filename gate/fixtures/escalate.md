# Fixture: Escalate

**Expected verdict:** Escalate
**Decision-tree rule:** Rule 5 (a finding needs architectural judgement / a
trade-off decision).

## Scenario

The AFK agent implemented issue #67 ("Speed up the report query"). The PR makes
the query faster by caching results, but the cache has no invalidation
strategy and the spec is silent on staleness tolerance. `code-review` ran from the
merge-base.

Prior `Verdict: Rework` comments on the issue: **0**.

## Sample `code-review` output

### Standards report

> Hard violation:
> - `src/reports/query.ts:120` — a process-wide in-memory cache with no
>   invalidation. Whether stale reports are acceptable is a product trade-off,
>   not a code fix — needs a human decision on the staleness/performance
>   trade-off.

### Spec report

> Spec source: issue #67 body.
>
> - Requirement "the report query is faster" — **met**, cited issue #67 line 5.
> - The issue does not address cache correctness; this is an architectural
>   trade-off the spec was never meant to settle.

## Why this is Escalate

Rules 1 and 2 do not fire. Rule 3 does not match — there is 1 hard violation.
Rule 4 (Respec) does not match — the requirement that *is* in scope ("faster")
has a clean spec citation; the cache finding is not an uncited spec finding but
a design trade-off. Rule 5 matches: the correct fix depends on a product
judgement about acceptable staleness — no single right answer, so a human must
weigh it. The gate proposes applying `ready-for-human`. (Escalate outranks
Rework: the finding is not mechanical even though it is localised.)
