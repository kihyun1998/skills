---
name: byartifact
description: "Before filing anything, find out whether it already has a home — and search by the artifact it touches, never by the feature name, because a related issue almost never shares the same vocabulary. Search the module, the wire field, the predicate, the config key. The trigger is naming, not deciding: the moment the artifact it touches can be named, usually while reading and before any probe, search — ordering it after reproduction spends the expensive step first, and the tracker may already hold a better measurement than the one about to be taken. Four outs follow: it already exists and gets a comment, it conflicts and both links are made at once, it shares a root and becomes part of a cluster, or it is genuinely new. Use before opening any issue."
---

Find out whether it already has a home before you spend anything on it, and search by the artifact rather than the name.

## Goal

Two mistakes, both expensive, both avoidable by searching earlier and searching
differently.

**Searching by the feature name** finds nothing, because a related issue almost
never shares your vocabulary — it was filed by someone who hit a different symptom
of the same thing and named it after *their* symptom.

**Searching after reproduction** spends the expensive step first. A candidate an
existing issue already owns gets reproduced and thrown away, and the tracker may
well have held a better measurement than the one you just took.

## Workflow

1. **Fire on naming, not on deciding.** The moment you can say *which artifact*
   this touches — usually while reading, before any probe — search. Waiting until
   you are sure it is real is waiting until the saving is gone.

2. **Search the artifact, in every form it is written.** The module or file, the
   wire field, the predicate, the config key, the error string, the symbol. Then
   search its neighbours: what calls it, what it is renamed to elsewhere, what the
   same value is called on the other side of a boundary.

3. **Take one of four outs, and say which.**

   - **It already exists.** Comment on it; do not open a sibling. **And read what
     it already decided, including what it rejected** — an issue is the durable
     record of rejected alternatives, and that record only pays off if someone
     reads it at the moment they are about to re-propose one. If a rejection rests
     on a decision record, that record binds your **direction**, not just your
     filing location.

   - **It conflicts** — an existing issue whose proposal your change would break.
     **Cross-link both ways in the same act**, and say which decision comes first.
     A one-way link is only ever found by whoever reads the newer issue.

   - **It shares a root with others** — the first sign of a cluster. Before
     proposing anything new, check whether the area already carries a **decision
     record**, accepted *or* proposed. If it does, the throughline has a home:
     file under it and do not open a second one.

   - **Nothing.** An ordinary single item, and that is a real answer.

4. **The conflict out cannot be found by a query, so do not report it as absent.**
   Deciding *"this would break that"* is judgement, and a conflicting issue almost
   never shares your vocabulary. Measured cases: a wire channel two issues each
   claimed; one branch's entry condition and its two colour questions filed as
   three independent decisions; one capability surfacing as two unrelated-looking
   symptoms. **No query finds any of them.** A search that returns nothing has
   ruled out the first out, not this one.

5. **Report what you searched for, not only what you found.** The terms, the
   forms, the neighbours. A bare *"nothing found"* cannot be distinguished from a
   narrow search, and the next person repeats it.

## Rules

- **Never search by the feature name alone.** It is the one vocabulary the other
  filer definitely did not use.
- **Search before reproducing**, not after.
- **Only a decision record preempts a cluster's own home.** A *descriptive*
  cross-cutting note is not one, however much it looks like one: it names a fact
  and lists where it holds, but it lives in a file and describes, while a roster is
  current state and needs a mutable home. They are complements. A project that
  read its note as the record went on to need the mutable home anyway.
- **A roster is the tree, not a list in a body.** Where the tracker renders
  parent/child, that relation **is** the roster; a copy in prose only creates
  somewhere for it to disagree with itself.
- **Attach rather than create.** If a home already exists for this family, join it.
- **A query returning nothing is not an answer to a judgement question.** Say
  which outs the search could actually rule out.

## Verification

Before finishing:

1. The search terms were artifacts, and the report lists them.
2. Every out taken is named, and the ones ruled out are named as ruled out.
3. If an existing item was found, its rejected alternatives were read, not just
   its title.
4. Any conflict is cross-linked in **both** directions, with the ordering stated.
5. The conflict out was adjudicated by judgement, and the report does not present
   an empty query as having cleared it.
