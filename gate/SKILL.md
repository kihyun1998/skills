---
name: gate
requires: [code-review]
disable-model-invocation: true
description: "Acceptance Gate — judge an AFK agent's finished output against the issue it implemented and route the issue accordingly. Invoked with a single issue number; resolves the linked PR and merge-base, delegates analysis to the `code-review` skill, then produces exactly one Verdict (Pass / Rework / Respec / Escalate) plus a next action and waits for explicit approval before any GitHub mutation. Use when an AFK agent has finished a `ready-for-agent` issue and the maintainer wants to accept, bounce, respec, or escalate that work, or invokes /gate."
---

# gate — the Acceptance Gate

Judge an AFK agent's finished output for one issue, issue a **Verdict**, and —
once the maintainer approves — execute the matching action on the GitHub issue
tracker.

This skill does **not** analyse the diff itself. Per ADR-0001 it drives the
`code-review` skill and consumes its reports, adding only the verdict and the
routing/execution layer. The `code-review` skill **must be installed** — if it is
not, stop and tell the maintainer.

## Input

A single issue number. Everything else is resolved from it. Nothing is stored
locally — the issue's comment thread is the only memory.

## Process

Run these five components in order. The verdict logic is prose, not a script —
do not extract it into executable code.

### 1. Issue resolver

From the issue number, using `gh` + `jq` (see `docs/agents/issue-tracker.md`):

- **Linked PR** — the PR that closes this issue (its body has `Closes #N`, or
  GitHub's issue/PR linkage). If no PR is linked, stop and report it.
- **Fixed point** — the merge-base of the PR branch against its base branch.
  This is the commit `code-review` will diff from.
- **Spec** — the issue body.
- **Rework history** — the issue comments (used by the loop counter, step 4).

Report the PR number and the diff range you resolved, so the maintainer can
confirm you judged the right thing.

### 2. Review driver

Invoke the `code-review` skill, supplying the fixed point and the spec so `code-review`
does not prompt. Capture both of its reports — the **Standards report** and
the **Spec report**. These two reports are the only input to the verdict.

If `code-review` produces no output, or output you cannot parse into Standards and
Spec findings, do **not** guess — go straight to **Escalate** (see Fallback).

### 3. Verdict engine

Apply the decision tree in [REFERENCE.md](REFERENCE.md). Produce exactly one
Verdict: **Pass**, **Rework**, **Respec**, or **Escalate**.

A finding is a **hard violation** when `code-review` flags it as a standards
breach, and a **missing requirement** when the Spec report cites a missed
spec line. **Judgement-call** findings (nits, style preferences) are recorded
in the verdict comment but never block a Pass.

If the issue body is empty there is no spec — degrade to a **Standards-only**
verdict (judge on the Standards report alone) and say so.

### 4. Loop counter (circuit breaker)

Count prior **Rework** verdicts by parsing earlier gate verdict comments on the
issue (they carry the `Verdict: Rework` marker — see the comment format in
REFERENCE.md). If the count is **≥ N**, force **Escalate** regardless of the
verdict engine's result. Default **N = 2**; it is defined once in REFERENCE.md
so it is easy to change.

### 5. Action executor

Map the verdict to its action and triage label, then **propose** it — do not
execute yet:

| Verdict  | Action                                            | Label             |
|----------|---------------------------------------------------|-------------------|
| Pass     | Close the issue                                   | (none — closed)   |
| Rework   | Re-apply `ready-for-agent` + post fix-notes comment | `ready-for-agent` |
| Respec   | Apply `needs-info`                                | `needs-info`      |
| Escalate | Apply `ready-for-human`                           | `ready-for-human` |

Present the verdict, the reasoning, and the proposed action, then **wait for
explicit maintainer approval** before any `gh` mutation — and **ask for it**,
with the tool that renders a question (`AskUserQuestion` where the harness has
one). A verdict printed alongside an instruction to approve is a mutation
waiting on prose. The maintainer may
override the verdict at this step — honour the override.

On approval:

1. Post a **verdict comment** for the audit trail and the loop count (format
   in REFERENCE.md). Rework fix notes are drawn from `code-review`'s findings — do
   not rewrite them.
2. Apply the label and/or close, per the table.

`needs-info` and `ready-for-human` must exist as labels before first use; the
canonical strings live in `docs/agents/triage-labels.md`.

## Fallback

If `code-review`'s output is missing or malformed so a verdict cannot be derived,
return **Escalate**, explain that the gate could not judge the work, and
propose `ready-for-human`. Never emit a confident verdict from absent data.

## Verifying changes

The decision tree is regression-tested with the golden scenario fixtures in
`fixtures/`. Each fixture pairs a sample `code-review` output with the Verdict it
must produce. After editing this file or REFERENCE.md, re-derive the verdict
for every fixture and confirm it still matches. See
[fixtures/README.md](fixtures/README.md).
