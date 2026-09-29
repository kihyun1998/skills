# Fixture: Rework

**Expected verdict:** Rework
**Decision-tree rule:** Rule 6 (findings are mechanical and local, all with
clear spec citations).

## Scenario

The AFK agent implemented issue #44 ("Add input validation to the signup
form"). The PR adds the validation but skips the test the issue asked for and
names a helper inconsistently. `code-review` ran from the merge-base.

Prior `Verdict: Rework` comments on the issue: **0**.

## Sample `code-review` output

### Standards report

> Hard violation:
> - `src/forms/signup.ts:52` — exported helper named `chk_email`; the repo
>   standard is camelCase (`checkEmail`). Mechanical rename.

### Spec report

> Spec source: issue #44 body.
>
> - Requirement "reject empty email and password" — **met**, cited issue #44
>   line 6.
> - Requirement "the validation is covered by a unit test" — **missing**,
>   cited issue #44 line 9. No test file touches the new validator.
>
> 1 missing requirement, with a spec citation.

## Why this is Rework

Rules 1 and 2 do not fire. Rule 3 does not match — there is 1 hard violation
and 1 missing requirement. Rule 4 (Respec) does not match — every Spec finding
**has** a spec citation (issue #44 line 9). Rule 5 (Escalate) does not match —
neither finding needs architectural judgement: a rename and a missing test are
both mechanical and local. Rule 6 matches. The gate proposes re-applying
`ready-for-agent` and posting fix notes drawn from `code-review`: rename
`chk_email` → `checkEmail`, and add the unit test required by issue #44 line 9.
