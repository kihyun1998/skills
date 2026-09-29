# The peer comparison is a method, so it leaves as `plat`

[ADR-0037](0037-placement-is-a-node-because-the-alternative-was-four-files.md)
gave placement a node and, in the same act, scoped the comparison out of it:

> **It does not fetch.** The peer projects are a `reference` source class like any
> other and `place` consumes `sources`.

Two reasons were given. It keeps `firsthand`'s grade cap intact, and it keeps
peer trees out of the build where they would rot under `downstream`'s rule. Both
are sound, and both are reasons **not to store somebody else's tree**. Neither is
a reason not to *do the comparison*. The exclusion ran one step wider than its
own argument, and what fell through the gap is the question the node was named
for: **is our tree any good, measured against the projects that already solved
this?**

## The seam test answers where it goes

[ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md) drew the seam that
twelve extractions have already run on:

> a node's **method** is what governs work of its kind anywhere; its **bound** is
> what only means anything inside a run.

*"Compare a repo's layout against named peers and decide what to adopt"* governs
work of its kind anywhere — Dart, Rust, anything with directories. It is a
method, and methods leave. It also clears the trap 0042 names — *"a proposed
extraction that needs a state slot has found the wrong seam"* — because this one
needs no slot at all.

**It is not a thirteenth extraction under that seam, though, and the difference
decides where it lands.** The twelve took a method out of a **node**, leaving a
bound behind; every one of them is still invoked from inside a run. This one has
no bound to leave, because it runs at **build** time and writes two values the
build schema has carried all along. It is the *build's* method, not a node's — so
it is `grill-the-graph`'s sibling, and thegraph's own table of extracted methods
stays at ten rows with no eleventh.

## The outputs already have homes, which is the evidence

| What `plat` emits | Where it already goes |
|---|---|
| the tree rule, as concrete paths | `place` routes a change by it; `gate` matches the diff against it |
| the deliberate-divergence list | what the restatement test is checked against |

Not one new slot. ADR-0037 rejected its first proposal because one fact needed
four homes; the mirror of that argument is what recommends this one — a method
whose entire output lands in slots that already exist is a method the schema was
waiting for.

## What does not change

**`thegraph/SKILL.md` is untouched**, the way ADR-0037 left `boundary/SKILL.md`
untouched. `place` still reads a tree rule it did not author, still decides the
path before the code exists, still routes a new top-level area to `decide`. The
run-time graph does not learn about peer comparison, because comparison is not
something a single change does.

**Restructuring is still not a step.** `plat` states adopted differences as
concrete moves and moves nothing. The restructure re-enters at `classify` as its
own change, exactly as ADR-0037 has it. The ordering is the point: a move made
before the rule is written drifts straight back, and nothing catches it the
second time either.

## The peer-selection rule is relaxed, deliberately

`grill-the-graph` holds it absolutely:

> a builder that picks its own peers has invented the authority it then defers to

The rule assumes the maintainer already knows the peers. That is true of a mature
repo and **false of the case this record exists to serve** — someone laying out a
first project is exactly the person who cannot name the prior art. Held as
written, the rule closes the greenfield door.

So `plat` proposes candidates with evidence and **stops until a human confirms
the set**. The authority stays where the rule put it: the human still chooses,
and a confirmed set is not an invented one. What the relaxation costs is one
extra interrupt; what holding it cost was the whole first-project case.

## Consequences

- **The greenfield tree rule becomes answerable.** `grill-the-graph` induces the
  rule from the directory tree, and a new project has none to induce from. That
  branch derives from the project's identity plus the confirmed peers and is
  marked **provisional** — no diff exists yet for `gate` to match it against, so
  it is unenforced until the first change lands.
- **An existing built repo is audited, not invalidated.** A tree rule already
  compiled by induction stays; `plat` measures it against the peers and returns
  differences. The build stamp warns as it does for any catalog change.
- **The unclassified bucket is the output.** A difference nobody decided is drift
  wearing a rule's clothes, and it is left visible rather than settled by
  majority — majority is evidence, and the tie-breaker is what has authority.
- **`peer` now carries two senses in this repo.** The comparison target here, and
  the wire peer in `grill-the-graph/fixtures/three-layers.md` — *"round-trip
  encode → decode against the real peer"*. The fixture's usage is the ordinary
  networking one and is not renamed; the collision is recorded in `CONTEXT.md`
  instead, where the glossary already carries collisions of this kind.
- **`plat` is model-invoked.** `grill-the-graph` is user-invoked and can only
  reach siblings that carry a description, which is the same constraint that made
  `lens` and `redden` model-invoked.
- **No fixtures yet.** `sift` and `grill-the-graph` carry golden fixtures and this
  does not, so nothing mechanically checks that a peer set the skill chose alone
  is refused, or that a summarized layout is rejected. The gap is recorded here
  rather than left to read as covered.

  > **Amended 2026-09-02.** The comparison this bullet rests on was **already
  > false when it was written**. `sift`'s fixtures stopped claiming to be a
  > baseline on 2026-08-27, three days earlier: the set names its answer in every
  > filename, and three one-line heuristics — none of them the judgement that
  > skill is about — scored 20/20 on it. So it checks nothing mechanically
  > either, and *"the others have a gate and this does not"* was never the
  > shape of the gap. `grill-the-graph`'s set makes the same claim and has not
  > been measured against it. **The bullet's conclusion stands and only its
  > reason narrows**: `plat` has no worked examples at all, which is what is
  > actually missing here.
- **The first real run found three rules, and none was reachable by writing.**
  Against `flutter_dropdown_button`: a monorepo was rejected wholesale as a
  category mismatch, which discarded the first-party package *inside* it — the
  strongest evidence the run went on to rest on. A flat-versus-nested test tree
  was called a split from **filenames**, when sorting the files by what they do
  came out 34/34 against 10/10 on one axis — the project's own boundary rule,
  expressed in the tree and never declared. Judging by name would have proposed a
  restructure that destroyed a working rule, which is the failure this skill
  exists to prevent, committed by the skill itself. *"Compare on role, not on
  name"* was written for the peers only; it binds our own side too.
- **And the third: a declaration can be *coarser* than the tree, not just wrong
  about it.** The skill had a precedence rule — a declared rule outranks the
  induced tree — and no resolution rule, because *"outranks"* names the winner of
  a **contradiction** and says nothing about a declaration the measurement merely
  **implies**. A module map that lumped three directories into one row marked
  `mixed` was, per directory, 15 exported / 4 internal / **0 mixed**. Obeying
  precedence would have buried a 19/19 invariant behind a summary written when
  nobody needed the distinction. The two relationships are told apart by counting
  violations, which is a `code` question, not a judgement.
- **All three came from the run; the desk produced none of them.** Which is the
  case for the fixtures the bullet above says are missing — an example set is
  written by the same hand that wrote the rules and inherits its blind spots,
  and every one of these three was a rule the author believed was already right.
