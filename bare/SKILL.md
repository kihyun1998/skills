---
name: bare
description: "Run every gate, each one bare. A pipeline's exit status is the last command's, so a check whose result is filtered through another command always succeeds — a gate that cannot fail is not a gate. Run all of them, including the blind spots a single top-level command never reaches: members outside the workspace, host-versus-target splits, separate manifests, formatter pins, real-browser runs. A top-level \"test everything\" often does not even build the excluded members, so renames and public-path changes need their own explicit check. Never move a threshold to turn a build green — lowering a floor permits exactly that much regression, and real regressions come to rest just under it. A list that mirrors CI names its authoritative source and asserts against it rather than restating it. Use before calling a change green, and whenever a single top-level command is standing in for the whole suite."
---

Run every gate, bare, and never move a line to make one pass.

## Goal

Three ways a gate stops being one, all of them silent.

It gets **piped**, so its exit status is discarded. It gets **missed**, because a
top-level command never reached it. Or its **threshold moves**, so it passes by
being asked less. In each case the build is green and nothing reports that the
green is worth less than yesterday's.

## Workflow

1. **Enumerate every gate, including what the top-level command does not reach.**
   The recurring blind spots: members outside the default workspace, host-versus-
   target splits, separate manifests, formatter and lint pins, and anything that
   only runs in a real browser or on the real target. A top-level *"test
   everything"* frequently **does not even build** the excluded members, so a
   rename or a public-path change needs its own explicit check.

2. **Name the authoritative source the list is derived from, and assert against
   it.** Where the list mirrors CI, a hand-kept copy is a second declaration that
   does not know it is one, and it drifts silently. Point at the workflow file and
   check the list against it rather than restating it. Measured: two commands were
   missing from one repo's list until they cost a red build, and both were steps of
   the **same CI job** as commands that were present — so *"I ran the local
   matrix"* read as complete.

3. **Run each one bare.** Its exit status must be the thing you read. Never pipe
   it into a formatter, a filter, a line-count, or a summarizer before judging it,
   and never chain it into the action it is supposed to guard.

4. **Read every result, including the ones you expected.** A gate whose output you
   skimmed because it always passes is a gate you have stopped running.

5. **On a failure, fix the cause.** Not the threshold, not the assertion, not the
   scope. If the same failure survives three fixes with the same signature, stop:
   that is a design question wearing a gate's clothes, and it goes to whoever owns
   the design.

6. **Report which gates ran, which passed, and which were not run** — with the
   reason for each of the last. *"Gates green"* over a list nobody stated is the
   same claim as *"I did not check"*.

## Rules

- **Bare, never piped.** A pipeline's exit status is the **last** command's, so a
  filtered check always succeeds and then does whatever it was chained to. **A
  gate you cannot fail is not a gate.** This is the rule most worth extracting
  into a script, because the shape cannot then be got wrong twice.
- **Never move a threshold to turn a build green.** Lowering a coverage floor, a
  lint budget, or a size limit permits **exactly that much** regression, and real
  regressions come to rest just under the line. Raise it when the real number
  rises; never lower it to clear a red.
- **Never narrow a gate's scope to make it pass**, which is the same move wearing
  a different noun.
- **Do not watch CI during the work.** Local gates mirror it; CI's real value is
  the release gate and the jobs that only exist on the real target. Watching it
  mid-change substitutes a slow signal for a fast one.
- **A skipped gate is reported, not omitted.** An unreported skip and a gate that
  does not exist are indistinguishable later.
- **Never bypass a hook or a signature** to get a commit through. If a hook fails,
  the hook found something.

## Verification

Before finishing:

1. Every gate in the enumerated list either ran or is reported unrun with a reason.
2. The list was checked against its authoritative source, not restated from memory.
3. No gate was piped, filtered, or chained into the action it guards.
4. No threshold, tolerance, or scope moved during this pass. If one did, it moved
   because the real number moved, and that is stated separately.
5. Every reported pass traces to output that actually appeared — not to a command
   that was issued and assumed.
