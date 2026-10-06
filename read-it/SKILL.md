---
name: read-it
requires: [spine, firsthand]
description: "Read the situation before touching anything, and come back with a route. Use as the first step of `thegraph`, or alone to size up an issue."
---

# read-it — read the situation before you touch it

The first act of a change, and the only one whose mistakes nothing downstream
catches. A wrong proof method fails at the proof. A wrong placement fails at the
diff. **A wrong reading of the issue passes everything**, because a run that
solves the wrong problem well is still a run that solved something well.

What comes back is two things: **what you understand**, and **which route this
change takes**.

## What to read

Four reads. **Three are conditional, and every condition is something you check
rather than weigh** — a run that does all four and a run that does one are both
ordinary. What is not ordinary is skipping one and being unable to say why.

| Read | When | Call |
|---|---|---|
| **the build** | `docs/agents/thegraph.md` exists | — |
| **the cluster** | the issue has a parent or siblings | `spine` |
| **the territory** | the repo keeps a dependency or territory map | — |
| **the real sources, and the hidden state** | always | `firsthand` |

### The build

`docs/agents/thegraph.md` is short — the outside sources this project is built
against, each marked what it informs, how it is reached and whether it binds,
plus a line of what the project is. Read it whole; there is nothing to skim.

**It answers very little on purpose**, holding only what a person already knows
and no file in the repo states. Everything else is read where it is said:
`CLAUDE.md` for the project's identity and its seams, `GLOSSARY.md` for the
glossary, the decision records for what has already been settled. Where the file
is absent, say so and name what you read in its place.

### The cluster

**One tracker query answers whether this read applies**: does the issue have a
parent, or siblings under one? If it does, run `spine` — read the anchor and its
siblings before the ticket, treat the anchor's root as a **hypothesis to test**,
and read a parent before the issue it produced.

An issue is written at filing time and read at work time, and the context that
made it obvious decays in between. A fix reasoned from the ticket alone re-decides
what a sibling already settled, which is how closing one issue produces the next
while looking like diligence.

Where the tracker has no parent/child relation at all, the roster is prose and
needs reconciling by hand — find that out with the query rather than assuming it.

### The territory

A map, where the repo keeps one, holds the half a ticket structurally cannot
carry: **what else moves when you touch this**, and **which decision the shape
came from**. Two things it supplies that nothing else does — a cross-cutting rule
promoted out of an earlier change, which by construction is invisible from the
territory you happen to be standing in, and the rule that settles a case you have
not met yet.

Read it here or read it as rework later. A repo with no map has nothing to read
and nothing to record about not reading it.

### The real sources, and the hidden state

Always, and both halves are `firsthand`'s: read the real thing rather than a
summary, then enumerate the hidden state the real thing tracks that a
first-principles model omits.

**The build's source list widens what you read; it never decides whether you
read.** With no outside source named you still enumerate the hidden state of the
code this change touches, which is the half that is never optional. With sources
named, take the ones whose **Informs** column matches this change: a change that
moves no file does not read the folder-structure reference.

Two things carry forward, and both matter later:

- **Which sources are marked summarized.** A finding resting on one can never be
  confirmed outright; it carries forward as *needs confirming against the real
  thing*. A summary drops method bodies, and a handler that is there reads as
  absent.
- **Unconfirmed is a gap, not an absence.** What survives that guard goes into
  the understanding; what does not becomes a candidate or an explicit question,
  never a premise.

## What the issue is supposed to supply

Read the issue for six things. **A ticket answering none of them is the ordinary
case, not a defect** — this method ran that way before the list existed and still
does. Name the empty ones when you restate, and that is the whole of it.

- **Agreed direction** — the call this change implements, in the maintainer's own
  words.
- **Required cases** — the cases this change must demonstrate, each named as a
  case rather than as the shape of the work.
- **Decided interfaces** — the module and contract shapes already settled. No
  paths and no snippets: a ticket outlives the tree it was written against.
- **Proof expectation** — what has to be shown before this counts as done.
- **Out of scope** — what this change deliberately does not touch.
- **Anchor** — the parent issue, as the tracker's own relation where it has one.

**An answer here is a starting point, not an authority.** It saves you looking
the value up; it settles nothing, and a later step that finds the code disagreeing
follows the code. The one exception is a call you watched the maintainer make —
that one is theirs to reverse, so carry it forward as theirs and say so.

## Restate it, then stop

**Say what you read the issue to be, in your own words, and what this change will
do — then stop and ask.** Use the tool that renders a question where the harness
has one: a stop that prints its plan and trusts the reader to interrupt is not a
stop.

**This is the only guaranteed stop.** Every later one is conditional, so a change
where nothing goes wrong reaches a person for the first time with the work already
done and nowhere to have redirected it.

Two statements, and both are here because nothing else catches them being wrong:

1. **What this issue is**, as you read it. A paraphrase proves you built a model
   of what was asked; repeating the wording back proves nothing. It is read by the
   person who holds the issue and did not write your sentence, which is what makes
   it worth asking.
2. **What this change will do**, and what it deliberately leaves alone.

**Ask ① alone where the issue supports two readings**, and build ② from the answer
rather than writing it first.

**A correction to ① rewinds** — nothing has run. **A correction to ② is the
maintainer's call**, so record it as theirs: what they were shown, what the
alternatives looked like, what they chose, and that it is theirs to reverse. A
value a person fixed and nothing recorded is one the next run gets wrong the same
way.

**A go-ahead is not a decision.** Watching someone approve your reasoning is not
watching them make the call, and counting it as one manufactures an authority out
of a keystroke.

## Pick the route

Route from the **restatement**, never from the title or your impression of the
change's size. Return the label; what each label calls is not this skill's to
know.

| Route | When |
|---|---|
| **trivial** | a typo, a comment, a rename the compiler fully checks. Nothing further runs |
| **open decision** | the issue's own acceptance reads *"decide (a) or (b)"* |
| **prose** | documentation, configuration, skills — nothing that compiles or runs |
| **code** | a feature slice, a bug fix, any refactor touching the public surface |

**The open-decision route is the one that gets missed**, and it is the expensive
one: an acceptance framing a real decision reads as ordinary work if you skimmed
it, and the mis-route stays invisible until the enumeration arrives too late to be
part of the decision. The tell is cheap — you are about to write *"the tradeoff is
X"* and X came from your own reading rather than from an adversarial pass. **A
decision is presented with its consequences enumerated, or it is not ready to
present.**

**Proceed silently when the restatement settles the route.** Surfacing a question
the issue already answered is not caution, it is handing the work back. If a
genuine fork survives — the issue supports two routes and nothing available chooses
between them — name that one fork, anchored to the restatement rather than to a
vague *"is this right?"*.

## Everything here is a candidate

A sibling signal, an unconfirmed gap, a defect noticed on the way past: none of it
is filed, and none of it becomes an issue here. **Nothing reaches a tracker
unasked.** It is collected, carried, and put to the maintainer in one batch at the
end, with what was measured and what has already been done about it.

Reading is when the most of these appear and the fewest are worth acting on.
Carry them.
