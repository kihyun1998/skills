# A delegable node declares what is delegated

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** There
> are no delegable nodes to declare anything. The pair this record split — what a
> node writes against what its fan-out reads — has no instance left.

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).**
> `check-graph-schema.py` is deleted, so nothing now requires the `**Delegated:**`
> line this record added, and the agent file cited below went with this repo's
> `thegraph` build. **The catalog rule is unchanged** and `grill-the-graph` still
> emits against it.

## The gap

Invariant ① licenses delegation on one property — a node that **reads without
adjudicating** may be delegated — and [0053](0053-a-delegated-nodes-license-is-its-tool-grant-not-its-brief.md)
made that property measurable on the generated agent: read-only is the default,
a write-capable tool must be declared by name, and `agent_grant_check.py` asserts
it.

That closed the gap between an agent's claim and its capability. It did not close
the one above it: **the catalog's own claim about which part of a node is
delegated.** `sweep`'s header said both of these, four lines apart:

> **Writes** the surfaces, and `swept`. **Decider: AI. Delegable**, fanning out
> one instance per surface.

> **Delegable, fanning out one instance per surface** — this is the fan-out the
> build's list produces, and **it** is read-only, so invariant ① permits it.

The node writes documents. The license says read-only. Both are true, and the
only thing holding them apart was the referent of *it* — bound to *the fan-out*,
not to the node. Read the other way, the same two sentences license a `sweep`
agent that edits.

The wording was written in `37d6236` (2026-08-27). `58cef7c` (2026-09-01) made
*read-only* a thing a check measures. For five days a load-bearing pronoun sat in
a paragraph whose key term had changed underneath it.

## What it did not cost, and why that is not a reason to leave it

Nothing shipped wrong. `.claude/agents/thegraph-sweep.md` carries
`Read, Glob, Grep`, its brief asks for a report per surface, and
`agent_grant_check.py` passes.

That is the grant check working, and it is also the shape of the problem: the
grant check reads the **generated agent**. It fires after a catalog has told a
build what to write. A catalog that never states the scope has nothing to be
wrong about, so the first place the mistake can be seen is the artifact it
produced.

## Why fixing the wording was not the fix

The obvious repair is three lines of prose — say *report only* in the table, bind
the pronoun, done. It was rejected on a measurement:

```
scripts/check-graph-schema.py:113
    self.type_delegable[node] = not any(cell == n for n in NOT_DELEGABLE)
```

The `Delegable` column collapses to a **boolean**. `yes`, `fetch only`,
`as a script`, `query only` and any wording added to it are one value to every
check that exists. The repair would have been three lines nothing reads, in a
file whose own gate exists because *"none names another as its authority and
nothing compared them."* It re-plants the seed it is clearing.

## The decision

**A node the catalog delegates to a subagent carries a `**Delegated:**` line in
its header**, naming the act one instance performs and the slot that comes back.
`check-graph-schema.py` requires it, and requires the line to name at least one
slot the node's own `**Writes**` declares.

Three nodes carry one: `reference` (the fetch), `verify` (the whole node),
`sweep` (the read). Two are exempt and the selftest asserts the exemption is
exercised: `gate` and `search` are extracted as **scripts**, so there is no agent
file, no grant, and nothing for a scope declaration to constrain.

`grill-the-graph` derives the brief's scope from that line rather than from
`**Writes**`, which closes the loop `0053` left open at the top:

```
catalog declaration  ->  brief scope  ->  tool grant  ->  agent_grant_check.py
```

## Why the floor, and why this is not the check 0053 threw away

`0053` deleted a check on an agent's **description** because it was dodged by
rephrasing — *"proposes edits rather than making them"* was the same claim in
different words and passed. `check-graph-schema.py`'s own docstring recorded this
direction as deliberately not asked for that reason, and named the condition for
opening it: it *"wants a declaration form like invariant ①'s `**Runs:**`, not a
substring."*

The floor is what makes it that rather than a formality. The declaration must
name a slot the node writes — *what comes back* is answerable in the graph's own
vocabulary, and it is checked by token membership against that node's `**Writes**`,
not by looking for a phrase. This is the same floor `**Runs:**` has one level
down, where *"**Runs:** nothing much"* used to be enough.

## What this does not prove

That the declaration is **true**. A `**Delegated:**` line is prose about scope,
and nothing here executes it. The enforced fact remains the generated agent's
tool grant.

What changed is the order. The catalog now has to state the scope **before** a
build reads it, so the grant check is confirming a stated intention instead of
being the only place the intention exists.

## Consequences

- The node-type table's `Delegable` column is still read as a boolean by the
  check, and its wording is still for humans. `sweep`'s cell moved `yes` →
  `report only` for that audience alone, and the record says so rather than
  implying a check reads it.
- Two selftest cases and one control were added. The control matters as much as
  the cases: a rule whose exception is never exercised has an unmeasured edge,
  and `gate` and `search` are that exception.
- Invariant ① quotes no worked example. The form's only live instance is
  `sweep`'s header, and quoting it beside the rule made each of these strings
  appear twice — which the first draft of the selftest hit: both mutations would
  have landed in `SKILL.md` prose that no check reads, and reported green from a
  mutation never applied. The helpers assert their target is unique.

## Relation to the trail

- [0053](0053-a-delegated-nodes-license-is-its-tool-grant-not-its-brief.md) is
  the layer below: the agent's claim against the agent's capability. This is the
  catalog's claim against the node's scope, and it is what `0053`'s check is
  derived from.
- [0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) and
  [0056](0056-one-file-is-not-one-home.md) are why the wording-only repair was
  rejected, and why the worked example is not quoted twice.
- [0055](0055-a-new-rule-is-swept-for-before-it-is-called-finished.md) is why
  this record's own surfaces were swept in the change that wrote it.
