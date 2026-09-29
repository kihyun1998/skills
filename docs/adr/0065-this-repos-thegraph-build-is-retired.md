# This repo's `thegraph` build is retired, and the gates whose corpus was the skill go with it

## The call, and whose it was

The maintainer's, made on use: *"우리에게 thegraph 적용되어있는거 폐기하고 싶어.
스킬 삭제가 아니라 thegraph 관련된거 폐기"* — retire what `thegraph` **applied to
this repository**, not the skill. Then, on being shown that three of the four
surviving gates read no corpus but the `thegraph` skill family: *"애초에 지금 gate
라는게 있으면 안되는거 아님?"*, and on being recommended to keep them, *"지우라면
지워."*

**This is a product judgement, not a derivation.** Nothing measured the build as
defective; the gates it is taking with it were each written against a real,
measured failure and each still works. A derivation falls to a better derivation;
this falls only to the person who made it.

## The two layers, and which one went

`thegraph` existed here twice, and the distinction is the whole decision.

- **The skill** — the node-type catalog, the construction rules, the reasoning
  habits. Portable, installed by symlink, and read by every repo that runs it.
- **The build** — `docs/agents/thegraph.md`, this repository compiled into a
  graph by `/grill-the-graph`, plus the twelve artifacts compiled from that
  document.

The build is retired. The skill is not, and neither is `grill-the-graph`, which
can rebuild the whole of it.

| Retired | |
|---|---|
| `docs/agents/thegraph.md` | the build document — 686 lines, the root every artifact below was compiled from |
| `scripts/thegraph/` | 8 scripts, 2,645 lines |
| `.claude/agents/thegraph-{lens,refuter,sweep,reference}.md` | 4 generated subagents, 315 lines |
| `docs/thegraph-slot-authority.md` | the slot audit behind 0063, 309 lines |
| `evaluations/thegraph/` | 3 evals whose queries are about this build |
| `scripts/check-graph-schema.py` | 463 lines |
| `scripts/check-restructure-spec.py` | 451 lines |
| `scripts/check-borrowed-schema.py` | 304 lines |
| `.gitignore` `.thegraph/` | the run-state cache has nothing to cache |

The hook goes from **20 invocations to 3**.

**The three gates are a separate call from the build**, and it is worth saying
why they went with it rather than surviving. Their corpus is the `thegraph`
skill, which stays installed and still runs in other repositories — so the
argument for keeping them was that this repo is the skill's **authoring home**,
and a gate on a skill's internal consistency belongs where it is authored. That
argument was made and was not taken. What follows from not taking it is recorded
below rather than left to be rediscovered.

## What is no longer checked

Four holes. Each was a gate that had already caught something.

- **The hook's own command list, as a whole.** `gates.py --drift-only` read
  `scripts/hooks/pre-commit` and asserted its recorded roster against it. This is
  the narrowest of the four holes and was nearly overstated in this record:
  `check-skills.py`'s `HOOK_MUST_RUN` independently asserts that the hook runs
  the `--selftest` and the `--resolve`, so deleting either still goes red. What
  is silent is a command **added** to the hook and never run, or the live
  `check-skills.py` line removed — [0048](0048-the-gates-fire-from-a-hook.md)'s
  own failure mode, reintroduced knowingly and in a smaller space.
- **The catalog's three copies of its own graph.** `thegraph` states its graph
  three times — the node-type table, the State table, and each node header. They
  disagreed in **eleven** places the first time anything compared them
  ([0056](0056-one-file-is-not-one-home.md)).
- **The restructure spec's completeness.** `docs/thegraph-restructure.md` claims
  every node type, state slot and section appears in it. It now says so on its
  own authority.
- **Borrowed schemas.** `tickets` and `grill-the-graph` fill schemas `thegraph`
  owns and both say *borrow, don't copy*. `tickets`' copy had already widened
  once to admit a `human` mark on spec *attribution* that `thegraph` never
  licensed — **the silent direction**, since a wrong `human` downgrades a node
  and files no finding saying so.

These are holes in the **authoring** of a live skill, not in a retired one. That
is the cost, stated once, here.

## 0061 and 0063 fold into this record

Both are vacated. They are two layers on one rule, their subjects are deleted,
and reading either one now returns a wrong answer about this repository.

**What they decided, and where the rule lives now.** Each closed a link in
[0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md)'s chain
against a different copy:

- **0061** — every artifact compiled from the build document is asserted against
  the slot it came from, keyed on an identifier rather than prose, in **both
  directions**, with an extractor that fails when it finds nothing. It measured
  drift in each direction in a single run: the document read `Next free: 0060`
  while `0060` was allocated, and `gates.py`'s blind-spot list held seven against
  the document's eight. Both were found by a person reading; neither by a gate.
- **0063** — the build document is **itself a copy**, of the hook, the record
  files, the tree, the surfaces and the manifests, and the one nobody asks the
  chain's question of. It separated **derived** slots (a copy of a fact living
  elsewhere; never empty, fails by being silently wrong) from **decided** ones
  (the maintainer's judgement; empty is exactly how it fails), and showed that
  `build_gaps` is correct for the second and structurally blind to the first —
  which is why two consecutive updates carried zero build gaps and both found
  real drift. Its audit graded 47 slots: **4** asserted, **27** unasserted
  copies, **15** correctly unassertable, **1** compiled from an invalid
  authority.

**Neither rule is retired with its implementation.** 0063 says so in as many
words — *"the rule is stated in `grill-the-graph` and therefore applies to every
repository built by it, not only this one… a catalog fix rather than a build
value"* — and `grill-the-graph`'s emit step carries both: artifacts and the graph
doc are rooted, every machine-readable authority gets a both-directions
assertion, a stamp is not a root, and an unassertable slot says so. A future
build of this repo, or of any other, gets them back.

What is gone is this repository's **instance**: `build_doc_check.py`,
`slot_authority.py`, and the audit document.

## What this does not touch

- **The skill and its family.** `thegraph`, `grill-the-graph`, `tickets`, and the
  siblings [0042](0042-a-nodes-method-leaves-its-bound-stays.md) extracted —
  `spine`, `firsthand`, `bare`, `byartifact`, `envelope`, `promote`, `boundary`,
  `lens`, `redden`, `plat` — are unchanged and stay installed.

  > **`tickets` no longer holds.** It was retired separately by
  > [ADR-0069](0069-tickets-is-retired.md) — the later, separate call this record
  > declined to make, not an extension of it. The rest of the list stands.
- **`docs/thegraph-restructure.md` and `docs/thegraph-state-model.md`.** Working
  specs about the skill, not about the build. The first lost its gate and is
  named above; the second never had one.
- **The decision records whose subject is the skill.** They describe decisions
  that were made and are not unmade by an application being retired.
- **`docs/agents/issue-tracker.md`.** It is the exception, and it moved. It had
  handed the tracker-capability contract *to* the build and kept a pointer; the
  build's deletion would have left the contract with no home at all, so the
  value came back. Recorded there, because the general shape is worth having:
  **a value that moves into a generated artifact moves somewhere with a shorter
  life than the fact it carries.**

## Relation to the trail

- [0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) makes removal
  and declaration one act. This is that rule applied to a build rather than a
  skill — there is no `retired/` for a build, so deletion plus this record is the
  whole of it.
- [0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) stands
  unamended and is the reason this record enumerates the holes instead of
  reporting a clean removal.
- [0048](0048-the-gates-fire-from-a-hook.md) keeps its decision; its command list
  and timings are superseded here.
