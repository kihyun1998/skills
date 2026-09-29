# Bindings are spent at the first build, and `grill-the-graph` says which run it is on

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md), after
> [ADR-0067](0067-the-theflow-migration-path-is-gone.md) removed the bindings path.**
> There is no compile step and no update run: `grill-the-graph` asks one question
> and writes one short file, and that file **grows by being appended to**. The
> three-statement conflict this record resolved has no statements left.

`grill-the-graph`'s compile step held three statements with no rule between them:

> *"If `docs/agents/theflow.md` exists, it is the **primary input**."*
> *"With **no** bindings doc, compile from the repo instead."*
> *"**Any existing** `docs/agents/thegraph.md` makes this an **update**: diff
> current reality against it."*

A repository holding **both** — which is every repository that has ever been built
into a graph — matched the first and the third, and nothing said which governed.

## It sent real advice the wrong way

Asked what to do with a live repo's `docs/agents/theflow.md`, this session read the
first statement, called the bindings *live input*, and said **do not delete it**.
The maintainer pushed back, and the repository's own build doc settled it: a
thirteen-row table of *"bindings say X, repo says Y"*, recorded at the compile,
each row closing with *"a candidate for the next `/grill-the-flow`"* — a skill that
[ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) retired.

So the file was a consumed input, already recorded as wrong in thirteen places,
addressed to a skill that no longer exists. The advice to keep it was wrong, and
the skill's text is what made it readable that way. **A document a careful reader
can read backwards is defective at the document, not at the reader.**

## The rule

The path is decided before anything is read, and it is mechanical:

| On disk | The run | The input |
|---|---|---|
| `thegraph.md` exists | **update** | the graph, diffed against the repo |
| only `theflow.md` | **first build** | the bindings, compiled |
| neither | **first build** from the repo | every slot is a question, and say so |

**`thegraph.md` wins whenever both are present**, and the reason is arithmetic
rather than precedence: the bindings were **consumed** by the build that produced
the graph. Reading them again re-applies an input that has already been applied —
and re-applies it in its *original* state, including drift the first build recorded
rather than silently corrected.

From that, two consequences the text now states outright:

- **On a first build, say the bindings are now spent.** They survived the
  retirement because they were still input; this build is what consumes them.
  Nothing reads them afterwards, nothing maintains them, and their drift is in the
  graph's compile notes. It is the maintainer's to delete — the skill writes the
  build and never product docs, and that prohibition does not bend for a file it is
  finished with.
- **On an update, say nothing about it.** Repeating the notice implies the bindings
  were somehow input again.

## The compile notes needed a live destination

A first build records *"bindings say X, repo says Y"* per row, and the observed
build addressed every row to `/grill-the-flow`. With that skill retired the rows
point nowhere, so the notes now say which of two things each row is: **already
resolved into the graph**, or **a `build_gaps` entry**. A record addressed to a
retired skill is not a record.

## What this is not

Not a promotion. By the two-trigger bar this is **one** trigger — an ambiguity in
one document that one reader read backwards — so it is a clause where the
ambiguity was, not a rule spanning decisions. The derived corrections
([ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)'s paragraph and
`retired/README.md`) are the same statement conditioned, not separate findings.

## Consequences

- **`grill-the-graph` states the path first**, in a table, before any reading —
  so the question *"which run is this?"* cannot be skipped by starting at the
  wrong sentence.
- **Two unconditional claims are conditioned.** ADR-0027 said the bindings docs are
  *"live input, not residue"* with no qualifier, and `retired/README.md` repeated
  it. Both are true only before the first build. ADR-0027 carries an amendment note
  rather than an edit, because the decision it recorded still stands; only its
  supporting sentence was too broad.
- **A migrated repository can now delete its bindings** and be told so at hand-off,
  rather than accumulating a thirty-kilobyte document with no reader and no owner.
- **Nothing about the build changed**, so the stamp rule reports informational only.
