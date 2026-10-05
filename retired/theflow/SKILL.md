---
name: theflow
disable-model-invocation: true
description: The working discipline for any substantive change to a codebase whose identity is a hard boundary (an engine/library/core that must not absorb its consumers' concerns) — a portable seven-step method plus the reasoning habits behind it. Steps — (1) verify references, external facts, and precedent against real source before guessing — starting from the worked issue's own cluster (its spine), since a ticket read months after it was filed no longer carries the context that made it obvious, and then from the project's dependency/territory map where the bindings name one, since the half a ticket structurally cannot carry — what else moves, and which decision the shape came from — arrives as rework if it is first read at step 5, (2) draw the mechanism/policy boundary in code — dependencies leak both ways, so never misdiagnose a contract as a defect, (3) build pure logic test-first via TDD behind a test-trust gate (a test must fail when the fix is off and pass only for the right reason), (4) prove behavior with a real round-trip, not a fake backend — including linking into a consumer so its bug-pinning test breaks, (5) run an adversarial completeness pass as a subagent briefed on *both* corpora at once — the sibling implementations and the reference — so a divergence arrives with its direction already decided rather than as an errand for the main thread, and briefed to return *graded* findings so harvesting the pass does not cost more than running it; a second lens is bought with *stance* (one hunts gaps, one refutes them) and only on the sacred surfaces, never by splitting the reading in half, (6) sweep every surface that describes the behavior — docs, changelog, public API docs, glossary, decision records, examples — and reclaim now-false rationale, (7) run every gate then PR/merge, and after release close the downstream loop by removing the now-stale consumer workarounds — plus a promotion rung that runs on a *cluster's* clock rather than a change's (when passes keep returning a recurring shape, promote the rule to a decision record instead of deciding pairwise yet again; below that bar, anchor the cluster in a spine issue at the first rhyming sibling — including a follow-up your own pass produced, when it shares the root and not merely the provenance — while *every* follow-up the user has kept, cluster member or not, is filed as a child of the issue it came out of, so the derivation is recorded as fact and the spine's roster is read off that tree instead of kept as a list that decays — no issue of any kind, follow-up or spine, is ever opened unasked: candidates are presented in one batch carrying their provenance, what has already been done about them, and whether the direction the work started with still stands), first-principles+prior-art derivation, "unconfirmed ≠ absent" (and its inverse, a cleared concern recorded with its validity condition), the issue as the durable record of rejected alternatives and negative results, decision-type routing (grill only product/identity calls), the four-part Definition of Done, and no-consumer-workaround-for-upstream-defect. Hardcodes no project vocabulary; reads the consuming repo's `docs/agents/theflow.md` (bindings), `CLAUDE.md`, and `GLOSSARY.md` at runtime for crate/module maps, reference sources, gate commands, and proof methods. Use when starting or reviewing any non-trivial code change (a feature slice, a bug fix, a refactor touching public surface) in such a repo, when deciding whether a mechanism belongs in the core or a consumer, when judging whether work is "done", or when the user invokes /theflow.
---

# theflow — the working discipline

> **Retired — no longer installed.** This skill lives under `retired/` and the
> install scripts do not link it, so `/theflow` does not resolve. It stays
> readable because the `docs/agents/theflow.md` bindings it reads still exist in
> the repositories it was run in, and those are live input to
> [`grill-the-graph`](../../grill-the-graph/), which compiles one into a graph
> rather than re-interrogating from scratch. See
> [ADR-0027](../../docs/adr/0027-retirement-moves-a-skill-to-the-retired-folder.md).
>
> It was **frozen** before it was retired — bug fixes only, no new rules. New
> work lands in the graph-engineering successor specified in
> [#13](https://github.com/kihyun1998/kihyun-skills/issues/13); see
> [ADR-0019](../../docs/adr/0019-theflow-is-frozen-thegraph-inherits-by-copy.md)
> for why that successor inherits these rules by copy rather than by reference.

The method for taking a substantive change from intent to merge in a codebase
whose **identity is a boundary** — an engine, library, or core crate that stays
correct by *not* absorbing the concerns of the things that consume it. It is a
seven-step flow — from intent through merge to a closed downstream loop —
wrapped in a set of reasoning habits: derive from first principles
*and* cross-check named prior art, treat "I couldn't confirm it" as a gap rather
than a fact, route decisions by type, and hold a four-part bar for "done".

This skill is **project-agnostic in its instructions, project-specific in its
data**. It hardcodes no crate names, commands, or reference repositories. It is
the *method*; the *bindings* — what the crates are, which reference source to
read for which change, which gate commands to run, how to prove behavior for
each layer — live in the consuming repo and are read at runtime.

## Read the bindings first (every run)

Before applying the flow, read these from the **consuming repo** to resolve
every project-specific value the steps reference:

- **`docs/agents/theflow.md`** — the bindings doc. The authoritative source for:
  the crate/module map, the Step 1 reference-routing table (which real source to
  read for which kind of change), the Step 2 boundary rule (what is "mechanism /
  core" vs "policy / consumer" *in this project*), the Step 4 proof methods per
  layer, the Step 6 behavior-describing surfaces, the Step 7 per-crate gate
  matrix, and the project's war-story index
  (concrete precedents that give each rule its teeth). **This file is the
  contract** — the steps below are deliberately generic and defer their concrete
  values to it.
- **`CLAUDE.md`** (repo root) — the project's identity and invariants (the
  boundary that defines what the core does and does *not* do). The Step 2
  boundary judgement is grounded here.
- **`GLOSSARY.md`** and **`docs/adr/`** — glossary and decision trail. Use the
  glossary's terms; check ADRs that touch the area you work in.

If `docs/agents/theflow.md` is **absent**, say so and offer to run
`/grill-the-flow` — the companion skill that authors this doc by interrogating
the maintainer through the schema below. Do not invent bindings silently. If `CLAUDE.md` / `GLOSSARY.md` are absent, degrade to
inference from the code and disclose it.

---

## The seven steps

Substantive change = a feature slice, a bug fix, or any refactor that touches
the public surface. Trivial mechanical edits (a typo, a comment, a rename the
compiler fully checks) do not need the full flow — but say *why* a step is N/A
rather than skipping it silently (a silent skip is itself an untracked gap).

### 1. Verify references and precedent against real source — before guessing

Route by **change type** (the routing table lives in the bindings doc). For each
change, identify the *real* source it must match and read it directly — not from
memory, not from a summary. "Look, compare, verify" never changes; only *which*
source you look at does.

- **Start from the cluster, not from the ticket.** An issue is written at *filing*
  time and read at *work* time; by then the context that made it obvious has
  decayed, and a fix reasoned from the ticket alone re-decides what a sibling
  already settled — which is exactly how closing one issue produces the next one.
  So before anything else, read the issue's **spine** (the cluster anchor, below)
  and the siblings it lists: the suspected shared root, what the siblings already
  established, and what is explicitly still open. Treat the spine's root as a
  **hypothesis to test**, not a fact — it was written as a guess on purpose, and
  falsifying it is a result worth recording. If the issue has no spine and you
  find yourself re-deriving a neighbouring issue's reasoning, that *is* the
  sibling signal: propose one. And when the issue in your hand was *produced* by
  working an earlier one, read the issue it came out of before its own body —
  whether it is a sibling in the routing sense is settled at filing time, not
  here, but its parent's trail is the context this bullet says decays, and it is
  the one place you are certain to find it.
- **Then read the project's own map, if the bindings name one — before Step 2, not
  at Step 5.** The cluster above is the *issue* half of the context; a project that
  keeps a dependency / territory map holds the other half, and it is the half a
  ticket structurally cannot carry: what else moves when you touch this, and which
  decision the shape came from. The bindings name it where it exists. Read it at
  **Step 5** instead — which is where this skill first reaches for it — and the
  boundary is already drawn and the tests already written, so everything the map
  would have told you arrives as rework rather than as design. Two things it
  supplies that nothing else does: a **cross-cutting invariant** promoted out of an
  earlier change, which by construction is not visible from the territory you
  happen to be standing in; and the **rule that later settles a candidate** you have
  not met yet — a distinction the area already drew, which you would otherwise
  re-derive from scratch under time pressure, or get wrong. If the bindings name no
  map, say so and move on; this bullet does not oblige you to build one.
- **Read whole files, then grep the actual lines.** Fetch the raw source
  (`gh api repos/<owner>/<repo>/contents/<path> --jq .content | base64 -d > /tmp/x`)
  and `grep -n` / `sed -n` the real lines. **Do not use a summarizing fetch** —
  summary models silently drop method bodies from large files, so a handler that
  *is* there reads as absent.
- **Concept ≠ mechanism (the core trap).** A feature has *two* reference layers:
  the **concept/UX layer** (the whole feature — it may be novel and absent from
  the reference) and the **mechanism layer** (its sub-components — text
  extraction, coordinates, wrapping, wide chars — which almost always *do* exist
  in the reference's buffer/parser layer). **Read both.** A feature being "new"
  never justifies skipping the mechanism reference.
- **Enumerate the hidden state first.** For domain-semantics work, before writing
  anything, enumerate the *hidden state* the reference implementations track in
  that area (the kind of state a first-principles model omits because it "looks
  correct"). Record it where the project keeps that list (see bindings). This is
  the systematic catch for the models that pass a naive test but corrupt a real
  round-trip. Removing a field or flag is the mirror image: a value read
  *incidentally* elsewhere (feeding a boolean, gating a branch) is unpinned the
  moment you delete it — grep every read site, even ones that only *compute*
  something from it, before removing.
- **When you *remove* a reference, say why it is N/A for this layer** — a silent
  skip is itself an untracked gap, the same rule the steps intro states.
- **External facts and secondhand statements are verification targets too.**
  Registry/version state, a published API's shape, a rate-limit ceiling — check
  them against the real source (the registry API, the raw file), not a sentence
  someone else wrote about them. The rationale *you* write in a PR body, an
  issue, or a changelog is itself subject to this: a wrong rationale committed to
  the repo record gets believed and built on later.
- **To pin a runtime fact, instrument a throwaway probe.** When the fact you need
  is a real runtime value (a coordinate, a call order, an actually-emitted event),
  write a disposable probe that prints it, read the number, then delete the probe
  — but record the number in the issue/PR. Reading the code is not the same as
  observing what it does.

**"Unconfirmed ≠ absent" (the other half of the rule).** When a summary or a
search *didn't show* a fact, do not promote "I couldn't confirm it" into "it
doesn't exist" and then build a design on the void. An unconfirmed fact is a
**gap** — surface it as an issue, or ask explicitly — never silently promote it
to a load-bearing assumption. This matters most exactly when the assumption
carries weight (a rate-limit ceiling, a ban trigger, a scope constraint) *and*
when confirming it by experiment would itself be harmful (deliberately tripping
a 429 to "check" can earn an IP ban). The asymmetry is the whole point:
re-confirming costs one more fetch; guessing wrong can cost days.

**A cleared concern is recorded with its validity condition (the inverse rule).**
When you *do* clear a worry — "this path is fine" — write down the condition
under which the clearance holds ("…as long as X stays true"). Where
"unconfirmed ≠ absent" stops you promoting a gap into a fact, this stops you
*discarding* the reasoning that made a concern safe: a bare "no problem here"
with no boundary makes the next person re-run the same investigation, and
silently breaks the day X changes.

### 2. Draw the mechanism/policy boundary in code (DoD ①)

Split the change by the project's boundary rule (defined in the bindings /
`CLAUDE.md`).

**"Consumer" here means whatever sits across the boundary from the core — not
necessarily a separate repo.** It may be a published package's dependent, or an
in-repo layer that reaches the core only through a declared seam (a frontend
driving an API, an app wiring the engine). The bindings name this project's
consumer seams; read "consumer" as *that*, not as "someone else's repository".

The portable form of the rule:

- A capability's **mechanism** belongs in the **deepest correct layer** (the
  core) when it is either (a) the hard parsing/domain step, or (b) only
  *correct* with the whole buffer/state in hand — a viewport-only consumer
  physically cannot do it right.
- Its **policy** (queries, regexes, palettes, announce policy, theme→concrete
  resolution) is **injected by the consumer**, so the core stays
  policy-/theme-agnostic. *Mechanism in the core, policy in the consumer.*
- Everything a consumer owns *by definition* (color interpretation, hover,
  pixel→cell, debounce, transport, clipboard) stays in the consumer — that is
  not a workaround, it is the boundary.

**The boundary is a membrane, not a wall — it leaks both ways.** Change does not
only flow downhill. When the core raises a floor (a minimum SDK/toolchain, a new
required capability), a caret/compatible-range constraint carries that floor
straight *down* to every consumer. And when *you* change a contract, the
*rationale* a consumer wrote for its own code can quietly become false — so a
contract change obliges you to go reclaim the now-stale reasoning downstream
(Step 6).

**The three rules below are cross-repo only — N/A when nothing is published.**
The SDK-floor constraint above, the two-consumer signal, and the report-upstream
duty all assume consumers you cannot see or edit from here. A project that
publishes nothing and whose only consumer seam is in-repo has none of that: the
seam is in the same PR and the same gate, so a drift shows up immediately. Say
"N/A because nothing is published" in the bindings rather than reading past
them — the after-merge downstream loop is N/A on the same ground.

**Two consumers reaching the same workaround is a signal, not a coincidence.**
If two or more consumers independently arrive at the *same* workaround for the
same rough edge, that is evidence the core's default is a trap — people did not
discover the right option, they hit the bug and routed around it. Read a
repeated downstream workaround as a bug report against the upstream default, and
weigh "add an option but keep the trap as the default" accordingly. But you
cannot see "two consumers" from inside one — so **report your local guard
upstream even when you fixed it correctly here**; that report is what lets
upstream see the pattern at all (judging where to fix and reporting are separate
duties).

**Do not misdiagnose a contract as a defect.** When a consumer brings you a
"bug," the first question is not *which layer is upstream* but **whose invariant
broke**. If the behavior they are unhappy with is the contract this core
*deliberately* holds, the root layer is *theirs* — they built something with
nothing valid to stand on. Fixing "at the root" here means fixing the consumer,
and treating the report as a defect would delete a contract instead of a
workaround. (The boundary above tells you which case you are in.)

**No consumer workaround for an upstream defect.** If, mid-implementation, you
find a defect or gap in a *deeper* layer (usually the core), do **not**
compensate for it in the consumer. A consumer workaround (i) hides the upstream
bug and removes the pressure to fix it, (ii) violates the boundary above, and
(iii) duplicates the same knowledge in two layers — a divergence seed. The very
urge to "write consumer code to make the test pass" is the signal. **When you
feel that urge: stop and come to the user first** — *explain the situation*
("the core hands X this way, so the consumer has to do Y to pass, but the root
is a core problem") and *ask* whether to investigate / root-fix. Do not work
around it alone, and do not silently file an issue and move on — share the
judgement. Then either (a) fix it at the root layer (after grill/surface if it's
a policy call), or (b) if it can't be fixed now, leave the gap **visible** and
tracked as an issue — and make the test assert the *real* behavior honestly (do
not feed it fake input to go green).

### 3. Build the pure logic test-first (TDD, RED → GREEN, one at a time) (DoD ②)

Drive pure logic with `/tdd` (RED → GREEN vertically, one behavior at a time).
Take side effects (ports, clock/tick, clipboard, scroll, DOM, IPC) through
**injected seams** and assert against *structural* types that the real
DOM/events satisfy as-is. The controller depends on zero infrastructure; the
public surface is the module's declared entry point.

Where **compilation itself enforces completeness** (e.g. a new wire field that
every layer must thread), strict RED is awkward — a round-trip test takes its
place. But still write the new-behavior test *before* the implementation so the
test never merely trails the code.

**The test-trust gate — a passing test proves nothing by itself.** Before you
trust a new test, clear two *separate* bars:

- **Discriminating power.** Temporarily turn the fix *off* and confirm the test
  goes red. A test that passes with and without the change asserts nothing — a
  green from a test you never saw fail is not evidence.
- **Right reason.** Assert the *side conditions* — the callback that must *not*
  fire, the exact count, the resulting state — so an accidental ordering cannot
  produce a green. A single positive assertion ("it's there") can be made true
  by a bug (e.g. one call overwriting another and landing on the same result);
  the surrounding negatives are what expose it.

### 4. Prove behavior with a real round-trip — not a fake backend (DoD ④)

A fake backend or a demo is a *feel* smoke test, **not proof** — a fake can pass
while the real thing differs. Per slice, at least once, cross-check the
assumption against the *real* core or reference. The concrete proof method per
layer lives in the bindings doc (e.g. an encode→decode round-trip, a conformance
suite, a real captured input stream, a real browser drive, a headless
end-to-end run). Two recurring traps the bindings should call out:

- **A green headless E2E proves only what it consumes.** If a change has a
  *visual/DOM side effect* (focus, scroll, reveal), a headless run that only
  asserts the consumed proxy (an announced string, a console signal) does **not**
  verify it. Assert the DOM state directly, or drive it live, then lock the
  regression in.
- **Beware a tautological proof** — a check that can only confirm what it
  assumes, or a measurement that can misread itself. The bindings name the
  project's specific ones.

**The strongest proof runs in a real consumer.** For a change to a core with
downstream consumers, a synthetic in-repo repro passing only means "it works in
the scenario I imagined." Link your local build into an *actual* consumer, run
its **full** suite, and the strongest possible evidence is a consumer test that
*pinned the old bug as its expected value* now **breaking** — a symptom the
consumer independently observed and froze has disappeared, while the rest of its
suite stays green (no regression). The concrete linking mechanism per ecosystem
lives in the bindings.

### 5. Adversarial completeness pass — the lens, via subagent (DoD ③)

Gate this step on **enumeration risk**, not on "which layer" or diff size. If a
change has the property that *your own hidden-state enumeration could be
incomplete* (many edges/states, domain semantics, cross-feature interaction),
this step is **mandatory** — as is any path the bindings name as an
**unconditional trigger** (the project's sacred surface, where a bug costs more
than a wrong number). An unconditional trigger overrides the judgement above:
you do not get to reason your way out of it because the diff looks small.

**Position — normally here, but FIRST when the work starts as an open decision.**
When the issue's own acceptance reads "decide (a) or (b)", run this pass on the
**options**, before proposing the choice — not on a diff, after implementing it.
Otherwise the enumeration arrives after approval and the person who approved it
decided on incomplete information: the costs the lens then finds were parts of
the decision, and they get demoted into follow-ups. The tell is cheap to notice —
you are about to write "the tradeoff is X" in a proposal and X came from your own
reading rather than from a lens. A decision is presented **with** its enumerated
consequences, or it is not ready to present.

The trigger in practice: a reactive spike that keeps catching *new* gaps one
probe at a time — that is not bad luck, it is the signal that your enumeration
is incomplete. Stop probing randomly and run a **completeness critic** as a
subagent — *one* lens, briefed on **both corpora at once**:

- **this repo's siblings** — the project's hidden-state list plus a cell-walk
  diff against the features that already solve the adjacent problem;
- **the reference implementations** — the real upstream source, systematically
  enumerated.

**Both corpora in one lens, not one lens per corpus.** A lens holding half the
material can see that two things disagree but not which one is wrong, so every
divergence it reports comes back to your main thread to be adjudicated *from
cold* — against material the other half already had open. And the split does not
buy what it claims: two subagents on the same model with the same brief share
every blind spot that matters and differ only in which files they read, so
splitting by **corpus** buys coverage while calling it independence. Give the
reading to one lens and the blind spot is unchanged while the adjudication comes
free.

The critic produces a hidden-state / edge matrix that either (a) surfaces the
remaining gaps at once or (b) *proves convergence* (everything else is covered).
Unlike a random spike, this has a visible **end** — the confidence to stop.
**Never drop a corpus** because "the fix is small" — that, not the agent count, is
what the old never-collapse rule was always protecting: a pass that stops reading
the reference stops finding what only the reference knows. Conversely, for a
genuinely **closed surface** (a purely mechanical change the compiler +
round-trip gate exhaustively), this pass may be skipped — but **record that
judgement explicitly** so the skip is not itself a silent gap.

**Where a second lens still earns its cost, split it by *stance*, not by corpus.**
On the surfaces the bindings name as **unconditional triggers**, run a second
critic over the *same* material with the opposite job: the first hunts gaps, the
second tries to **refute** them and to break the convergence claim. That is the
independence a corpus split only claimed — and because both lenses read
everything, each can still adjudicate a direction, so disagreement between them
is information rather than an errand for you.

**The re-gate is scoped, or the pass never terminates.** Fixing a lens-caught gap
does not by itself owe *another* completeness pass: taken literally that recurses with
no base case, so in practice it gets skipped in silence — and a rule you always
break is worse than one you never wrote. The fix re-enters the lens **only when it
opens a surface the pass did not walk** (a new call site, a new state, another
layer). Otherwise it is covered by that pass's own convergence claim — and you say
which of the two it was.

**Require a disposition grade on every finding.** A lens that returns bare claims
has moved the entire adjudication cost onto your main thread, one reproduction at
a time — the pass then costs far more *after* it finishes than while it runs. The
brief must fix the output shape, not only the search area:

| Grade | What the lens is saying | What it costs you |
|---|---|---|
| `CONFIRMED` | reproduced, with `file:line` and the path that reaches it | reproduce, then fix |
| `UNADJUDICATED` | the **sources** cannot settle it — the reference is silent, self-contradictory across its own call sites, or the outlier | the user's batch, as a decision — not yours to investigate alone |
| `INERT` | a true observation with no reachable consequence | one line of acknowledgement |
| `DELIBERATE` | matches a contract or an already-recorded decision | one line of acknowledgement |

The last two rows are the ones that pay. A lens that has *already* reasoned its
way to "no action" is handing you that reasoning; re-deriving it from scratch buys
nothing and is indistinguishable, in cost, from the finding having been real.

**A grade routes a finding; it does not discharge it.** Row two sends its finding
to *the user's batch*, and what arrives there is governed by the batch's own
contract (§ "A candidate is presented with its disposition"), not by the grade that
routed it — the lens's `UNADJUDICATED` says the sources could not settle it, which
answers exactly one of that contract's columns and none of the rest. Grading the
lens and then handing its finding on ungraded reproduces, one level up, the exact
cost this table just removed.

**A reference can demolish a claim that rests on it; it cannot erect a claim about
your design.** The two directions are not symmetric, and collapsing them is how a
read-only pass starts proposing architecture. If you imported prior art to support
a decision, prior art can take that support away — that is a return, not an
intrusion. But a finding whose whole content is *"the reference does it another
way"* has not named a defect; it has named a different design, and on a layer where
the bindings' tie-breaker gives the reference no authority it cannot become one.

The test is mechanical, and it runs **before** the direction question below —
direction only matters once something is a defect:

> **Restate the finding without naming the reference.** If it still stands — *"this
> code does X, and our own record/contract says Y"* — it is a defect, and the
> reference was a search index that pointed at it. If the reference cannot be
> removed from the sentence, it is a design proposal: graded `DELIBERATE` against
> the record that already chose otherwise, or carried to the user as a proposal.

Findings that pass are stronger for it — the reference has left the argument, so
nothing about them depends on a tie-breaker at all. Findings that fail are the
expensive ones: they arrive `CONFIRMED`, read as urgent, and propose replacing a
decision the project made on purpose. The bindings name the divergences a project
holds deliberately; that list is what this test is checked against, and a lens that
lands on one owes the citation, not a proposal.

This is the operational form of *"classify findings against the record before
reporting them"* (§ "Route decisions by type"). That rule states the obligation and
this states the test, because the obligation alone does not fire: the pieces can all
be present — the tie-breaker in the bindings, the `DELIBERATE` grade in the table,
the classify-first sentence in the habits — and a reference-shaped proposal still
reaches the user as a peer option, because nothing in the harvest asks the question.

**And the brief owes the lens that list, or the test can only fire on your main
thread.** The obligation above is the *lens's*, but it is discharged against two
things only the project holds: the **tie-breaker row for the layer the change sits
on**, and the **deliberate-divergence list**. A brief that fixes the corpora and the
output shape but hands over neither has told the lens to check its findings against
a record it was never given — so every reference-shaped finding arrives ungraded and
the test falls back to the harvest, one reproduction at a time, which is the cost the
grade table exists to remove. Carry both into the brief alongside the frontier. The
tell that a brief is missing them is a lens that reports a divergence on a layer
where its own bindings give the reference no vote at all — and reports it as urgent,
because from inside the brief it *is*.

**This narrows the grade, never the reading.** Both corpora stay whole: a layer
where the tie-breaker gives the reference no authority is still a layer where the
reference knows things nobody else does, and *"the reference cannot win here"* is
the same skip as *"the fix is small"* wearing better clothes — the never-drop-a-corpus
rule covers both. What the authority changes is what a divergence *costs*: on such a
layer it comes back `DELIBERATE` with its citation instead of `CONFIRMED` with a
proposal attached.

**A divergence is not a direction — and the lens now owes you the direction, not
just the difference.** Reporting "this differs from X" has *not* said "move to X".
Which way it goes depends on whether the **other corpus** shares the divergence:
this layer alone drifted → move toward the reference; this layer *and* its
siblings agree against the reference → a **family** decision, so hold the
consumer-neutral behaviour now and track the parity fix as one coordinated
change. This is precisely the call a half-briefed lens cannot make and the reason
the brief carries both corpora: the finding arrives adjudicated instead of
arriving as work. What legitimately survives as `UNADJUDICATED` is only the case
where the *sources* fall silent — and that is a decision for the user, not an
investigation for you.

A gap sends you back to Step 3 (a TDD fix); convergence lets you proceed.

**The pass has a second product, and it runs on a different clock — see
"Promotion" below.** Besides gaps, a pass yields evidence about *why* the gaps
keep appearing, and that evidence promotes to a decision record. But gaps are
**per-change** while a cluster re-deciding itself is **per-cluster**: most passes
produce none of it, so carrying the promotion machinery inside every pass is how a
read-only background step grows a second job it pays for on every run. Harvest the
gaps here. Run the promotion check only when this pass hands you **two or more** of
the triggers that section lists — which is a question you can answer in a sentence,
without reading the rest of it.

### 6. Sweep every surface that describes the behavior

No substantive change ends at the code. Every surface that *describes* the
behavior drifts the moment the behavior moves, and nothing compiles the drift
away — so sweep them by hand:

- **Docs and generated API docs** — public doc-comments ship verbatim as the
  package's API reference; they are the surface most likely to still describe the
  old behavior (often the *last* thing describing a fixed bug as a contract).
- **Changelog / release notes** — if the ecosystem snapshots the changelog at
  publish time, never rewrite a published entry; open a new one. Do not let the
  repo and the registry claim different things for the same version.
- **Glossary and decision trail** (`GLOSSARY.md`, `docs/adr/`) — if you changed
  what a domain term *means*, update the glossary in the same change, or the
  project spends a release saying one thing and doing another. **The decision
  trail is a *write* surface, not only the read surface the bindings step treats
  it as**: a change that falsifies a record's premise amends *that record* (a
  status note, a superseded-by line) in the same change, and a promotion (§
  "Promotion", below) lands here. A trail that is only ever read drifts into a museum, and the
  decisions that should have gone in it end up scattered across issues and
  doc-comments where nothing cross-checks them.
- **The cluster's spine** — when a sibling closes, fold back into its spine what
  the work settled: the suspected root **confirmed or falsified** (the falsified
  one is the more valuable of the two), the numbers you measured, any new sibling
  the pass surfaced, and what is *still* open. Do it in the change that settles
  it, not in a later sweep. A spine written only at filing time decays exactly
  like the ticket it was meant to outlive: the next sibling then starts from the
  ticket again — the very loop the anchor exists to break — and promotion stops
  being a copy, because the roster has names but no findings. This is the
  write-back half of the Step 1 obligation to read the spine first; a ledger only
  pays off if both halves run. **Where it lands does not vary by project**, and it
  splits by what kind of statement it is. A sibling the pass surfaced is
  **enrolled into the tree**, since the relation *is* the roster and a comment
  announcing it is not. The spine's *judgements* — the root now confirmed or
  falsified, what is still open, any exclusion this pass established — are
  **edited into the body**, because they read as current state and leaving them
  stale is a false status report, the same reason a live checklist is edited
  rather than annotated. The evidence behind each finding goes in a **comment**,
  which is the belief-record half and must stay append-only. What never goes into
  the body is the roster itself: the tracker already answers which siblings there
  are and which are still open, and a second copy of that answer only creates
  somewhere for it to disagree with itself.
- **Examples, demo headers, spike comments** — these are specifications; each
  promises only what it can actually demonstrate (do not tell the reader to
  "watch it change" a value that is in fact constant).
- **Reclaim now-false rationale.** Across sequential PRs, a justification written
  in an earlier PR, changelog, issue, or decision record can be made *false* by a
  later one — and no one re-reads it. Walk the recent rationale explicitly and retract what the
  new behavior falsified. (The surviving reasons are usually the transitive ones
  — e.g. "you cannot lose what you never had.")

The concrete list of surfaces for this project (which doc files, whether the
changelog is snapshotted, the toolchain-floor manifest) lives in the bindings.

### 7. Run every gate, then PR / merge

Run **all** of the project's gates — including the blind-spot ones a single
top-level command does not reach (out-of-workspace members, host-vs-target
compile splits, separate manifests, formatter pins, browser E2E). The exact
matrix per crate/layer lives in the bindings doc; the recurring lesson it should
encode: a top-level "test everything" command often *does not even build* the
excluded members, so rename/public-path changes need their own explicit check.

Then: a branch named to the project's convention, referencing the issue → a
squash PR that closes the issue → confirm the project's CI jobs are green. (Do
not sit watching CI *during* implementation — the local gates mirror it; CI's
real value is the release gate and any job that only runs in a real
browser/target.)

- **Run each gate bare, never piped.** `test … | tail -1 && commit` always
  commits — a pipeline's exit status is the *last* command's, and `tail` always
  succeeds. A gate you cannot fail is not a gate (same root as "report only what
  you verified").
- **Never move a gate threshold to turn a build green.** Lowering a coverage
  floor / lint budget / size limit to pass permits exactly that much regression,
  and real regressions come to rest just under the threshold. Raise it when the
  real number rises; never lower it to clear a red build.

### After merge — close the downstream loop

Fixing at the root and releasing is only *half* of the no-consumer-workaround
law (Step 2); the other half runs *after* the release. A root fix that ships but
leaves consumers holding their old workarounds has just relocated the
divergence. So, once released, in each consumer: raise the constraint to the
fixed version, **remove the workarounds the fix made unnecessary**, and **flip
the tests that pinned the old bug as expected** (the same tests that broke in
Step 4). Leave in place any workaround that was *never* a bug-avoidance to begin
with — record *why* in a comment so it is not later mistaken for stale. A release
that is purely additive (a new constructor, a new option) obliges consumers to
do nothing — say so explicitly. Derive the consumer list **at that moment** —
grep the sibling manifests for this package's name — and do not store it
anywhere: a stored list is a derivable fact that rots the day a consumer or a
constraint changes.

---

## Promotion — when a cluster keeps re-deciding the same model

**Not a step, and not per-change.** This runs off Step 5's *second* product —
evidence about why the gaps keep appearing — and it fires on a cluster's clock,
not a change's. Step 5 asks one question of it: did this pass hand me two or more
of the triggers below? Almost always the answer is no and nothing here applies.
When it is yes, the work is real and this is where it lives, so that a pass whose
output is a *shape* rather than a gap list has somewhere to put it.

Each trigger is observable, not a feeling:

- you are deciding a pair of participants you have **already decided before**, in
  a different combination;
- the issue you are working was surfaced by another issue's Step 5 — and *that*
  one was too (a chain, not an edge);
- you measured an earlier issue's stated **premise false** before you could
  start;
- the **reference cannot arbitrate** — silent on the question, self-contradictory
  across its own call sites, or you concluded it is the outlier;
- two artifacts **inside this repo require opposite things** (two tests, two
  modules, a doc and a pin).

One of these is bad luck. **Two or more, and you are re-deciding a model you
have never written down.** The state space is combinatorial and the pass is
walking it, so every new combination arrives as a fresh decision and each one
reinterprets the last. Stop and promote: write the rule as a **decision record**
(the project's ADR-equivalent, named in the bindings) that makes *every*
combination resolvable by construction, then re-file the current issue as a
**conformance item** under it. An issue records one decision with its rejected
alternatives; it structurally cannot hold a rule that spans decisions, and a
doc-comment pins that rule to one branch of the code.

A record earns its place by **deriving** decisions already taken, not by listing
them — if it only restates the answers you have given, it is a filing cabinet
and the next combination will still need its own decision. Check it against the
existing tests: the ones it reproduces are its evidence, and the ones it
contradicts are its findings (adjudicate them, do not quietly flip them).

**The same anti-cascade bar applies.** Fewer than two triggers is not a decision
record. A record per pass is the same failure as an issue per observation: the
trail grows faster than the code, every entry looks equally load-bearing, and the
ones that mattered are hidden among the ones that were merely true.

**But the rung below the record is a spine, not the void.** One trigger is a
decision and belongs in its issue as usual — *and* that issue attaches to, or
opens, the cluster's **spine issue**: the hypothesis anchor described in the
filing outcomes below. So a throughline has a home from the first rhyming sibling
instead of being reconstructed once the cluster is already closed. At two
triggers the spine *promotes* — its accumulated sibling roster and measured
numbers become the record's context almost verbatim, so promotion is a copy
rather than archaeology across a dozen issues. A spine that never reaches two
triggers closes as "a single decision after all"; the anchor was cheap to open
and is cheap to retire.

**Promotion closes the anchor.** Once the record exists, the spine is closed with
a pointer to it, and the area's later issues arrive as conformance items *under
the record* — not as siblings under a spine that is still collecting. Leaving both
open is the one failure this whole rung is meant to prevent: two homes for one
throughline, each holding half the roster. The closed spine **keeps the children
it already has**: they are the roster the record's context was copied from, and
re-parenting a settled cluster is churn that buys nothing — only issues filed
*after* the promotion attach under the record. Copy that roster **through the
spine's exclusion list**, never off the raw subtree: the subtree is provenance
and may hold more than the cluster, and promotion is the one moment where
skipping the filter makes the padding permanent.

---

## The reasoning habits behind the flow

These are *why* the steps are shaped as they are. They apply throughout, not
only at their named step.

**First principles + named prior art, together.** Architecture and
domain-semantics decisions are derived from first principles *and* cross-checked
against named prior art. Convergence between the two is the signal of
non-arbitrariness; prior art shaves the details a first-principles model
under-reaches. "Perfect" is not "maximally granular" — it is the *right* grain.
Where a project declares a **tie-breaker** in its bindings — what wins when prior
art and the project's own evidence disagree — that tie-breaker governs; prior art
is a cross-check, not an authority that outranks the project's own measurement.

**Route decisions by type.** A pure technical mechanism (wire format, coordinate
system, API shape — anything *derivable* from code + named prior art) is **not**
something to grill the user about: decide it yourself, verify against real
source, and present the result for a yes/no. Asking the user what the code
already answers is offloading work. **Grilling and open questions are for
product / identity / priority calls** (naming, repo structure, scope, vision —
where the user holds an opinion and will correct you). Decisions often *firm up
at implementation time*, when the real encode/decode details settle them.

**Then record which type it was — routing that only reaches the asking is half a
rule.** A derivation and a product judgement have *different reversal criteria*: a
derivation falls to a better derivation, a product judgement falls only to the
person who made it. If the record does not say which one it holds, everything in
it reads as a derivation, and the next strong argument — often one your own
adversarial pass produces — reopens a call the owner already made. So when the
decision was theirs, write the **event**, not just the reasoning: what they were
shown, what the alternatives looked like, what they chose, and that it is theirs
to reverse. The reasoning still goes in (it is why the answer is coherent); the
event is why it is *the* answer.

**Record what it was decided *on*, too — a call inherits the blind spots of the
thing it was made against.** "The owner decided" is only as strong as the view
they decided from. So when a later finding contradicts a recorded choice, the
question is not *may I reopen this* but **could the artifact behind it have shown
this?** If it could and they chose anyway, it is settled and the finding is
context to record — file it, since it usually names a real failure mode. If it
could not, the call is not settled, it is **untested**, and the honest move is
neither silent deference nor silent escalation but a better artifact. Say which
of the two you are in when you bring it back.

Classify findings against the record *before* reporting them — "which of these is
already decided, on what, and by whom?" — and carry the rest. Doing it after is
how an adversarial pass turns into a re-litigation of everything it touches.

The corollary is about the artifacts themselves: **build them to answer the
decision, not to carry the argument.** A prototype scoped to the point you are
making produces a decision about the prototype. Widen it until it can show the
cost of being wrong — neighbours, sibling states, the other paths through the
same rule — because that is the part the owner cannot ask for: they do not know
what you left out of frame.

Watch the scope of a recorded choice too. What the owner actually judged is what
they were shown; a decision about one thing does not settle its neighbours just
because the same change produced them. Say in the record what the choice did
**not** cover, or the next pass will read the neighbours as decided.

**Definition of Done — no hand-waving.** A slice/feature is "done" only when: ①
the skeleton (contract, boundary) was right from the start, ② the logic is 100%
tested, ③ gaps are a **tracked zero** — every deferral was *surfaced to the user*,
and the ones they kept are filed, so there are zero *silent* gaps (a gap the user
saw and declined to track is not silent; one you filed unasked is not thereby
handled), and ④ the behavior proof is a *real* core/reference round-trip, not a
self-fake. A fake backend passing is not proof (see Step 4).
"Looked at the result and moved on" violates ② and ④.

**Defer means surface it now — but never file an issue on your own.** A
deferral, a skip, an accepted trade-off, a lens's residual gap must not evaporate
into a PR body, a code comment, or an agent report; those get buried on merge.
**Collect** them as you go and **present them to the user in one batch**, with the
evidence beside each, and file only the ones they approve. Filing is an outward,
durable act: it puts a claim in a tracker other people will act on, so it carries
the same bar as any other reported fact.

**A candidate is presented with its disposition, or it is not ready to present.**
The rules that follow — verified yourself, currently real, dismissible on a
citation, searched by artifact — say what a candidate must *survive*. None of them
says **when**, and the batch is exactly where that bites: an item can satisfy every
one of them and still arrive as a handful of open questions, because nothing
obliges the answers to travel with it. The user then adjudicates one question at a
time — *"did you measure it? does the reference say anything? is there already an
issue for it? where did this even come from, and have you already acted on it?"* —
which is precisely the cost the lens's grade table (§ Step 5) exists to
keep off *your* main thread, one level down. It is the same contract one level up,
and it is cheaper to meet than to answer:

| Column | What it holds | What it may say instead |
|---|---|---|
| **Measured** | what *you* reproduced, with the number | *"not reproduced — would cost X"*. Then it is a question you are asking, not a proposal you are making, and say so |
| **Reference** | what the named prior art does, cited | *"no recorded tie-breaker for this layer"* — a real answer, and often the one that decides the direction is not yours to pick |
| **Tracker** | `owned-by #N` · `conflicts-with #N` · `sibling-of #N` · `nothing` | nothing. This column is never blank — see the search rule below |
| **Direction** | the fix you propose, with its cost | *"undecided, because …"* — an issue may legitimately hold an open decision, but not an unexamined one |
| **Provenance** | where it came from — `found working #12, at step N` — naming the issue whose work produced it | *"unprompted — hit it while reading X for something else"*. Never blank either: an item whose origin you cannot state is one the user cannot weigh |
| **Done already** | what you have *already* changed, run, or committed on account of it | *"nothing yet"* — the ordinary answer, and still worth writing, because silence here reads as *a fix is already in the tree* |
| **Still the agreed call?** | whether the direction the work set out with survives this item — `unchanged`, or what moved | *"it moved — here is the point it diverged"*. Never omitted: an item that quietly changes the plan is the one case where saying nothing is itself the error |

**The first four columns say whether the item is real; the last three say what has
already happened around it.** Both halves are load-bearing and only the first is
about the defect. A candidate surfaces mid-flight to someone who was *not* watching
the work that produced it, so *"which issue was I in, what have I already done, and
does this change what we agreed to do"* is the whole of what they need in order to
answer — and none of it is recoverable from the defect description, which by
construction describes the code and not the work. The last column is the easiest to
skip and the most expensive to have skipped: a batch of individually reasonable
items can add up to a different plan than the one that was approved, and the moment
of presentation is the only place anyone sees that.

**Assembling the batch is the search's deadline.** The rule below puts the search
at *naming*, which is earlier and right — but naming is a moment only you can see,
so it is easy to pass without noticing, and nothing downstream reports that you
did. Presentation is not like that: it is an act with a witness. An item that
reaches it with a blank **Tracker** column is not a candidate, it is unfinished
work, and the two outcomes that cost the most both land here rather than in your
reading — a candidate an existing issue already owns is a **comment** and never a
sibling, and one whose proposal would break an open issue needs the cross-link
written in the same act of filing. Neither is an answer the user can give you, and
neither costs more than one tracker query by artifact.

Two rules keep the tracker worth reading:

- **Only what you verified yourself.** A subagent's probe, a lens report, or your
  own inference is a *candidate*, not a finding. Reproduce it — a probe you ran, a
  mutation you watched go red, a line you read — before proposing it. "The agent
  found X" is not evidence you may file.
- **Only what is real now.** A consequence that needs a hypothetical consumer, a
  feature nobody has asked for, or a config nobody runs is a note for the code
  comment, not an issue. An issue that already owns the mechanism takes a comment
  rather than a sibling — the search step below says when you find that out, and
  what else you owe it once you have.

**The bar is asymmetric — reproduction is the price of *acting*, not of declining
to.** The rule above governs what you put *into* the record: filing an issue or
committing a fix rests on evidence you produced. **Dismissing** a candidate does
not carry that bar, and reading it as though it did is expensive in a way nothing
warns you about — the reproductions that end in "not a defect after all" are pure
loss, and they are exactly the ones with no fix at the end to make the cost look
earned. To drop a candidate it is enough to **cite** the ground: the reference at
`file:line`, the contract it matches, the record that already decided it, or the
reporting agent's own `INERT` / `DELIBERATE` grade. What you may not do is drop it
on a *feeling* — a dismissal with no citable ground and a dismissal that would
need **original investigation** are the same case, and neither is a dismissal:
both go into the user's batch as candidates, with what you know and what it would
cost to settle. Deciding it alone is how a real defect gets talked away, and
investigating it alone is how the harvest outgrows the change that triggered it.

The failure this prevents is a **cascade**: a completeness pass yields a dozen
observations, each filed on sight; working one of them runs another pass, which
files more. The tracker grows faster than the code, every entry looks equally
load-bearing, and the ones that mattered are now hidden among the ones that were
merely true. Prefer *fewer, verified, currently-real* issues — and say plainly, in
the PR, which candidates you dropped and why, so dropping is itself recorded.

(Exceptions to proposing at all: a standing tracker already covers it, or it is an
inherent decision a code-doc records fully.)

**Search as soon as you can name the artifact — before you reproduce, never later
than the batch — and file *into* the cluster, not beside it.** Search the tracker
by **the artifact it touches** (the module, the wire field, the predicate, the
config key), never by the feature name: a related issue almost never shares your
vocabulary. Naming is when it is *cheapest*; presentation is when it is *due*, and
only the second one is an act with a witness — which is why the batch contract
above makes the result a column rather than leaving it to this rule alone.

**The trigger is naming, not deciding.** The moment you can say which artifact the
candidate touches — which is usually while reading, before any probe — search.
Ordering it after reproduction, as *"search before you file"* does, spends the
expensive step first: the rule above rightly requires a reproduction to *propose*,
so a candidate that an existing issue already owns gets reproduced and then thrown
away, and the tracker may well hold a **better** measurement than the one you were
about to take. This is the one ordering the asymmetric bar does not already cover
— dismissing on a citation is cheap, but *proposing* is where the cost lands, and
that is exactly the path a real defect takes. Filing still happens later; this
governs only which of the two you spend first.

The search has four outcomes.

- **The issue already exists** — it owns this defect. Do not open a sibling; if you
  have anything to add, comment there. **And read what it already decided before
  you propose a direction**, including the ones it *rejected*: an issue is the
  durable record of rejected alternatives (below), and that record only pays off if
  someone reads it at the moment they are about to re-propose one. This is the
  cheapest failure in the whole step and the least visible — the owning issue can
  have recorded the exact rejection, with its reason, and still be walked past,
  because nothing in the search step sends you to it. Its rejection may also rest
  on a **decision record** ("widening this field would entrench the violation this
  issue exists to remove"), in which case the record binds your direction too, not
  just your filing location.
- **A conflict** — an existing issue whose proposal your change would break.
  Cross-link **both** ways in the same act of filing, and say which decision must
  come first; a one-way link is only ever found by whoever reads the newer issue.
- **A sibling that shares your root without conflicting** — a second issue in the
  same mechanism: the first sign of a cluster. **First check whether that area
  already carries a decision record — accepted *or* proposed.** If it does, the
  throughline already has a home: file a **conformance item under that record** and
  do not open a spine. A *proposed* record is doing a spine's job by construction
  (a hypothesis, a roster, an explicit not-yet-decided list), so a spine beside it
  would split the roster in two. The bindings name the areas that already carry
  one; that list is the check, and it is cheaper than re-deriving it per filing.
  Otherwise there is nowhere to put the throughline yet (a record needs two
  triggers; an issue holds one decision), so propose a **spine issue** —
  `spine: <suspected shared root>`, one per artifact family. Its body is a
  **hypothesis, not a decision**: the suspected shared root, the sibling roster,
  and what is explicitly *not yet* decided. It promises
  nothing, so it is free to close as "one decision after all". **The roster is not
  a list in the body — it is the spine's subtree** in the tracker's parent/child
  relation (GitHub's sub-issues, an epic, a parent field). The split is between
  kinds of statement, not between formats: the body holds the *judgements* (the
  suspected root, the not-yet-decided list, the exclusions below), the tracker
  holds the *facts*, and it holds the one the body would get wrong first — which
  siblings are still open. A hand-kept roster is prose, and prose is exactly what
  this rung has already been burnt by: it decays like the ticket the anchor was
  meant to outlive. Where a tracker has no parent/child at all, the roster falls
  back to the body — then **say so in the spine** and reconcile it at every
  write-back, because it is a known-decaying copy.
  **Enrolment is not only for new siblings.** A spine opens at issue *two*, so
  the siblings that motivated it are already filed and their filing time has
  passed — enrolling them is the spine's first act, in the same batch that opens
  it. Skip that and the anchor under-reports its own cluster from day one: it is
  the retroactive sweep the spine replaces, just smaller and harder to notice,
  because a roster that looks populated is not read as incomplete.
  **A spine is a node in that tree, not a root above it.** It may perfectly well
  be the child of the issue whose work exposed the cluster; nothing about an
  anchor requires it to sit at the top. What it does require is that no *second*
  spine exists for the family — if one is already there, **attach**. And it is a
  hub, so a one-way sibling → spine link suffices for anything you write by hand:
  the parent/child relation is already two-way, and the both-ways rule above is
  only for *conflicts* between peers.
- **Nothing** — an ordinary single issue.

**A follow-up that gets filed is filed as a child of the issue it came out of —
always, and without a judgement.** The "always" governs the **edge**, not the
filing: *whether* the issue is opened is the user's call, exactly as it is for
everything else (next paragraph), and only once they have kept it does the
parenting below become unconditional. When the issue you are about to propose was
*produced* by working an existing one, parent it to that issue **through the
tracker's own parent/child relation** — GitHub's sub-issues, an epic, a parent field — in the
same act of filing. A `spawned by #12` line in the body is the fallback for a
tracker that has no such relation, never a substitute for one that does: the
relation is what renders the tree and reports each node's state, and a body line
is a single hop that only whoever already opened the child will ever see. This
decides nothing and costs nothing: "B came out of A" is a fact that never stops
being true, so it clears no bar and will never need revising. What it buys is the
question that is otherwise unanswerable a month later — *what came out of this,
and what came out of that* — which no amount of re-reading the issues
reconstructs, because each of them describes a defect and none of them describes
the shape of the work that found it.

**A follow-up reaches the tracker the way everything else does — through the
user's batch, and never unasked.** The rule above fixes the *shape* of a filing,
not permission to perform one, and stating that shape as "always, without a
judgement" is precisely what makes it read as permission — so read it as scoped and
nothing more. A follow-up is a candidate: collected as you go, presented with every
column of the batch contract filled, opened only for the ones the user keeps. The
exemption is easy to infer by contrast, because the spine paragraph below spells
this out again for spines; that repetition marks the rule holding *everywhere*, not
the one place it applies. And the three columns that contract adds exist mostly for
this case — a follow-up arrives out of work the user was not watching, so **what
issue you were in, what you have already done about it, and whether the direction
you both agreed on still stands** are not garnish on the proposal, they are the
proposal. Passing every bar in this section and then opening the issue yourself
fails the one bar that was never yours to clear.

**Whether it also joins the cluster is a separate question, and that one is a
judgement.** What a follow-up shares with its parent is *provenance*; whether it
shares the **root** is a different claim, and only that one routes. "I found it
while working there" and "it comes from the same mechanism" are not the same
sentence. So run the follow-up through the three outcomes above against its
parent, with the ordinary bar. The only part you may skip is the search itself —
you already know the neighbour, you were standing in it — and skipping a search
you genuinely do not need is exactly how the routing gets dropped with it, which
is why this is spelled out rather than left to the search step. Nothing else is
skipped: the cascade bar still holds, and a follow-up that is one observation
among a dozen is a comment or a candidate in the user's batch, not an issue at
all.

**The two relations mostly agree, and the tree then costs nothing to keep.** If
the parent already sits under a spine and the follow-up shares the root,
parenting it to the issue it came from puts it in the subtree anyway — both facts
recorded by one edge, no choice to make. Only two cases force a choice, and they
resolve in opposite directions:

- **Same provenance, different root** — the follow-up stays a child of its
  parent, because the lineage is the true thing about it, and the **spine's body
  records the exclusion** ("in this subtree, not in the cluster: #48"). Do not
  lift it out of the tree to keep the roster clean; that trades a fact for a tidy
  list.
- **Same root, provenance from outside the cluster** — its parent would land it
  in an unrelated subtree, so parent it to the **spine** and put the lineage in
  its body (`spawned by #30`). Membership takes the slot only here, where the
  tree would otherwise not contain the issue at all.

Getting the judgement wrong is not symmetric. Missing a real sibling costs a
reconstruction later; counting an adjacent one **corrupts the roster**, and the
roster is what a promotion copies into the record almost verbatim — so a padded
spine does not merely look untidy, it launders provenance into evidence for a
hypothesis nothing tested. That asymmetry is what the exclusion line pays for:
the subtree is provenance and may hold more than the cluster, and the spine's
body is the only place that says which.

A spine is still an issue: it goes into the approval batch like any other and is
never opened unasked. And it does not reopen the cascade door — it is bounded by
**artifact families, not by issue count**, most encounters attach rather than
open, and because the anchor is openly a hypothesis it never pretends to be
load-bearing. (Its evidence so far is one project, whose two decision records were
both reconstructed by archaeology *after* their clusters had been filed
verb-by-verb. The anchor is deliberately cheap, so it is cheap to retire if it
does not pay off elsewhere.)

**The issue is the durable record — seed it up front, not only on deferral.**
Before the work starts, the issue already carries the *measured numbers*, the
*alternatives you rejected and why*, and the *negative results* (what you
checked and found fine, with its validity condition). Rejected-with-reason is
what stops the same alternative from being re-proposed a month later; a bare
decision with no recorded reason invites its own re-litigation. Same durability
rule as above — a PR body or a passing thought is not where this lives.

**Report only what you verified — an unchecked success is not a success.** Every
fact in a status report must come from tool output that actually appeared in the
conversation; if there is no output, there is no fact. Report a side effect only
after a query confirms it — created→`ls`, edited→`git status`, committed→`git
log -1`, pushed→`git log origin/<branch> -1`, PR→`gh pr list`, CI→`gh pr checks`,
merged→`gh pr view --json state`. Do them one at a time and confirm each; never
batch several side effects and summarize the result. When the check contradicts
the claim, state the correction first — before the user finds it.

**Compliance is cumulative.** Full conformance (the long tail of a big spec) is
not written in one pass — start from the common 90%, and grow the tail as
dogfooding breaks new cases. But get the *skeleton* — the contract and the
boundary — right from the very start.

## Bindings the skill expects (`docs/agents/theflow.md`)

This is the schema `/grill-the-flow` fills by interrogation; if the consuming
repo has no bindings doc, run it. The sections (filled from the repo's
`CLAUDE.md` and structure):

- **Crate / module map** — the members, which are inside the top-level test
  workspace and which are excluded (the blind spots).
- **Step 1 — reference routing table** — per change type (domain-semantics,
  a consumer/UX feature, a wire/format/API change), *which real source* to read
  (upstream repos + this repo's sibling implementations) and *where the hidden-state
  list lives*.
- **Step 1 — the project's own map**, if it keeps one: where the dependency /
  territory graph lives, and that it is read **at the start**, not at Step 5. Name
  it here even when the repo's `CLAUDE.md` already mentions it — a skill that has
  to infer its Step 1 inputs from prose gets them in whatever order the prose
  happens to be in, and this one is only useful *before* the boundary is drawn.
  Say explicitly if the project keeps no map, so the absence is a recorded answer
  rather than a section nobody filled.
- **Step 2 — boundary rule** — the concrete "mechanism/core vs policy/consumer"
  split for this project, and the list of things the consumer owns by definition.
- **Step 4 — proof method per layer** — the real round-trip for each layer
  (round-trip test, conformance suite, captured real input, real browser /
  headless E2E), and the traps (visual side effects a headless run misses; any
  measurement that can misread itself).
- **Step 5 — unconditional completeness triggers** — the paths where the
  completeness pass runs *regardless* of the enumeration-risk judgement: the
  project's sacred surface, where a bug costs more than a wrong number (a live
  money/order path, a safety interlock, a destructive operation). Name them as
  concrete paths — "use judgement" is the default, not a binding, and a surface
  nobody named is a surface nobody guards. These are also the only paths where the
  second, *refuting* lens is worth its cost, so the list doubles as that budget.
- **Step 6 — behavior-describing surfaces** — which doc files describe behavior,
  whether the changelog is snapshotted at publish time, the toolchain-floor
  manifest, the public-API-doc surface, and where the glossary / decision records
  (ADRs) live. Plus **what is record-worthy here**: the areas whose decisions
  have already been re-litigated, so a promotion has a named destination
  and a format to follow. A project with no record format has nowhere to promote
  to — say *that*, rather than leaving the slot empty. **List the areas that
  already carry a record** (accepted *and* proposed, each with its number): that
  list is what the filing step checks before proposing a spine, so a cluster with
  a home never gets a second one. How a spine links and where its write-back lands
  do **not** belong here — the skill decides both; name only this project's
  exception, if it has one. The exception that actually costs something is **a
  tracker with no parent/child mechanism**, because it takes out both relations at
  once — the follow-up tree and the spine's derived roster — pushing each back
  into prose with a reconciliation step at every write-back; say so here rather
  than letting each filing rediscover it.
- **Step 7 — gate matrix** — every gate command per crate/layer, *including the
  out-of-workspace / host-vs-target / separate-manifest / formatter-pin blind
  spots*, and the branch/PR/CI convention. Plus the release + downstream loop:
  how to link a local build into a consumer for the Step 4 full-suite round-trip
  (the ecosystem's link mechanism). The consumer *list* is **not** a binding —
  it is derived on the spot in the after-merge downstream loop, never stored.
- **Reasoning bindings (project-wide)** — the judgement calls the portable habits
  defer to this project: which prior art is cross-checked throughout, and the
  **tie-breaker** when prior art and the project's own evidence disagree (e.g.
  "prior-art ratings never decide — our measurement on our market, cost, and
  timeframe does"). These govern every step, so they sit at the top of the doc,
  not inside one step's section.
  Plus the **deliberate-divergence list** — the places this project does *not*
  follow its own named prior art, on purpose, each with the record that decided it.
  The tie-breaker says who wins an argument; this says which arguments are already
  over. It is what Step 5's reference-free restatement test is checked against, so
  without it that test falls back to judgement and a lens's reference-shaped
  proposal reads as a defect. A project with none is a real answer — say so, rather
  than leaving the slot empty, because an empty slot and an unasked question look
  identical later.
- **War-story index** — the concrete precedents (issue numbers) that show each
  rule catching a real defect; these keep the rules from reading as abstractions.
  This is where each repo's `docs/agents/lessons.md`-style evidence log plugs in.
