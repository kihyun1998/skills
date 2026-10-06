---
name: silt
description: "Read a change for what will make it slow, and refuse to call anything a defect without a number. Use before calling a change done, on any diff that adds state, loops, or I/O."
---

# silt — what settles, and what it costs

Silt is what a river carries and drops. Nothing about it is dramatic; it arrives
a little at a time, nothing looks wrong on any given day, and one season later
the channel is shallow.

Most performance defects are that shape. **The ones that announce themselves get
found;** the ones that cost are the ones a working feature acquires quietly and
nobody notices until the numbers are already bad.

## The rule everything else hangs off

**Before you measure it, performance is an opinion.**

This pass reads a diff for **shapes that cost**. A shape is not a defect — it is
a place worth pointing a measurement at. So every finding is one of two things:

- **measured** — there is a number, and something to compare it against. A defect.
- **suspected** — the shape is there and nobody measured it. A **question**, and
  it goes out as one.

**And a suspicion has to arrive with the way to settle it.** A finding that says
*"this might be slow"* and stops has handed over an errand and called it a
review. If you cannot say how to find out, the item does not go out at all —
that bar is what stops this pass becoming a list of things that make somebody
uneasy.

**A number with nothing beside it is not a number.** *"This takes 300 ms"* says
nothing. *"This takes 300 ms; before the change it was 40"* is a finding. Measure
the same thing on the tree as it stands **without this change** — the same
comparison the gates use to decide whose red a red is.

## The starting point

The diff is everything since the branch left its base — `git diff <base>...HEAD`,
three dots. **Do not ask which base**; the caller knows it. Standalone with no
obvious base, ask once, and confirm the ref resolves before anything else runs.

Read the hunks, then **open the files they landed in**. Half of these shapes are
invisible in a hunk: a subscription added here is only a leak because nothing
anywhere removes it, and the absence is not in the diff.

## The shapes

Each is a heuristic, not a verdict. Skip anything the project's tooling already
catches.

| Shape | Why it costs | The cheapest way to find out |
|---|---|---|
| **Registered, never released** — a subscription, timer, listener, watcher, handle, or file opened with no matching close on every path out | It accumulates. Fine for a day, slow after a month, and no test covers "a month" | Create and destroy the thing that registers it, in a loop, and count the registrations. Flat is fine; climbing is the finding |
| **A container that only grows** — a cache, list, or map with writes and no eviction | Same shape, one level up | Count the sites that add and the sites that remove. **Zero removals is the answer**, and it takes one grep |
| **I/O or a query inside a loop** — the classic N+1 | The call count follows the data count, so it is fine on your ten rows and not on their ten thousand | Turn on the query or request log and run it once. If the count tracks the row count, it is measured, not suspected |
| **A large structure copied by value** — a list or map passed or returned whole | Cost scales with size and nothing says so at the call site | Log the length once, at the widest call site you can reach |
| **Recomputed every time** — the same input producing the same answer on every call, render, or frame | Invisible until the input gets big or the caller gets hot | Count the calls. A pure function called far more than its input changes is the finding |
| **Blocking work on the thread that must not block** — file reads, big parses, heavy regex on the UI thread or the event loop | One slow call stops everything, and the symptom shows up somewhere else entirely | Time that one span. Anything a person would notice is already too long |
| **A lookup with nothing to make it fast** — a query filtering on an unindexed column, a linear scan inside a hot path | Fine until the table or list is big, and by then it is in production | Ask the database to explain the query. For a scan, count the elements at the widest real input |

## Grade each finding

| Grade | What it means | Where it goes |
|---|---|---|
| **measured** | a number, and a comparison | a defect — it is real and it is this size |
| **suspected** | the shape is present, unmeasured, and the way to settle it is named | a question for whoever decides |
| **deliberate** | a record or a comment says this cost was accepted on purpose | one line of acknowledgement |

**Where the shape is present and you measured it as free, say that too.** A shape
looked at and found harmless is a result, and it stops the next pass spending its
attention there again.

## What this does not do

**It proposes no optimisation.** Finding where the cost is and deciding what to
do about it are different jobs, and doing the first well does not license the
second. A rewrite proposed inside a review arrives with no measurement of the
thing it would replace.

**It does not widen.** The shapes above, on the diff and the modules it landed
in. A project that is slow for reasons this change did not introduce is a real
problem and not this pass's — say so once, with what you saw, and stop.

**It does not accept "it's fine, it's small".** That sentence is an unmeasured
preference, which is the thing this whole skill exists to refuse. If it is small,
the measurement is cheap; take it.
