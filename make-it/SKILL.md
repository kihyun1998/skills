---
name: make-it
requires: [tdd, redden]
description: "Write the change, test-first where it compiles or runs. Use as the writing step of `thegraph`, after `read-it` has named a route."
---

# make-it — write the change

`read-it` said what this change is and which route it takes; this is the
route being walked.

**It does not decide it is done.** That is `check-it`, and the two are kept apart on
purpose: the hand that shaped a thing is the worst judge of whether it is
finished.

## Tests

**Where the change compiles or runs, call `tdd`** — what a good test is, where
seams go, and the anti-patterns are all its. **Confirm the seams before writing
the first test**, which is `tdd`'s own bar and the one most often skipped.

Drive it **one behaviour at a time**. Take side effects — ports, clock,
clipboard, scroll, DOM, IPC — through **injected seams**, and assert against
*structural* types the real thing already satisfies. The logic under test depends
on no infrastructure, which is the whole reason it can be tested at a seam at all.

**Then call `redden` on every test you write or change**, and on every fixture,
golden, snapshot and guard. This is the one thing `tdd` does not do: **a green
from a test nobody ever watched fail is not evidence.** Name the mutation that
should redden the assertion, run it, and believe the green only after it goes red.

**One exception, and it is narrow.** Where **compilation itself enforces
completeness** — a new field on the wire that every layer has to thread — strict
RED is awkward, because the code does not compile until every site is done. A
round-trip test takes its place. **Still write the new-behaviour test before the
implementation**, so the test never merely trails the code it was supposed to
drive.

**Where the change is prose** — documentation, configuration, a skill — there is
nothing to redden, and none of the above applies. Everything below still does.

## The rhythm

**Typecheck and run the nearby tests often. Run the whole suite once, at the
end.**

The full suite at every step is slow enough that it stops being run. The full
suite only at the end means an hour of work discovers its problems all at once,
which is when they are hardest to attribute to anything.

## What a comment carries

**A comment says what this code is.** Where the rest goes — the why, the trap,
the measured value, the history — is written in the repo's `CLAUDE.md`, because
comments are written on every edit and most edits never pass through here.
`grill-the-graph` puts it there. Follow that, not a copy of it.

Where `CLAUDE.md` says nothing about comments, the first sentence still holds and
the rest goes to the commit message. Say that the rule is missing, and name
`grill-the-graph`.

## Four signals that only appear here

These do not have a place in a sequence, because **you cannot schedule the moment
you will feel them.** They arrive with your hands in the code. When one does, act
on it there.

### *"This is a bit odd — I'll just fix it up here"*

**Stop.** That sentence is the tell that the problem is not where you are: you are
about to patch, in the place you happen to be standing, something that is wrong
one step further in.

It is tempting because it works, it takes five minutes, and the tests go green.
What it costs is invisible: everyone else calling that same thing writes the same
patch, none of them knows about the others, and **the day somebody fixes the real
problem, every patch becomes wrong** — silently, with no error and no failing
test.

Call `boundary` to work out where it actually belongs, then **come to the
maintainer with it**. Do not patch it alone, and do not quietly file an issue and
move on. Patching may well be the right call — what matters is that it is a
decision somebody made, not an `if` nobody can see.

### A new file with no obvious home

Where a file goes is where a boundary is **physically** expressed, so putting one
in the wrong place breaks the boundary while producing no error, no failing test
and no warning.

Read three things together: the tree as it actually is, any layout rule
`CLAUDE.md`, `GLOSSARY.md` or a decision record already states, and the
folder-structure reference the build names. **A stated rule beats what the tree
merely happens to look like** — otherwise you ratify the drift instead of
catching it. Write the answer down as concrete paths; `check-it` matches the final
diff against them.

Where two directories hold the same kind of file and nothing says which is the
rule, that is a structure call — take it to the maintainer.

### About to write against an outside reference

**Call `firsthand`.** Read the real source rather than a summary — a summary
drops method bodies, and a handler that is there reads as absent. Pin a runtime
value with a throwaway probe rather than reasoning about what the code must do.

Unconfirmed is a gap, not an absence.

### A call that is the maintainer's

Naming, structure, scope, direction. **A pure technical mechanism is not one of
these** — anything derivable from the code plus a named reference is yours to
decide, and asking about it hands the work back.

Present the options **with their consequences enumerated**, not one option and an
argument for it, and stop.

## What you notice and do not fix

Writing is when you see the most and should act on the least. A defect in
passing, a test that looks weak, a name that is wrong, a doc that contradicts the
code — **carry them.** Nothing is filed here, and nothing becomes an issue here.

They go to `ask-it` at the end, in one batch, each with what you measured and
what you already did about it. **Nothing reaches a tracker unasked.**
