# A node's method leaves and its bound stays — twelve extractions under one seam

> **Extended by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** This
> record moved twelve methods out and kept their *bounds* in the catalog. **The
> bounds left too** — there are no nodes to bind, and what survives of each is one
> line in the step that calls the sibling. The seam test itself is unchanged, and it
> is what the four steps were cut along.

*Merges the four records that made this one rule and applied it: the first
extraction (`redden`), the one that wrote the rule down (`lens`), the one that
amended it (`boundary`), and the seven that finished the pass. Their numbers —
0026, 0028, 0029, 0031 — are vacated; see [the index](README.md).*

`thegraph`'s node sections had grown into essays. A node stated its contract,
its guards and its edges, and then spent most of its length teaching how to do
the work — how to trust a passing test, how to run a completeness pass, how to
decide which layer a capability belongs to. Every one of those was true of any
repository, and none of them could be reached without first deciding to run a
graph.

## The seam

> **A node's *method* is what governs work of its kind anywhere. Its *bound* is
> what only means anything inside a run** — what it reads from state, what it
> writes, who decides its exit, what sends the edge back.
>
> Methods may leave. Bounds never do. **A proposed extraction that needs a state
> slot has found the wrong seam.**

The slot test is what makes this mechanical rather than a matter of taste. A
slot is a run-scoped fact with a named writer and named readers, which is the
definition of a bound; no extracted skill reads or writes one. Each receives
what it needs as an argument, returns its result, and the calling node does the
flushing.

`thegraph`'s *"what is invariant, what the build decides"* split gained a third
row for the case: **a rule a build cannot answer differently, which this catalog
nonetheless does not fix, because it is not this method's to hold.**

## What opened it: the test-trust gate

`implement` held three mechanical bars a passing test must clear before its
green counts as evidence, and `proof` held a fourth aimed at a recorded
artifact. The gate was never graph-specific — it governs any test in any
repository, including one that has never heard of a node catalog — and holding
it inside a **user-invoked** skill made it reachable only by someone who had
already decided to run a graph. **A reflex that fires only when the maintainer
already suspects the test is a reflex that fires after the cost is paid**: the
whole failure mode is that a green test *looks* fine.

Three alternatives, and why each fails:

| Option | Why not |
|---|---|
| **leave it in the node** | invocation, above — it fires after the cost is paid |
| **copy it into a second skill** | [ADR-0019](0019-theflow-is-frozen-thegraph-inherits-by-copy.md) licensed a copy of `theflow`'s rules **because `theflow` is frozen** — the two diverge as a frozen v1 differs from an advancing v2, which resolves by retirement. `thegraph` is not frozen, so a copy is an ordinary divergence seed |
| **a third shared document both read** | adds a seam between two skills that already have one, and fixes the rule's shape at the moment it is being restructured — ADR-0019's own objection to extraction, still holding |

So the gate moves out and is *borrowed back*.

**One skill, not a section**, because the material had that shape already: the
gate is a single reflex with one trigger — a test was just written or changed —
and one question, *can this fail?* `implement`'s three bars, `proof`'s fixture
bar, and two corollaries were five statements of one rule scattered across two
nodes, each discovered separately from a measured defect.

Consolidating them surfaced a convergence worth recording. The bars were derived
from defects measured in this repo's own work; the eight-pattern leakage taxonomy
in `mandela` (from [paperthin](https://github.com/LilMGenius/paperthin), MIT) was
derived from research-eval design. They land on the same failures from opposite
directions — *"a guard and a test written against the same wrong model confirm
each other"* is **shared hallucination**; *"mutate the predicate, not only the
placement"* is a **wrong null hypothesis**; `proof`'s artifact-graded-by-its-own-
producer is **tautology** and **verifier = designer**. `redden` states five
rather than eight: the remaining three need a human subject and have no
test-code form. Convergence between an independent derivation and named prior
art is the non-arbitrariness signal `thegraph`'s own reasoning habits already
require, which is what makes the five a taxonomy rather than a list.

## Invocation is forced, not chosen

Every extracted skill is **model-invoked**, and the reason is mechanical: a
user-invoked skill can reach a model-invoked one, but never another user-invoked
one. `thegraph` is user-invoked, so any method it extracts **must** be
model-invoked or it becomes unreachable from the node that needs it.

That constraint happens to agree with what each skill is for — a completeness
read that can fire when an enumeration looks thin beats one that fires when
somebody already suspects it — but the agreement is luck, and the constraint is
the reason.

## The cut is not "the interesting half"

`verify` is the case that proves the test does real work. Every left-hand row is
true of any completeness read in any repository; every right-hand row names a
state slot, an edge, or a build value.

| Left, to `lens` | Stayed, in `verify` |
|---|---|
| one reader over every corpus; never split the material | the inbound guard — sacred path from the build overrides judgement, else enumeration risk |
| never drop a corpus because the change is small | *"there is no skip-this-node act"* — an edge-semantics claim about this graph |
| the reference-free restatement test | assembling the brief from `hidden_state`, `spine`, `sources`, and two build values |
| the grade table | where each grade goes next — `CONFIRMED` fires the back-edge, `UNADJUDICATED` goes to `batch` |
| a divergence is not a direction | the back-edge to `implement` and its bound |
| re-open a citation, never transcribe it | whether a second reader exists at all — the sacred-path list, and nothing else, buys it |
| the stance split for a second reader | `findings`, `triggers`, and the second product handed to `promote` |

**The brief is the interesting case.** Four things must reach the reader, and a
brief missing any of them pushes the work back onto the main thread. It is
tempting to call that method — it is a rule about how to run a pass. It is not:
all four are graph state or build values, so **assembling** the brief is the
node's job while **reading** it is the method's. `lens` states what a brief must
carry; `verify` is what can actually fill it.

## The one amendment the rule earned

`boundary` asks **which layer can be correct**, and it cannot know what the
layers *are* — that is the project's shape, not a rule about layering. The seams
were already a build value: *"what the build must supply"* had named the boundary
rule, the consumer seams, and what the consumer owns by definition all along.
But they were **missing from the invariant/build split list**, which is how a
value stays answerable in the schema while reading as unowned everywhere else.
Nothing was broken by that; the node's prose simply answered next to the
question, so it never had to be routed.

Extraction is when such a gap becomes visible, because the question suddenly has
to reach a different document. So the rule gains a clause:

> **An extraction that leaves a question with no named answerer has not
> finished.** Check the invariant/build split, not only the schema — a slot the
> schema fills but the split does not name is a value nobody is holding.

`grill-the-graph` needed no change: its compile table already mapped *"Step 2 —
boundary rule"* onto *"the `boundary` node's rule and the consumer seams"*, so it
was routing this correctly before the split list admitted it.

## The twelve extractions

| Node | Method left to | Bound that stayed |
|---|---|---|
| `implement` (part) | [`redden`](../../redden/) | TDD RED→GREEN per layer; the self-loop's bound |
| `verify` | [`lens`](../../lens/) | the table above |
| `boundary` | [`boundary`](../../boundary/) | the seams; `CLAUDE.md` as second input; the `stop` edge |
| `spine` | [`spine`](../../spine/) | writes `spine`, `triggers` |
| `reference` + `enumerate` | [`firsthand`](../../firsthand/) | `sources`; `hidden_state`; one instance per build-named class |
| `sweep` | [`sweep`](../../sweep/) | reads `split`, `spine`; the build names the surfaces |
| `gate` | [`bare`](../../bare/) | writes `gates`; the build names the commands; the back-edge bound |
| `search` | [`byartifact`](../../byartifact/) | writes `candidates`; the build names areas already carrying a record |
| `batch` | [`envelope`](../../envelope/) | reads `candidates`, `agreed_direction` |
| `promote` | [`promote`](../../promote/) | reads `triggers`, `spine`; exists only where the build names a record format |

## Three naming and shape calls

**`reference` + `enumerate` merged into one skill.** They are one reflex — *what
does the real thing already know that I am about to guess?* — split across two
nodes only because they write different slots and differ in delegability
(`reference`'s fetching may be delegated; `enumerate`'s adjudication may not).
Those differences are **bounds**, and bounds do not travel, so nothing about the
merge crosses the seam. `firsthand` states one method; `thegraph` keeps two nodes.

**`search` + `promote` did not merge**, though they were staged as candidates.
`thegraph` says `promote` *"runs on a different clock"* — `search` fires per
candidate, `promote` per cluster — and merging two reflexes with different
triggers is the thing an orchestrator exists to avoid.

**`gate` became `bare`.** The name was taken by this repo's Acceptance Gate, and
rather than qualify it the skill is named for the reflex it fires: *run it bare*.
That is the better name anyway — `gate` names the thing, `bare` names the rule
that makes it one.

## What stayed whole

`classify`, `map`, `stop`, and `decide` have no separable method; two of them
absorbed reflexes instead
([ADR-0030](0030-the-staying-nodes-absorb-their-reflexes.md)). `downstream` was
left undecided here and settled by
[ADR-0032](0032-downstream-writes-a-candidate-at-proof-time.md) — it has no
separable method because `proof` already produced its list, so it was never a
discovery step.

`stop` is worth naming as the near miss. Its text — *"when the urge to write a
consumer workaround appears, stop and come to the maintainer"* — is a human
interrupt, which is a bound. The method says *do not compensate here*; the edge
is what makes not-compensating a route rather than a stall.

## What the gate could not see, and now can

The first pass marked five folds "done" in a hand-written status column, and the
gate confirmed only that a status cell existed — the **self-drawn fixture**
pattern, the thing being graded produced by the thing under test. The fix was to
check `thegraph` for each fold **scoped to the section that claimed it**, since a
whole-file match would pass with the rule sitting in the wrong node.

Extraction reopened the same hole one level out: a reflex marked *"done — in
`sweep`"* is a claim about `sweep`'s file, and nothing checked it. So the gate
gained fusion checks, and with them a harder problem — those checks read sibling
skills **from disk**, which `--selftest` could not reach. A check whose input the
selftest cannot mutate is a check whose discriminating power cannot be shown,
which is exactly what this gate refuses elsewhere. The skill reader is now
injectable.

**Two mutations failed on their first run, and neither was a fold defect.** A
run-level probe reported a rule absent because the paragraph wrapped between two
of its words — probes are matched whitespace-flattened now. And a `prism`
mutation replaced `never average` in a file that says `Never average`, so it
**turned nothing off** and the check stayed green for the wrong reason. That is
not *"the fix was off and nothing reddened"* but *"the fix was never off"*, and
generalising it is [ADR-0035](0035-a-mutation-is-confirmed-to-have-landed.md).

## Consequences

- **`thegraph` is 889 lines, down from 1,029** — 17% smaller — and its node
  sections read as node definitions (contract, bound, what the build supplies,
  which edge fires) rather than as essays on how to do the work.
- **Ten model-invoked siblings exist** where the repo had none. Each fires on its
  own trigger, which is what a rule buried in a user-invoked method never could.
- **A degradation path is required and stated.** `thegraph` runs an extracted
  method's bars inline, **and says it is doing so**, where the sibling is not
  installed. The bound is unchanged either way, so a missing sibling costs
  disclosure, never correctness.
- **`thegraph`'s description was rewritten**, 2,707 → 798 characters. It was
  losing 1,171 to the platform's 1,536-character cap, and two of its claims had
  gone false: it called `theflow` *frozen* when
  [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) retired it,
  and said the inherited discipline is carried *"unchanged"* when its methods now
  live in siblings. **A truncated description hides exactly this** — the false
  clauses were in the cut region, unreadable and therefore uncorrected.
- **One fixture line changed, and it was not the two predicted.** `real-app.md`
  named `thegraph` as the home of the grade table and the restatement test;
  those moved, so it names `lens`. `sacred-script.md` looked like the second case
  and was not — the rule it cites is the **inbound guard**, a bound, which
  stayed. Checking each line against the seam rather than against a memory of it
  is what caught that. The fixture also gained an assertion that **a manifest may
  not name the method's home** — not as a column, a comment, or a link. An
  artifact carries data slots and is indifferent to which skill holds the method,
  and that indifference is what let every extraction touch zero generated files.
- **Zero rebuilds, zero stale findings.** No slot changed in any of the twelve,
  so by
  [ADR-0041](0041-a-behind-stamp-with-no-missing-slot-is-informational.md)'s
  stamp rule a behind stamp reports informational only.
- **The measured cases moved with the rules they justify**, into the pattern each
  one produced, rather than being deleted or left behind as war stories attached
  to a node that no longer states the rule.
- **`CONTEXT.md` follows the seam.** It gained `Brief` and `Corpus`, and `Grade`
  changed owner from `thegraph` to `lens` — or the glossary starts describing a
  shape the code no longer has.
- **`theflow` is untouched by the extractions.** It was frozen when they landed
  and retired shortly after (ADR-0027); a `theflow` repository keeps the copy of
  the gate it has.
- **The invariant/build split gained a table** rather than a third prose clause.
  Three extractions in, a list of *"and also X's, and also Y's"* stops scanning.
