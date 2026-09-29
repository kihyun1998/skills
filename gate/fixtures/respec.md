# Fixture: Respec

**Expected verdict:** Respec
**Decision-tree rule:** Rule 4 (a Spec finding `code-review` could not cite a spec
line for).

## Scenario

The AFK agent implemented issue #58 ("Improve the export feature"). The PR adds
an export, but the issue body never says which format. `code-review` ran from the
merge-base.

Prior `Verdict: Rework` comments on the issue: **0**.

## Sample `code-review` output

### Standards report

> No hard violations.

### Spec report

> Spec source: issue #58 body.
>
> - Finding: the PR exports CSV. The issue says "improve the export feature"
>   but **does not state a target format** — could not cite a spec line for the
>   chosen format. The body has no requirement pinning CSV vs JSON vs XLSX.
> - Finding: the PR adds a download button. **No spec line** describes the
>   delivery mechanism — could not cite one.
>
> The spec is too thin to judge the implementation against.

## Why this is Respec

Rules 1 and 2 do not fire. Rule 3 does not match — there are open Spec
findings. Rule 4 matches: `code-review` explicitly **could not cite a spec line**
for its findings — the issue itself is underspecified. Bouncing it to the AFK
agent (Rework) would only reproduce the same guess, so the gate proposes
applying `needs-info` for spec refinement. Note that Respec outranks both
Escalate and Rework here precisely because the root cause is the spec, not the
code.
