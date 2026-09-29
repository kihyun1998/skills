# A new rule is swept for before it is called finished

## The trigger count

`promote`'s third trigger — *"you measured an earlier item's stated premise false
before you could start"* — fired **three times in one day**, on three different
records, each written by a change that believed it was done.

| Record | Its own consequence line | What was true |
|---|---|---|
| [0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md) | *"both roster counts are gone"* | Inventory 1 kept two; four more copies of the same shape were found later |
| [0053](0053-a-delegated-nodes-license-is-its-tool-grant-not-its-brief.md) | *"Nothing regressed: no brief used it"* | one of four briefs needed the tool that was removed |
| [0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) | gated the artifacts and called it closed | the artifact it gated had never once returned a result |

One is bad luck. Three is a model nobody had written down.

## The model

Each of the three is the same act:

```
write a rule  ->  fix the case that surfaced it  ->  record that it is done
                                                     ^ the corpus was never swept
```

The case that produces a rule is **one instance of a pattern the rule now
covers**. Spending the rule on that instance throws away what the instance was
evidence *for* — which is the argument `sweep` already makes about a hit, applied
to the wrong kind of hit.

**And a rule about one side of a pair leaves the other side unstated.** 0053 is
the clearest: it fixed the **grant** and never asked about the **brief**, which
is the same pairing seen from the other end. Both halves failed inside a day, in
opposite directions — a fetcher told to unpack an archive it had no shell for,
and a lens told to read a tracker when the caller had already read it.

## Why `sweep` did not catch it

`sweep` carries the right instruction and points it at the wrong object:

> **When a hit turns up, widen the pattern *before* fixing the hit.** The hit is
> evidence about the **pattern**, and spending it on the one instance throws that
> away.

Its surface roster is documents that **describe behaviour** — doc-comments,
changelogs, glossaries, records. It is a pass over *what a change made stale*.
None of that reaches *what a new rule already covers*, because the rule's other
instances are not stale: they were never true and never written.

## The decision

**A newly written rule is a hit, and it is swept for like one.** In the same
change, before any line claims the change is finished:

- search the corpus for the instances the rule already covers;
- search its **inverse** — the unstated other side of whatever pair it names;
- and write the consequence line **only after** that pass.

It lands in two places and neither is a new mechanism. `sweep` step 4 gains the
case and the three measurements, since it already owns *widen before you fix*.
`promote` gains it as verification item 6, since that is the skill whose entire
output is a rule and which said nothing about this — a **measured zero**: no
mention of sweeping, the corpus, or an inverse anywhere in the file.

## The tell, which is the operational part

**A consequence line claiming completion is the artifact to distrust** — *"both
counts are gone"*, *"nothing regressed"*, *"4/4"*. It is the sentence a later
reader trusts **instead of** re-checking, so it is the one place a half-applied
rule becomes durable. Every instance above was caught by someone measuring a
sentence that had been believed for days.

That is why the rule is *"write it after the pass"* rather than *"do the pass"*.
The pass is easy to intend and the sentence is what proves it happened.

## The rule found two instances of itself on its first run

Applied to its own change, as it requires:

- **`promote` had no such instruction at all**, in the skill that produces rules.
  Now verification item 6.
- **`sweep`'s own verification item 2** said *"every hit that turned up was used
  to widen the pattern"* and did not reach a rule the change wrote. Now it does.

A third was considered and declined: `thegraph`'s Done pass already runs the
sibling methods over its own output, so it inherits this through `sweep` rather
than needing its own copy — and a copy there would be the one-fact-one-home rule
broken by the record enforcing it.

## What this does not cover

It does not say **how wide** the corpus is; that stays the judgement `sweep`
already asks for, and the honest report is *which patterns and file types were
evaluated*. It does not apply to a rule merely **restated** in a new place — only
to one that did not exist before. And it is prose with no gate, like every rule
in the skills: what makes it fire is the verification item, and what makes the
verification item fire is being read at the end of the change that wrote the
rule.
