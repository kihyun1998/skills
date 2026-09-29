---
name: grill-code
requires: [to-html]
disable-model-invocation: true
description: "Grill your code. Pick exactly one review mode — security, common-component extraction, refactoring, performance, or learning — and grill-code relentlessly scans the chosen scope, scores each finding on severity + effort, and reports them ranked by priority (P0–P3). Defect modes also surface a short, capped list of Strengths — places the chosen lens found genuinely done well — so a clean spot gets named clean instead of inflated into a finding. The non-defect learning mode instead explains AI-written code — function, behavior, structure, coupling, intent — as Lessons ranked by how central each is to understanding the scope. Report only — it never edits code. Settles scope and any score-changing ambiguities with you interactively, and can save the report as HTML via the `to-html` skill. Use when the user wants a focused, scored, prioritised code review, asks to grill/scrutinise code for security, performance, duplication, or refactoring, wants to understand unfamiliar or AI-written code, or invokes /grill-code. Distinct from `grill-me`, which interrogates a plan; grill-code interrogates code."
---

# grill-code

Grill code along **one** chosen lens, score every finding the same way, and
report them ranked by priority. The subject is the code, not the developer —
"grill" means the scan is relentless, not that you get interrogated. This skill
**reports only**; it never edits code.

This is a **standalone** skill — it does its own scanning and scoring rather
than delegating to `code-review`/`audit`/`harden`. See
[ADR-0002](../../docs/adr/0002-grill-code-is-standalone.md) for why.

All the substance — what each mode hunts, the per-mode severity criteria, the
priority matrix, the questioning rules — lives in [REFERENCE.md](REFERENCE.md).
Read it every run. This file is only the flow.

## Contents

- [Process](#process)
- [Constraints](#constraints)

## Process

Run these steps in order. They are **interactive gates, not a single batch** —
steps 1 and 2 hand the turn back to the user and must not be steamrolled. Do
**not** read any code or run `git diff` until both the mode (step 1) and the
scope (step 2) are settled; the first code you touch for findings is the scan in
step 4 (the orient pass in step 3 reads structure and surrounding context, not
the scored target).

Throughout, keep two things separate:

- **scope** — the code you *judge and score*. Findings (or Lessons) are only ever
  about scope.
- **context** — any other code you may *read to judge scope well*: callers,
  callees, related files, config, `CONTEXT.md`. Read it as freely as you need —
  it is never scored, only used to settle whether a scope finding is real. This
  scope/context split is what fixes the "narrow field of view": narrowing scope
  (e.g. to a diff) never narrows what you may read.

### 1. Pick the mode

Offer the five modes and have the user pick **exactly one** — one mode per
session (the criteria differ by mode, so a single report never mixes them). The
first four are **defect** modes; **learning** is non-defect (it explains rather
than faults):

- **security** — injection, auth, trust boundaries, secrets, structural logic flaws
- **common-component extraction** — duplication worth consolidating
- **refactoring** — complexity, naming, cohesion, coupling, testability
- **performance** — algorithmic cost, N+1, I/O, memory (backend/general)
- **learning** — understand AI-written code: what it does, how it runs, how it's
  structured, what it couples to, and why (explains, doesn't fault)

If the user already named the lens ("grill this for security"), skip the menu
and treat the mode as settled.

**Gate — stop here and wait.** Until the mode is settled, do **not** read any
code, open any file, or run `git diff`. Present the menu (or confirm the named
lens), then yield the turn and wait for the user's pick — a chosen mode is what
unblocks the rest of the flow. Picking the mode first is the whole point: the
scan and its questions are mode-specific, so scanning before the lens is set
produces the wrong questions.

### 2. Settle the scope

**There is no default scope** — ask, don't assume. (The old "just diff `main`"
default is exactly what narrowed the view.) Put the scope question to the user
and **wait for an answer**, the same way the mode gate does. Ask:

1. **Whole folder/path, or a diff?** — review an entire directory/file, or only
   changed code.
2. **If a diff — which commits?** — working-tree changes, the merge-base against
   `main`, a specific commit, or a commit range. Don't pick for them.

To make those choices concrete you **may** first read *metadata only* — the
folder tree and `git log --oneline` — and offer it alongside the question. That
is orientation, not the scan; it does not open the scored code. If the user
already named a scope ("grill `src/auth/` for security"), skip the question and
confirm it in one line.

Whatever they pick is the **scope** (the scored target). It does not limit
**context** — step 3 still reads around it freely.

**Gate — stop here and wait.** Like the mode gate, settle scope before any code
scan. The one exception is a scope the user already named, which you just
confirm.

For **security**, also read the repo's `CONTEXT.md` for domain invariants, and —
if the invariants needed to judge structural logic flaws are unstated — ask for
them here (see REFERENCE → security → Domain rules).

### 3. Orient

Before hunting, map where the scope sits so you can judge it from code instead of
guessing. Read the **folder structure** around the scope, then trace its edges:
what calls *into* the scope and what the scope calls *out* to. Those neighbours
are the **context** you may read in step 4.

The orient pass is what makes the mode-specific judgements land:

- **security** — trace where each input *comes from* across the call chain, so
  reachability is settled by code, not punted to the user.
- **performance** — find who *calls* the scope, so you can tell whether a query
  or loop is actually on a hot path.
- **learning** — coupling is inherently cross-boundary; the folder map is how you
  see what connects to what.

Keep it proportionate: read enough context to judge the scope, not the whole
repo. If the scope is the whole project, the folder tree *is* the orientation.

### 4. Scan

Read the chosen mode's section in REFERENCE.md and hunt for its findings across
the scope, reading **context** (step 3's neighbours) whenever it settles whether
a finding is real. A **Finding** is one candidate issue, and it is always *about
the scope* — context informs the judgement but is never itself scored. Be
relentless within the mode; do not stray into other modes' concerns.

**Sweep every hunt category — findings have no cap.** The mode's **Hunts**
list in REFERENCE.md is a checklist, not inspiration: conclude a category only
after actively looking for it across the whole scope, and keep going until
every category is swept — never stop because the report already "feels long"
or because a few findings seem like enough. There is no upper bound on the
number of findings; condensing happens at report time (step 7's noise
control), never by hunting less.

**Calibrate as you go (defect modes).** Hunting for problems biases you toward
seeing problems — so when you weigh a spot, decide explicitly: is the mode's risk
here *real*, or is it actually *handled well*? A spot where the thing that could
have gone wrong is done right is **not a Low finding** — it is either a
**Strength** (step 7) if it genuinely stands out, or nothing at all. Naming the
clean cases is what stops borderline ones from being inflated into findings. This
applies to the four defect modes only; learning doesn't fault and so doesn't
commend.

### 5. Grill (questioning)

A question is the **last resort, not the first** — try to settle it from
**context** before asking. If severity or effort turns on something code can
answer (e.g. "is this input externally reachable?"), follow the call chain into
context and resolve it there. Only when context genuinely can't settle it —
intent, runtime config, external trust — hold the finding as
`needs-clarification`.

Then ask the user — **all held findings batched into one round**, never
one-by-one. Ask only questions whose answer **changes a score**; skip curiosity.
If the user does not answer, fall back to the **conservative assumption** (e.g.
treat input as untrusted), score provisionally, and record the assumption in the
report.

### 6. Score

**Defect modes** (security / common-component / refactoring / performance):
score every finding on **Severity** (Critical/High/Medium/Low — by that mode's
criteria) and **Effort** (S/M/L — fix cost). Derive **Priority** from the matrix
in REFERENCE.md: severity sets the floor, effort breaks ties so quick wins float
up within a band. **Strengths are not scored** — they carry no Severity, Effort,
or Priority; they're just the calibrated clean cases worth naming (capped at the
top 2–3, see REFERENCE → Strengths).

**learning** is non-defect — no Severity, Effort, or Priority. Score each
**Lesson** on a single axis, **Value** (Core / Notable / Nice-to-know): how
central it is to understanding the scope. See REFERENCE → learning.

### 7. Report

Present the results in the conversation. **Defect modes:** order **P0 → P3**,
lowest effort first within a band, in the **finding format**, then close with a
short **Strengths** section (≤3 items, **Strength format** in REFERENCE.md) —
omit it entirely if nothing genuinely stands out; never manufacture praise.
**learning:** order **Core → Notable → Nice-to-know**, in the **Lesson format**
(no Strengths — learning doesn't fault, so it doesn't commend). Either way: no
overall grade or summary — Strengths are specific, lens-bound items, *not* a vibe
score, so they don't reintroduce the grade the skill bans. Just the ranked items
(formats in REFERENCE.md), following its **noise control** rules (dedup by root
cause / concept, lowest tier as one-liners, never imply coverage you didn't do
— including naming the hunt categories that came up clean).
Surface any assumptions from step 5.

Then offer to **save the report as HTML** — if the user wants it, hand the
report to the `to-html` skill. (This optional rendering does not violate the
standalone rule; ADR-0002 is about the core scan/scoring.)

## Constraints

- **Report only.** Never edit code, never open a PR. The output is the ranked
  report and nothing else.
- **One mode per session.** Do not silently run several modes and merge them.
- **Stay in the mode.** Respect the boundaries in REFERENCE.md — e.g. don't do
  UI performance (that's `audit`/`optimize`) or a rearchitecture (that's
  `improve-codebase-architecture`).
- **Don't invent confidence.** When a score depends on unknown intent, ask or
  assume-and-disclose — never present a guessed score as settled.
