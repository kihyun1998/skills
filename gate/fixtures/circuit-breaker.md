# Fixture: Circuit breaker

**Expected verdict:** Escalate
**Decision-tree rule:** Rule 2 (≥ N prior Rework verdicts; overrides the
findings).

## Scenario

The AFK agent implemented issue #72 ("Wire up the settings page"). The current
`code-review` output, taken on its own, would be a clean **Rework** — the findings
are mechanical and locally fixable, all with spec citations. But the issue has
already been Reworked twice: the AFK agent keeps missing the same things.

With the default threshold `N = 2`, this issue has hit the circuit breaker.

## Prior verdict comments on the issue

Two earlier Acceptance Gate comments are on issue #72, each carrying the
machine-findable marker the loop counter parses:

> ## Acceptance Gate verdict
> **Verdict:** Rework
> ... (first run — missing tests)

> ## Acceptance Gate verdict
> **Verdict:** Rework
> ... (second run — same tests still missing)

Prior `Verdict: Rework` comments: **2**.

## Sample `code-review` output (this run)

### Standards report

> Hard violation:
> - `src/settings/page.tsx:40` — handler named `on_save`; repo standard is
>   camelCase. Mechanical rename.

### Spec report

> Spec source: issue #72 body.
>
> - Requirement "settings persist on save" — **missing**, cited issue #72 line
>   8. Mechanical, with a clear spec citation.

## Why this is Escalate

Taken alone the findings satisfy Rule 6 — mechanical, local, all cited — so the
verdict engine would say **Rework**. But Rule 2 runs first and overrides it:
the loop counter finds **2** prior `Verdict: Rework` comments, which is `≥ N`
(N = 2). The issue is looping between the gate and the AFK agent, so the
circuit breaker trips and the gate proposes `ready-for-human` instead. This
fixture exists to prove the override fires even when the findings themselves
look like a routine Rework.
