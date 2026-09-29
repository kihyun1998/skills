---
name: thegraph
requires: [read-it, make-it, check-it, ask-it, lens, boundary, firsthand, redden]
disable-model-invocation: true
description: "Take one change from an issue to done, in a codebase whose identity is a boundary — a core that stays correct by not absorbing the concerns of the things that use it. Four skills in order, with one guaranteed stop before any of them: read the situation and say what you read it to be, write it, measure it, and put what is left in front of a person. Everything else is a signal you cannot schedule — the urge to patch around something deeper, a test just written, an outside reference about to be relied on, a call that is the maintainer's. Use when taking a tracked change from intent to merge, or when invoked as /thegraph."
---

# thegraph — one change, from an issue to done

Four skills in order, the signals that interrupt it, and the habits that hold
throughout. **Everything else lives in the skills this calls** — this file is
short on purpose, because what it holds is the part that has no home inside any
one step.

For a codebase whose identity is a **boundary**: an engine, library or core that
stays correct by *not* absorbing the concerns of the things that consume it.

## The order

### 1. Call `read-it`

It reads the situation before anything is touched — the issue, the cluster it
belongs to where the tracker has one, the map where the repo keeps one, and always
the real sources plus the hidden state a first-principles model misses. Each of
those is conditional on something it can check rather than weigh.

It comes back with two things: **what it understands**, and **which route**.

### 2. Stop, and have the reading confirmed

**This is the only guaranteed stop**, and everything below is conditional. A
change where no signal fires reaches a person for the first time at the very end,
with the work done and nowhere to have redirected it.

Two statements go to the maintainer — what this issue **is**, in your own words,
and what this change **will do** and deliberately leave alone. `read-it` holds
what each has to carry and what a correction to each one means.

**This is not `ask-it`.** That one comes at the end and asks what to *file*; this
one asks whether the reading is right, before anything has run.

**A correction to the first rewinds; nothing has run.** A correction to the second
is the maintainer's call, so it is recorded as theirs.

**And the answer may be that nothing further is needed.** A change that turns out
to be a typo ends here, said out loud. That is a result, not a skipped step.

### 3. Follow the route

These are `read-it`'s own four labels, returned verbatim.

| Route | What runs |
|---|---|
| **trivial** | nothing. It ended at step 2, said out loud |
| **open decision** — the issue asks for a choice, not an implementation | `lens` over the **options**, then a person |
| **prose**, **code** | `make-it` → `check-it` → `ask-it` |

**The open-decision route is the one that gets missed, and missing it is
expensive.** Run the adversarial read over the options *before* proposing one, or
the enumeration arrives after approval and whoever approved decided on incomplete
information — after which the costs it turns up get demoted into follow-ups. **A
decision is presented with its consequences enumerated, or it is not ready to
present.**

The last two share a row because the conditions live inside the skills. `make-it`
skips its test section for a change that does not run; `check-it` runs two of its
nine checks for prose — three where a file moved — and all of them for code.

## The signals that do not wait for their turn

**You cannot schedule the moment you will feel one of these.** They arrive with
your hands in the work, and the right response is to act on them there rather
than to note them for later.

| Signal | What to do |
|---|---|
| *"This is a bit odd — I'll just fix it up here"* | **Stop.** The problem is one step further in. `boundary` for where it belongs, then take it to a person — patching may be right, but somebody has to have decided it |
| a test, fixture, golden or guard just written or changed | `redden` — prove it can fail before believing that it passed |
| about to rely on an outside reference, API or fact | `firsthand` — the real source, not a summary. **Unconfirmed is a gap, not an absence** |
| a call about naming, structure, scope or direction | **Ask.** Present the options with their consequences, and stop. A pure technical mechanism is *not* one of these — deciding it is yours, and asking hands the work back |
| anything worth a person's attention that you are not acting on | **Carry it.** It goes out at the end, in one batch |

## What holds everywhere

**Ask the maintainer in Korean.** Every question and confirmation put to a person
is written in Korean.

**Nothing reaches a tracker unasked.** Not through a pull-request body, not
through a code comment — both are buried on merge. One door, at the end, and a
person decides what goes through it.

**What can be counted is counted.** Running the command, querying the tracker,
reading the file. Something you find yourself weighing that could have been
checked is something you skipped the check on.

**Report only what you verified.** Every fact in a status report comes from output
that actually appeared: created → list it, committed → log it, pushed → check the
remote. One at a time, never a batch of side effects summarised. When the check
contradicts the claim, **say so before anyone else finds it**.

## Habits

**Derive what the code and the named prior art can answer; ask what only a person
can.** Naming, structure, scope, priority, vision — those are the maintainer's,
and they will correct you. A wire format, an API shape, a coordinate system is
not, and asking about one is offloading. Decide it, check it against real source,
and present the result for a yes or no.

**Then record which of the two it was**, because they fall differently. **A
derivation falls to a better derivation. A judgement falls only to the person who
made it.** A record that does not say which it holds reads as a derivation, and
the next strong argument — often one your own checking produced — reopens a call
somebody already made.

**Record what it was decided *on*.** A call inherits the blind spots of whatever
it was made against. When a later finding contradicts one, the question is not
*may I reopen this* but **could the thing they were shown have revealed this?** If
it could and they chose anyway, it is settled and the finding is context. If it
could not, the call is not settled — it is **untested**, and the honest move is
neither silent deference nor silent escalation but a better artifact. Say which of
the two you are in.

**Watch what a recorded choice did not cover.** What the maintainer judged is what
they were shown, and a decision about one thing does not settle its neighbours
because the same change happened to produce them. Write down what it did not
cover, or the next pass reads the neighbours as decided.

**Build an artifact to answer the decision, not to carry the argument.** A
prototype scoped to the point you are making produces a decision about the
prototype. Widen it until it can show the cost of being wrong — the neighbours,
the sibling states, the other paths through the same rule — because that is the
part nobody can ask you for: they do not know what you left out of frame.

**First principles and named prior art together.** Convergence between the two is
the signal that a decision is not arbitrary, and prior art shaves details a
first-principles model under-reaches. Where they disagree, **this project's own
measurement wins and an unmeasured preference does not** — and where a decision
record has already settled that particular clash, the record governs. *"Perfect"*
is not *"maximally granular"*; it is the right grain.

**Size the thinking, and never let it buy the proof.** Raise it for ambiguity,
long chains of reasoning, an adversarial self-check; lower it for a bounded task
against a settled contract. **No amount of it replaces a gate, a round trip, or a
mutation that reddens.**

**Conformance is cumulative.** Full compliance with a large method is not written
in one pass — start from the common case and grow the tail as real use breaks new
ones. Get the skeleton right from the start.
