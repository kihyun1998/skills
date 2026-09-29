# grill-code — reference

The meat of each mode and the shared scoring rubric. Read this every time you
run grill-code — do not reconstruct it from memory. SKILL.md drives the flow;
this file defines what each mode hunts and how findings are scored.

## Contents

- [The scoring shape](#the-scoring-shape)
- [Modes](#modes)
- [Strengths (defect modes only)](#strengths-defect-modes-only)
- [Questioning (the grill)](#questioning-the-grill)
- [Scope](#scope)
- [Output](#output)
- [Mode extensibility](#mode-extensibility)

## The scoring shape

The four **defect** modes score each finding on the same two axes; priority is
derived. The fifth mode, **learning**, is non-defect — nothing is being fixed, so
it uses a single **Value** axis and no priority (defined in its own section
below). The rest of this section is the defect-mode shape.

- **Severity** — how much it hurts if left unfixed: Critical / High / Medium / Low.
  The *criteria* for each rung are defined per mode below; the ladder is shared.
- **Effort** — cost to fix: S / M / L. Same meaning across all modes
  (S ≈ local one-spot change, M ≈ multi-spot but mechanical, L ≈ needs design).
- **Priority** — derived from the matrix. Severity sets the floor; effort is the
  tiebreaker that floats quick wins up within a severity band.

### Priority matrix (tunable)

|           | S (cheap) | M   | L (costly) |
|-----------|-----------|-----|------------|
| Critical  | P0        | P0  | P0         |
| High      | P0        | P1  | P1         |
| Medium    | P1        | P2  | P2         |
| Low       | P2        | P3  | P3         |

Report findings ordered by P0→P3; within one band, lowest effort first.
P0 = fix now · P1 = soon · P2 = when convenient · P3 = backlog.

## Modes

Four **defect** modes (security, common-component extraction, refactoring,
performance) plus one non-defect **comprehension** mode (learning). Exactly one
runs per session. Each defect section defines what the mode hunts and what lands a
finding on each severity rung; learning defines what it explains and what makes a
Lesson Core / Notable / Nice-to-know. Treat each mode's **Hunts** list as a sweep
checklist: a category is done when it has been actively looked for across the
whole scope, not when a few findings have accumulated.

### security

**Hunts** (grouped by OWASP flow):
- **Injection** — SQL/NoSQL, OS command, XSS, template, path traversal, XXE
- **AuthN/AuthZ** — missing permission checks, broken access control, IDOR,
  session management (weak tokens, no expiry, fixation), missing brute-force /
  rate-limit protection on auth
- **Trust boundary** — untrusted input reaching a dangerous sink, CSRF on
  state-changing requests, SSRF, open redirect, mass assignment / over-posting
- **Secrets & crypto** — hardcoded keys/tokens/passwords, weak algorithms,
  predictable randomness, hardcoded IV
- **Sensitive data & config** — PII/secrets in logs or errors, security
  misconfig (debug on, permissive CORS, default creds), unsafe deserialization,
  unsafe file upload
- **Business-logic (structural)** — server-authoritative values sent by the
  client (price/role/userId/quantity), missing invariant validation (negative
  amounts, range, state transitions), idempotency/race on critical ops (coupon
  reuse, double-spend/TOCTOU), workflow step-skipping

**Severity criteria:**
- **Critical** — untrusted input reaches a path leading to RCE, auth bypass, or
  mass data exposure
- **High** — exploitable with a precondition (authenticated, specific config),
  or serious data exposure
- **Medium** — defense-in-depth gap; exploitable only with local access or an
  unlikely chain
- **Low** — hardening / best-practice violation with no direct exploit path

**Domain rules:** read `CONTEXT.md` for domain invariants before scanning; if
key invariants (what must be server-authoritative, money/quantity rules) are
unstated, ask in the scope step so structural business-logic checks can verify
them.

**False positives:** before asserting Critical or High, confirm the finding is
*reachable* — that untrusted input actually flows to the sink. **Trace it through
context first**: follow the call chain back across files to where the input
originates. Most reachability questions are answerable from code if you read the
callers — do that before punting. Only when the path truly can't be settled from
code (it depends on runtime config or external trust) treat it as a
needs-clarification question (or score conservatively and disclose). Attach a
confidence note to any finding resting on an unverified path. A
confident-but-wrong Critical erodes trust in the whole report, so under-claim
rather than over-claim when the path is uncertain.

**Out of scope:** known-vulnerable dependencies (CVE/SCA) — needs an external
vuln DB; point the user to `npm audit`/Dependabot instead of guessing.

### common-component extraction

**Hunts:**
- Copy-paste logic blocks repeated across files/functions
- Parallel structures that should share an abstraction (e.g. N near-identical
  handlers)
- Repeated validation / transformation / mapping logic
- Repeated magic literals/constants that should be centralized
- Repeated UI patterns (when frontend)
- "Shotgun surgery" — one change forces edits in many places

**Severity criteria** (severity = cost of *not* extracting + risk of divergence):
- **Critical** — duplicated logic that is correctness- or security-critical and
  has *already diverged* (one copy fixed, others not) — actively bug-spawning
- **High** — ≥3 copies of non-trivial logic in churning code; likely to diverge
- **Medium** — a couple of duplicates, moderate size
- **Low** — trivial/small or coincidental similarity

**Guard against premature abstraction:** not all duplication should be merged.
When two copies look alike but may evolve apart, that is *not* a finding — flag
as needs-clarification and ask "intentional split or accidental copy?" before
scoring. Wrong abstraction costs more than duplication.

### refactoring

**Hunts:**
- Long functions / god classes; deep nesting / high cyclomatic complexity
- Poor or misleading naming
- Low cohesion — a class/module doing unrelated things; methods that share no
  state, grouped by layer/convenience rather than by responsibility
- Tight coupling, poor separation of concerns, leaky abstractions
- Weak testability (hard-to-test = design smell)
- Dead code / unused exports
- Long parameter lists, primitive obsession, feature envy
- Comments compensating for unclear code

**Severity criteria** (severity = how much it impedes future change / invites bugs):
- **Critical** — complexity so high that changes are bug-prone, in a hot or
  critical area (e.g. a 400-line untestable function on the payment path)
- **High** — significant smell in frequently-changed code
- **Medium** — smell in stable, rarely-touched code
- **Low** — cosmetic / style-level, no real maintainability impact

**Boundary:** cross-cutting *duplication* belongs to common-component
extraction; refactoring covers *local* structure and complexity. Architecture-
level redesign is out of scope (that is the `improve-codebase-architecture`
skill's territory) — grill-code reports finding-level smells, not a rearchitecture.

### performance

General/backend performance. **UI/frontend performance (bundle, render, images)
is out of scope — use `audit`/`optimize`.**

**Hunts:**
- Algorithmic complexity — O(n²)+ where avoidable, nested loops over large data
- Database — N+1 queries, full scans where an index is implied, over-fetching
  (`SELECT *`), queries in loops, missing pagination
- I/O — blocking/sync I/O on a hot path, sync-in-async, sequential awaits that
  could run in parallel
- Redundant work — recomputation, missing memoization/caching, repeated
  expensive calls
- Memory — leaks, unbounded collections/caches, large hot-path allocations
- Resource lifecycle — unclosed connections/handles
- Network — chatty calls, oversized payloads

**Severity criteria** (severity = latency/throughput impact × how hot the path is):
- **Critical** — pathological scaling on a hot/user-facing path (N+1 on a list
  endpoint, O(n²) on request-time data); degrades badly under load
- **High** — noticeable slowdown on a commonly-hit path
- **Medium** — inefficiency off the hot path, or only at large scale
- **Low** — micro-optimization with negligible real impact

### learning

Non-defect. **Claude → human: explain AI-written code so its human owner can
catch up on what it does.** The motivation is current — AI now writes much of the
code, and the human falls behind on how it actually behaves. learning does not
fault the code; it *teaches* it. (Report-only still holds — it explains, never
edits.)

**Explains** (in comprehension order):
- **Function** — what the code does: each unit's responsibility / purpose
- **Behavior** — how it runs: control flow, data flow, the execution path,
  failure / rollback paths
- **Structure** — how it's organized: the key components / abstractions and each
  one's role
- **Coupling** — what connects to what: dependencies, and how far a change ripples
- **Design intent (why)** — why it's built this way: trade-offs and the reasoning
  behind the shape. Read `CONTEXT.md` if present to ground the *why* in domain
  intent.

**Value criteria** (Value = how central this is to understanding the scope):
- **Core** — you cannot understand the scope without it: the central behavior, the
  load-bearing abstraction, the key invariant.
- **Notable** — grasping it markedly deepens your understanding: a non-obvious
  flow, a hidden coupling, a deliberate design decision.
- **Nice-to-know** — peripheral but helpful context.

No Severity, Effort, or Priority — nothing is being fixed. Order Lessons
Core → Notable → Nice-to-know.

**Stay honest about intent.** "Why it's built this way" is usually a
*reconstruction* — you infer intent from code, not from the author's mind (and the
author may have been an AI). When the rationale is a guess, mark it ("Inferred: …")
rather than stating it as settled; `CONTEXT.md` or the user can confirm. A
confident-but-wrong "why" mis-teaches, which is worse than naming the gap.

**Not a defect hunt.** If a bug surfaces while you explain, note it in one line but
do not score or rank it — that is another mode's job. learning's output is
Lessons, not findings.

## Strengths (defect modes only)

A scan that only hunts problems sees problems everywhere — even where the code is
fine. **Strengths** are the counterweight: the spots where the mode's own risk
*could* have gone wrong and instead is handled well. They're not decoration —
naming a clean case is the act of judging it clean, which is exactly what stops a
borderline spot from being inflated into a Low finding. (This is why they live
only in the four defect modes; learning never faults, so it has nothing to
commend.)

A Strength is **earned, not awarded**. The bar:

- **Lens-bound.** It must be a strength *in the active mode's lens* — security
  praises a closed attack surface, performance praises a path that scales, not
  "the code reads nicely." A strength outside the lens is noise.
- **Specific and located.** Point at code (file/area) and say what the risk was
  and why it's covered — same evidentiary bar as a finding. "Good structure" with
  no anchor doesn't qualify.
- **Non-trivial.** The thing it does right has to be something that *commonly goes
  wrong*. "Uses `const`" is not a Strength; "every user-facing query is
  parameterised, so the injection surface this mode hunts is closed" is.

**Strength signals per mode** (what "done well" looks like through each lens):

- **security** — untrusted input consistently parameterised / escaped before its
  sink; authz centralised in one guard with no handler re-implementing it;
  server-authoritative values never trusted from the client; secrets sourced from
  config, not literals.
- **common-component extraction** — a genuinely shared abstraction already absorbs
  what would otherwise be copy-paste; one validation/mapping path reused instead
  of forked per call-site.
- **refactoring** — a complex area kept small and testable through clean
  separation; a module whose pieces are highly cohesive (one clear
  responsibility, methods sharing state) rather than a grab-bag; naming that
  makes intent obvious; a seam that isolates a volatile dependency.
- **performance** — a hot path already batched / cached / paginated where the
  naive version would N+1 or full-scan; independent awaits run in parallel; a
  bounded cache instead of an unbounded one.

**Cap and honesty.** Report at most the **top 2–3** Strengths, the same as
findings get deduped — this is a highlight, not an inventory of everything that
isn't broken. If nothing clears the bar, **write no Strengths section at all**;
an empty or padded one is worse than none, because manufactured praise erodes the
report's signal exactly as a false-positive finding does. See
[ADR-0005](../../docs/adr/0005-grill-code-defect-modes-report-strengths.md) for why
defect modes commend at all and why it isn't a grade.

## Questioning (the grill)

After the scan, before final scoring:

- **Try context before asking.** A question is the last resort. If severity or
  effort turns on something code can answer (reachability, who calls this, what
  it couples to), follow the call chain into **context** and settle it there.
  Only hold a finding as `needs-clarification` when context genuinely can't
  settle it — intent, runtime config, external trust.
- **Ask only when the answer changes a score.** Pure curiosity → don't ask.
- **Batch once.** Present all held-back findings together, not one-by-one.
- **No answer → conservative default.** Assume the worse case (e.g. "treat as
  untrusted input"), score provisionally, and state the assumption in the report
  ("Assumed: …").

## Scope

**No default** — ask the user, don't assume (the old "diff `main`" default is
what narrowed the view). Two questions, answered before any code scan:

1. Whole folder/path, or a diff?
2. If a diff — which commits (working tree, merge-base vs `main`, a specific
   commit, or a range)?

You may read *metadata only* (folder tree, `git log --oneline`) to help the user
choose; that is orientation, not the scan. If the user already named a scope,
confirm it in one line and skip the question.

**scope vs context.** The answer is the **scope** — the only thing you score.
**Context** is everything else you may read to judge the scope well (callers,
callees, related files, config, `CONTEXT.md`); read it freely, never score it.
Narrowing the scope to a diff never narrows the context you may read — that split
is what keeps the field of view wide. Before hunting, **orient**: map the folder
structure around the scope and trace its callers/callees so reachability
(security), hot-path (performance), and coupling (learning) come from code, not
guesses.

## Output

Report in the conversation by default — defect modes ordered P0→P3 then a short
**Strengths** section (≤3, omitted if none earn it); learning ordered
Core→Notable→Nice-to-know (no Strengths). No overall grade/summary — Strengths are
specific lens-bound items, not a vibe score, so they don't smuggle the banned grade
back in. Just the ranked items plus, for defect modes, the capped Strengths. If the
user wants it saved, hand the report to the `to-html` skill (in-repo, optional —
does not violate the standalone rule in ADR-0002, which is about the core
scan/scoring, not optional rendering).

### Finding format

One block per finding, in priority order. Keep it tight:

```
**[P0] SQL injection in `getUser` — Critical · Effort S**
- Where: `src/db/users.ts:42`
- What: request `userId` is concatenated straight into the query string.
- Scores this because: untrusted input reaches a SQL sink → data exposure /
  auth bypass (Critical); a one-line parameterise fixes it (S).
- Fix: use a parameterised query / prepared statement.
- Assumed: `userId` is request-supplied — unconfirmed.   ← only when an
  assumption or unverified path backs the score
```

### Lesson format (learning mode)

learning emits **Lessons**, not findings — one block each, ordered by Value, no
P-priority:

```
**[Core] `OrderService.settle` settles payment, stock, and coupon in one transaction**
- Where: `src/order/service.ts:88–140`
- What it does: on order confirm, runs payment auth → stock decrement → coupon
  burn, in that order.
- Behavior: any of the three failing rolls the whole thing back (single DB
  transaction); nothing is partially applied.
- Why it matters: this is the scope's core invariant — miss this flow and the
  rest won't make sense.
- Go deeper: coupon burn is made idempotent separately by `CouponLedger` (line 205).
- Inferred: the all-or-nothing intent is read from the code, not a documented
  decision.   ← only when the "why" is a reconstruction
```

### Strength format (defect modes)

Defect reports close with a **Strengths** section of ≤3 items, after the ranked
findings. Omit the section entirely if nothing earns it. One tight line or block
each — no Severity/Effort/Priority:

```
### Strengths

- **Injection surface closed in `db/`** — every user-facing query goes through a
  prepared statement; the SQL/NoSQL injection this mode hunts has no entry point
  here.
- **Authz centralised in `requireRole`** — handlers delegate to one guard rather
  than re-checking, so there's no drift for an attacker to slip through.
```

Each Strength names *where*, *what risk*, and *why it's covered* — the same
evidentiary bar as a finding, just pointed at what's right. Skip anything that's
merely "clean code"; a Strength must be lens-bound and non-trivial (see
**Strengths** above).

### Noise control

A relentless scan must not drown its own signal.

- **No cap on findings — noise control shapes the report, never the scan.**
  Dedup and tier-condensing compress what you found; they are not a reason to
  find less. If a spot clears the mode's bar, it goes in the report. Never
  trim the list to a "reasonable-looking" length.
- **Dedup by root cause (or root concept).** One finding per cause / one Lesson
  per concept, with a count of sites — not one per occurrence.
- **Don't bury the top.** Report the high tiers in full (defect: P0–P2; learning:
  Core / Notable); render the lowest tier (defect: P3; learning: Nice-to-know)
  as a compact one-liner each — `[P3] title — where` — instead of full blocks,
  so every finding stays visible without drowning the top. Expand any of them
  on request.
- **No silent caps.** If the scope is too large to cover fully, say what you
  scanned and what you skipped. Never imply coverage you didn't do. Conversely,
  name the hunt categories you swept that came up clean — "looked, found
  nothing" is signal too, and it proves the sweep happened.
- **Strengths are highlights, not an inventory.** Cap at the top 2–3 and omit the
  section when none earn it. Padding the report with faint praise drowns signal
  the same way a pile of P3 nits does.

## Mode extensibility

Modes are a list, not a fixed enum — each is one section here plus one menu
entry in SKILL.md. **learning** is the proof: it was deferred past v1 because
study points aren't defects and don't fit the Severity×Effort model. It shipped by
getting its own single-axis **Value** scoring instead of being forced into the
priority matrix — and the Score / Report steps in SKILL.md branch on
defect-vs-learning. A future mode that doesn't fit the defect shape can do the
same: define its own axis in its section, then add the branch. See
[ADR-0003](../../docs/adr/0003-grill-code-learning-mode-uses-its-own-value-axis.md)
for why learning got its own axis instead of being forced into the matrix.
