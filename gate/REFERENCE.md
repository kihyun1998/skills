# gate — reference

The verdict decision tree, the comment formats, and the tunable threshold.
Read this every time you run the gate — do not reconstruct it from memory.

## Contents

- [Tunable: circuit-breaker threshold](#tunable-circuit-breaker-threshold)
- [Verdict decision tree](#verdict-decision-tree)
- [Verdict comment format](#verdict-comment-format)
- [Acceptance Gate verdict](#acceptance-gate-verdict)
- [Resolving the issue and its PR — `gh` recipe](#resolving-the-issue-and-its-pr--gh-recipe)

## Tunable: circuit-breaker threshold

```
N = 2
```

`N` is the number of prior **Rework** verdicts after which the gate forces
**Escalate**. Change the value here and nowhere else.

## Verdict decision tree

Apply these rules **in order**. The first rule that matches wins. The verdict
is always exactly one of Pass / Rework / Respec / Escalate.

1. **Fallback first.** `code-review`'s output is missing, or cannot be parsed into a
   Standards report and a Spec report → **Escalate**. Do not guess.

2. **Circuit breaker.** The issue already carries **≥ N** prior `Verdict: Rework`
   comments → **Escalate**, regardless of every rule below. A stuck issue must
   reach a human.

3. **Pass.** `0` hard violations **AND** `0` missing requirements. Any
   judgement-call findings (nits, style) are listed in the verdict comment but
   do **not** block. This is the only verdict that closes the issue.

4. **Respec.** The Spec report has a finding for which `code-review` **could not
   cite a spec line** — the issue itself is underspecified. Routing it to the
   AFK agent would only reproduce the same failure, so it goes to `needs-info`
   for spec refinement instead. This rule outranks Rework: if any finding lacks
   a spec citation, prefer Respec over Rework.

5. **Escalate.** Any remaining finding needs **architectural judgement or a
   trade-off decision** — a human must weigh it. Examples: a design choice with
   no single right answer, a security/performance trade-off, a change whose
   correct fix depends on intent the spec does not pin down.

6. **Rework.** All remaining findings are **mechanical and local** — fixable
   without human judgement. Examples: missing tests, naming, a single missed
   requirement that *has* a clear spec citation, a localised standards breach.
   The AFK agent can fix these on its next run, so the issue goes back to
   `ready-for-agent` with fix notes.

### Reading the rules

- Rules 1 and 2 are **overrides** — they fire before the engine looks at the
  findings at all.
- Rule 3 is the clean-bill-of-health case.
- Rules 4–6 triage the findings. **Respec before Escalate before Rework**: an
  uncited finding is Respec even if it looks mechanical; a judgement-call
  finding is Escalate even if a spec line exists.
- **Standards-only mode:** if the issue body is empty there is no spec, so
  skip rule 4 and judge on the Standards report alone. Say so in the verdict.

## Verdict comment format

Every run posts one comment to the issue — the audit trail, and the data the
next run's loop counter reads. Use exactly this shape so the marker is
machine-findable:

```
## Acceptance Gate verdict

**Verdict:** Rework

- **PR judged:** #42
- **Diff range:** <merge-base-sha>..<pr-head-sha>
- **Prior Rework count:** 1 of N=2

### Reasoning

<one short paragraph: which rule fired and why>

### Findings

- Hard violations: <count>
- Missing requirements: <count>
- Judgement-call (non-blocking): <count>

### Fix notes (Rework only)

<concrete fix notes drawn verbatim from `code-review`'s findings — omit this
section for non-Rework verdicts>
```

The line `**Verdict:** <X>` is the marker. The loop counter in step 4 counts
comments whose verdict is `Rework`.

## Resolving the issue and its PR — `gh` recipe

```sh
# Fetch the issue itself: its body is the spec, its comments feed the
# loop counter (step 4).
gh issue view <N> --json number,title,body,comments

# Resolve issue N -> the PR that closes it. A PR whose body carries a
# closing keyword ("Closes #N") leaves a cross-reference on the issue
# timeline; the source of that event is the PR.
gh api "repos/{owner}/{repo}/issues/<N>/timeline" --paginate \
  --jq 'last(.[] | select(.event == "cross-referenced"
        and .source.issue.pull_request) | .source.issue.number)'

# From that PR number: its base + head, then the merge-base — the
# fixed point passed to `code-review`.
gh pr view <PR> --json number,headRefName,baseRefName,headRefOid
git merge-base <baseRef> <headRef>
```

The merge-base is the **fixed point** passed to `code-review`. If the timeline
shows no cross-referencing PR, stop — the gate has nothing to judge.
