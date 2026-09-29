# ADR-0071 — `thegraph` is four skills in order, and there are no nodes

> **The four steps were renamed.** `sounding` → [`read-it`](../../read-it/),
> `hew` → [`make-it`](../../make-it/), `plumb` → [`check-it`](../../check-it/),
> `docket` → [`ask-it`](../../ask-it/). **Nothing this record decided changed** —
> the four steps, what each absorbs and what each calls are all as written below.
> The old names are kept in the body because they are what was decided, and the
> links in the table below no longer resolve for that reason.

**Status:** accepted.

`thegraph` was a node-type catalog: eighteen node contracts, sixteen state slots,
four invariants, a build contract and a delegation contract, across five files
totalling 88 KB. It is now one file of 8 KB that names four skills, the signals
that interrupt them, and the habits that hold throughout.

## The call, and whose it was

The maintainer's, over a long sitting, and it arrived as a complaint rather than
a design: *"이게 저장소마다 계속 뭔가 망가져. 내 스킬때문에."* Then, on being shown
what a node actually was at run time: *"애초에 지금도 노드가 없고 이 순서로 스킬
부르는거 아니였나."*

That reading is correct and it is what this record turns on.

## What a node was, measured

There was no runtime, no dispatcher and no state machine. A node was prose an
agent read on arrival, and it had four parts: a name, a `Reads`/`Writes` header,
a line saying *"the method is `X`'s — run it here"*, and its edges. At run time
the third is a skill call, the second is what to pass, and the fourth is a
sentence.

**Twenty-four per cent of `NODES.md` was the form itself** — 3,359 bytes of
`Reads`/`Writes`/`Decider`/`Delegated` headers, 2,790 of edge declarations, 4,845
of *"what this node supplies is the build's X"* paragraphs, against 46,429 total.
That is ledger, not method.

**And the sibling skills had already voted.** All eleven describe themselves as
*"Use when …"* — a trigger — and not one says *"run at step 3"*. The phase model
was fighting the design of the things it was built out of.

## What replaced it

Four skills, in order, with one guaranteed stop before any of them:

| | Absorbs | Calls |
|---|---|---|
| [`sounding`](../../sounding/) | `classify`, `spine`, `map`, `reference`, `enumerate` | `spine`, `firsthand` |
| [`hew`](../../hew/) | `implement` | `tdd`, `redden` |
| [`plumb`](../../plumb/) | `proof`, `verify`, `gate`, `sweep` | `bare`, `lens`, `sweep`, `assay`, `silt`, `security-review` |
| [`docket`](../../docket/) | `search`, `batch`, `downstream` | `envelope`, `byartifact` |

`stop` and `decide` are not steps. They, and `boundary`, `redden` and
`firsthand`, are **signals you cannot schedule** — the urge to patch around
something deeper arrives with your hands in the code, not at a point in a
sequence — and they live in a table `thegraph` holds and `hew` repeats where they
actually fire.

**Two skills were written because nothing covered what they do.**
[`assay`](../../assay/) is this repo's own two-axis diff review, modelled on
`code-review` rather than calling it, and [`silt`](../../silt/) reads a change for
what will make it slow and refuses to call anything a defect without a number.

## What each merge made sayable

Merges were not tidying. Three of them produced a sentence that could not be
written while the parts were apart:

- `reference` + `enumerate` — split only because they wrote different slots and
  differed in delegability, which the catalog admitted in as many words. Merged,
  the thing that needed saying is that **the build's source list widens what you
  read but never decides whether you read**: with no outside source named you
  still enumerate the hidden state of the code you are touching. One was
  conditional and one was not, so as two nodes there was nowhere to put that.
- `classify`'s restatement + the traversal declaration — the same act, written
  twice, kept apart by a paragraph explaining that the declaration was `entry`'s
  flush and `entry` ran first. Merged, that paragraph has nothing to explain.
- `gate` + `verify` — both attributed a failure against the baseline tree, in
  separate words. One section now, and the workaround hunt is its third form.

## What was found while dismantling

**Attribution had two homes and now has one**: *is this red mine*, *did this
change introduce this defect*, and *is this defensive line mine* are the same
question answered the same way, and the trap is shared — comparing exit codes
rather than failures makes a baseline that is red for its own reason invert every
attribution silently.

**A rule was almost relocated twice when `bare` already held it.** *The same
failure surviving three fixes* is in `bare`'s step 5; the branch-and-PR paragraph
the old `gate` carried is either the repo's own convention or already `bare`'s
*do not watch CI during the work*. The old node called `bare` and restated it in
the same breath, which is only visible once the node shell is off.

**And the guess about how much was thin was wrong.** Before measuring: eleven of
eighteen nodes reduce to a skill call. Measured: **seven**. Ten held something no
sibling holds.

## What went

`NODES.md` (46 KB), `BUILD_CONTRACT.md` (5.7 KB), `DELEGATION.md` (5.2 KB) and
`CREATION-LOG.md` (9.8 KB) are deleted. The first three describe machinery that no
longer exists; the fourth recorded incidents behind rules that are gone, and its
substantive entries are already in ADRs 0039, 0042, 0045, 0047, 0053, 0056, 0057,
0060 and 0062. Its two open questions — whether a per-arrival contract read is
safer than one read at the start, and two recorded objections to `catalog_gaps` —
are both about designs that no longer exist.

Invariants ① and ② go with the machinery: nothing is delegated by a build any
more, and there are no back-edges to bound. ③ survives as *nothing reaches a
tracker unasked* and ④ as *what can be counted is counted*.

## The cost, stated

**Always-loaded context went up.** `thegraph` is user-invoked, so its description
was never in the model's listing; the four steps and the two new reviews must be
model-invocable for it to reach them, so six descriptions — about 4,000 characters
— are now loaded in every session. On-demand context went the other way, from 88 KB
to roughly 40 KB across six files, and no run loads more than the steps it takes.

Those descriptions run 550–700 characters against a 179 median in the corpus this
repo measures itself against. Trimming them to triggers only is a separate pass
and is not done here.
