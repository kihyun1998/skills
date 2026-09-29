# ADR-0070 — `promote` is retired

**Status:** accepted.

> **Amended by [ADR-0075](0075-sift-is-retired.md).** `sift`, named below as where
> the two-occurrence bar survives, is retired too. The bar has no live holder.

`promote` moves to [`retired/`](../../retired/) and is no longer installed, by the
mechanism [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)
established — the folder move *is* the uninstall.

## The call, and whose it was

The maintainer's, made on use, while deciding what the new `docket` phase should
call: *"promote는 은퇴를 시키자. 아주 불순한 스킬인것같아."* The worry stated
just before it: **records would pile up faster than they earned their place.**

**A product judgement, not a derivation.** It falls only to the person who made
it, and reversing it costs one `git mv`.

## What was measured on the way there, and it is not the reason

Two facts came up while the call was being made. Neither caused it; both are
recorded because they narrow what a reversal would have to answer.

**Nothing counted its triggers any more.** The bar is *two or more of five
observable triggers, in one cluster* — deliberately a count rather than a
feeling. What did the counting was the `triggers` state slot, written by four
nodes and read by this one. That slot went with the rest of thegraph's run state,
for the reason every other slot went: it was machinery four places had to write
without ever going stale. Nothing replaced it, so the count became a judgement
over issue prose, which is exactly the *felt* trigger the skill's own first
sentence refuses.

**And in the session that retired it, it did not fire.** The same judgement was
re-made four times in a row — four candidate build slots, each declined for
identical reasons — with the skill installed, model-invocable, and its trigger 1
squarely met. It was never invoked. The pattern was named by the maintainer, on
the third repetition, in their own words.

That is one observation and not a rate. What it is evidence of is a shape: an
advisory that fires on noticing is not reliable in either direction, and with
nothing to count it would have fired on feeling or not at all.

## What survives, and where

**The two-occurrence bar**, which is the load-bearing part and was never the
skill's alone. It is stated where it is used:

- **`sift`** carried the strongest dependency — a `SYSTEM` verdict names a
  paragraph's kind and must not become a decision record on its own. It now
  states the bar itself: one paragraph is at most one occurrence, and the bar is
  two. Two mentions rewritten, in the rule and in its verification list.
- **`grill-the-graph`** cited it for *wait for the repeat* before a question
  enters the build. The sentence stands without the citation.

**And the skill stays readable under `retired/`**, so a decision record it
produced elsewhere can still be read against the method that produced it.

## What went with it

`thegraph` had a `promote` node, and it is deleted along with the `triggers`
state slot, its row in the slot table, its row in the node catalog, its entry in
`requires:`, and the four `**Writes** \`triggers\`` clauses in `spine`,
`boundary`, `place` and `verify`. `NODES.md` 48,679 → 46,251 bytes.

`CONTEXT.md`'s **Trigger** entry becomes retired vocabulary rather than being
deleted: three of this repo's decision records still use the term, and a reader
of those needs it defined.

## Relation to the trail

- [ADR-0058](0058-grill-code-is-retired.md) and
  [ADR-0069](0069-tickets-is-retired.md) are the same shape — a maintainer
  retiring a skill on use, with nothing measuring it as defective. This is the
  third, and the three now outnumber the retirements that had a successor.
- [ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md) extracted this method
  out of `thegraph`'s node of the same name. The extraction is not reversed by
  the retirement: the node is gone too, and what is left of the rule is one
  sentence in the one skill that needed it.
