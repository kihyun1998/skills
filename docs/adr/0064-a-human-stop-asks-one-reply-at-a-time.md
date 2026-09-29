# A human stop asks one reply at a time

## The gap

This repository instructs both things, for the same act — handing a person a set
of things to answer:

> `envelope`: *"collect them and **present them in one batch**"* · *"**Present
> once**, as a proposal to confirm"*

> `grill-the-graph`: *"**Ask one question at a time**, and wait. **Several at once
> is bewildering.**"*

Nine call sites across this repo resolve that tension, and every one of them
resolved it alone. Nothing holds the model they all imply, so the next stop
someone writes will resolve it a tenth time, from scratch, and may resolve it
either way.

## The triggers, counted

Three of `promote`'s five. The bar is two. The two that do **not** fire are named
so the count is not read as five.

**① A pair already decided, in a different combination.** The pair is *(a human
stop, a set of things needing a reply)*. It has been decided at `grill-the-graph`
step 3, `grill-the-graph` step 5, `grill-map` step 3, `classify`'s fork, `decide`'s
options, `gate`'s verdict, `nit wiki`'s approval gate, `nit register`'s approval
gate, and — in the change that produced this record — `batch` and the traversal
declaration.

**③ An earlier item's stated premise measured false before the work could
stand.** The traversal declaration was revised to open with the acceptance
restated, sourced from `classify`. [ADR-0062](0062-the-issue-contract-names-the-cases-and-the-comparison-keys-on-answered.md)
had already measured that placement **impossible** — the declaration is `entry`'s
flush and `entry` is the run's start *before* `classify`, so the node that authors
the restatement has not run. The sweep found it after the edit landed and before
the change was called finished; the stage now carries `entry`'s own reading
instead.

**⑤ Two artifacts inside this project require opposite things.** The two quoted
above. Not a nuance of emphasis — one says batch, the other says several at once
is bewildering, and both govern the same act.

**② is not counted.** The chain from #55's cost analysis to this record is real
but loose, and a trigger that has to be argued for is not observable.

**④ is not counted.** No external prior art was consulted on presentation shape,
so it cannot be said to have failed to arbitrate.

## The rule

**Three clauses. Together they resolve any stop, including ones nobody has met.**

1. **The unit is the reply, not the item.** One stop presents one thing that a
   single reply answers. Several items sharing one reply are one stop; one item
   needing several replies is several.

2. **Order by dependency, and stop at the first unresolved one.** Where an answer
   changes what a later question means, it goes first — and the later ones are not
   presented until it comes back, because a wrong answer upstream has already
   invalidated them. Where the items are independent, the one that changes the
   others' meaning is the dependency.

3. **Material that needs no reply travels with the reply it supports.** It is
   never its own stop, and never a summary laid out ahead of the sequence — a
   contents page of what is coming is the same dump one step earlier, and the
   count of what remains already carries the size. And where that material
   restates something the reader can already open, it is compressed to a count
   plus what differs: a line that could not have been otherwise spends the reader
   on the lines that could. The count stays, because it is the one thing the
   compression could hide.

## What it derives

A record earns its place by deriving decisions already taken, not by listing them.

**Clause 1 produces opposite outputs from one rule, which is the test that it is a
rule.** `decide` presents *every* option of one call at once and stops — the
options are one decision, so they are one reply. `batch` presents its candidates
one at a time — each is its own disposition, so each is its own reply. The two
looked like a contradiction and are the same clause. It also settles `nit wiki`'s
**제외 bulk-approve**: many items, one reply, therefore one stop.

**Clause 2 produces `envelope`'s binding constraint.** *"Which item, decided
first, changes what the others mean"* is this clause with the sequence left
implicit; sequenced, naming the constraint *is* putting it first, which is why an
announcement on top of that is a second copy of one fact.

**Clause 3 produces the absence of a summary screen** in the revised `batch`, and
produces `nit register`'s *"the text first, then the fields"* — the fields support
the reply, so they travel with it rather than preceding it.

**Two combinations not among the triggers, to show the rule reaches past its own
evidence:**

- **`stop`** — the upstream-defect interrupt. It carries an explanation, a
  measurement, and one question (*investigate, or root-fix?*). Clause 1: one
  reply, one stop. Clause 3: the measurement travels with the question rather than
  being shown first. Never decided anywhere; derived here.
- **`grill-the-graph` step 5** — *"per generated artifact: show it, get approval,
  write it."* Clause 1 gives exactly that, and clause 3 says the artifact's
  contents belong to its own approval and not to a preview batch shown ahead of
  them.

## What it does not cover

- **How much an item carries.** `envelope`'s seven columns are untouched; this
  governs how many arrive at once, never what is in one.
- **Whether a stop should exist at all.** That is the invariants' — ③ makes
  `batch` the single door, and the traversal declaration is the only guaranteed
  stop. This rule shapes stops that already exist.
- **Presentation to a non-human reader.** A brief handed to a subagent, a slot
  written for a later node, a PR body: none of them replies, so clause 1 has no
  unit and the rule says nothing.
- **A stop whose reply is not a disposition.** The mechanism renders a choice,
  so it reaches a stop that has one. A stop that hands the reader an instruction
  to carry out elsewhere and then waits — authenticate, register the week, go and
  run this — offers nothing to choose between, and dressing it as a choice is the
  failure the mechanism's own caveat names. `nit` has two of these and they are
  left in prose deliberately, not overlooked.
- **A stop with no baseline behind it.** Clause 3's compression is measured
  against something the reader can already open, so it does not reach the run
  that *makes* that thing. `/grill-the-graph` step 6 shows the whole roster,
  absences and reasons included, and is right to: compressing against a file
  nobody has agreed to yet would hide the rows the build is asking about.

## The rule has a firing mechanism and no check, and those are different things

> **Amended 2026-09-03 — this section first said the rule had no firing
> mechanism, conflating the mechanism with the check.** The stops now name
> `AskUserQuestion`, which is a firing mechanism in ADR-0039's sense: it is what
> makes the stop happen rather than a bar someone remembers. What they still lack
> is a check. The original reasoning is kept below because the *unassertable*
> half of it was right and still is.

**The mechanism.** A stop written as prose the reader is expected to answer
unprompted does not fire — it is the bar-you-remember-at-the-end this method
keeps refusing, one level up from the code. The stops therefore name the tool
that renders a question: `envelope` step 5 for everything invariant ③ routes
through it, and the traversal declaration for itself, since ③ explicitly does not
reach it. Where the answer is open-ended rather than a disposition, plain text is
right and forcing the tool is worse than not having it.

**The check, which does not exist.** No gate can observe how a run presented
something to a person — the artifact is a transcript nothing reads, and there is
nothing on disk to assert against. Every other rule in this area is either
enforced or explicitly marked unassertable
([ADR-0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md), and
`grill-the-graph` 2b for facts outside the repository). This one is
**unassertable**, and saying so is the deliverable: an unassertable rule that
announces itself is a known hole, and one that says nothing is indistinguishable
from a checked one.

What partially stands in is that two of the three clauses leave artifacts a
reader can see — a batch that arrives with a summary screen has violated clause 3
in the transcript, and a declaration whose stages are not in dependency order has
violated clause 2 in the document that prescribes them.

## Consequences

- **`envelope`'s workflow goes from six steps to seven**, the new step 5 carrying
  clauses 1 and 3. Step 6 gains the sentence that sequencing makes naming the
  binding constraint the same act as putting it first.
- **`batch` gains what `envelope` cannot know**: it reads four slots whose
  dispositions share no vocabulary, so items are grouped by slot; and `dropped` is
  one group and one confirmation, because a drop is a record rather than a
  decision.
- **The traversal declaration becomes four staged statements**, of which two stop
  the run. The test for which ones stop is whether being wrong is caught later —
  a wrong roster is caught by the node that needed the missing slot, a wrong proof
  method by `proof` and `gate`, and **a wrong reading of the issue by nothing**.
- **The declaration states a delta and declines to draw; `decide` draws.** Order
  is the State table's and does not vary, so a diagram at the declaration renders
  the one part of the graph that cannot be wrong. By the time an edge routes to
  `decide` both have changed — something fired, some number of times, against a
  bound — and position with attempt count is the form that judgement needs.
- **The stops name `AskUserQuestion`.** `brief` is the precedent for naming a
  platform tool directly in a skill's own prose; the declared-externals file is
  for skills, and a tool is not one, so no row is added there. The name is now
  written in several skills, and nothing resolves it: an upstream rename breaks
  every one of them silently, which is the same shape as the rename problem the
  **Identity** column solves for declared skills. Recorded as a known hole, not
  closed.
- **A go-ahead does not write `human`.** Only a correction does. Counting consent
  as an observed decision manufactures the authority out of a keystroke, which is
  the silent failure [ADR-0045](0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md)
  already named from the other side.
- **`thegraph/SKILL.md` grew to 844 lines**, against the >500-line divergence
  [ADR-0057](0057-the-catalog-points-somewhere.md) recorded and left open. That
  record named `## State` and `## The reasoning habits` as the only candidates for
  relocation and rejected both. `## The traversal declaration` is now a third: it
  is read at one stop rather than on every traversal, which is the size trigger
  the other two lack. **Not decided here** — recorded so the next pass on that
  divergence has the candidate.

**The roster is not in this record.** Which call sites exist is the cluster's
fact and changes when a skill is added; the rule is this record's and does not.
The nine above appear as evidence for the trigger count, not as a list to
maintain.
