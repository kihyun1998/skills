# ADR-0068 — The two `thegraph` working specs are deleted

**Status:** accepted. Reverses one line of
[ADR-0065](0065-this-repos-thegraph-build-is-retired.md).

`docs/thegraph-restructure.md` (307 lines) and `docs/thegraph-state-model.md`
(366) are deleted.

## What ADR-0065 said, and why it no longer holds

It listed both under what stays: *"Working specs about the skill, not about the
build. The first lost its gate and is named above; the second never had one."*
That was right while the skill they describe still matched them.

It no longer does. Both declare themselves `Status: draft` and stage work that
is finished, and both now describe a `thegraph` that does not exist:

- `thegraph-restructure.md` lists `## Definition of Done` and `## The Done pass`
  as **new (#42)**. Both were deleted, along with the three state slots that fed
  the pass.
- `thegraph-state-model.md` audits a **19-slot** declaration. There are 16, and
  the three it loses — `swept`, `dropped`, `gates` — are named throughout it as
  live.

A working spec that has gone stale is worse than one that is merely finished: it
is written in the present tense about a structure that moved, and a reader cannot
tell which sentences still hold without checking every one against the skill.

## Where the decisions live

Nowhere in these two files. Each says so itself — *"not a decision record"* —
and names its successor: [ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md)
for the method extraction, [ADR-0047](0047-a-state-slot-declares-how-it-combines.md)
for how a slot combines. Nine other ADRs cite the two files for a specific row or
inventory, and those citations stand as records: an ADR describes the world when
it was written, which is ADR-0049's reason for leaving `docs/adr/` out of the
prose scan. The links break; the records do not.

## What this closes

`CLAUDE.md` carried *"the restructure spec's rosters are uncompared — it claims
to be complete by construction and now says so on its own authority"* as a known
hole from ADR-0065. A deleted document makes no claim, so the hole is gone rather
than open.

## The general shape

A `Status: draft` working document is a **liability with a half-life**. It earns
its place while the work is in flight and while a decision record does not yet
exist; after that it competes with the ADR that replaced it and loses, because
the ADR is maintained and it is not. The test is the one this repo has been using
all along: **does anything read it?** Nine ADRs cite it as history. Nothing reads
it to decide.
