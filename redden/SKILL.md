---
name: redden
description: "A passing test proves nothing by itself. Name which assertion can observe the change, then run three mechanical bars on it — turn the change off and confirm that assertion reddens while the baseline stays green, assert the side conditions a bug could satisfy, and swap the predicate for a plausible differently-wrong one and require red. When it stays green, classify why against the five patterns that make a test unable to fail — shared wrong model, surface ablation, vacuous window, proxy condition, self-drawn fixture — collapse them to one root, and add the cheapest assertion that closes it before any fix. Use right after writing or changing a test, a fixture, a golden, a snapshot, or a guard; when a suite is green but the bug shipped; or whenever a test was never seen failing."
---

Prove the test can fail before you trust that it passed.

## Goal

A green you never saw red is not evidence. A test can pass because the behaviour
is correct, or because the test never asked — and from the suite output those two
are the same colour. `redden` makes the difference observable: for each assertion,
name the mutation that should redden it, and **run that mutation**.

That generalisation covers everything below. The bars are how it is run; the
patterns are what a surviving green means.

## Workflow

1. **Name the assertion first.** Before mutating anything, say which assertion in
   this test, fixture, golden, or snapshot can observe *this* change. An artifact
   usually pins several surfaces and a given change can move only one of them, so
   *"something went red"* is not evidence that the right thing did. Naming it
   first is what makes every later step meaningful.

2. **Bar 1 — discriminating power.** Turn the change off and run. The named
   assertion must go red. **Re-run the baseline in the same pass**: both red means
   you broke the proof, not that the mutation worked. Remove guards one at a time,
   and check that a new guard fires *before* the old one rather than behind it.

3. **Confirm the mutation landed before reading the count.** An edit is a
   mutation only once you have seen it take. Require the anchor you are replacing
   to match **exactly once** in the file, and diff after writing. Both misses come
   back looking like results:

   | The anchor matched | What actually happened | What the run reports |
   |---|---|---|
   | **zero times** — a superstring, a different case, a hard line wrap, an escape taken literally | nothing was edited | green, read as *"this assertion is vacuous"* — a false accusation against a working test |
   | **twice or more** | a site you never named was edited too | red, read as *"discriminating"* — a false **CONFIRMED**, and the expensive direction |

   Both directions have been hit. A runner built for exactly this refuses
   zero-and-many *"from a real failure"*; a checker in another repository
   produced three false greens in a single pass — one from a hard line wrap, one
   from `never` searched against a file saying `Never`, and one from
   backreferences written as literal control bytes.

4. **Bar 2 — right reason.** Assert the side conditions: the callback that must
   **not** fire, the exact count, the resulting state. A single positive assertion
   can be made true by a bug; the surrounding negatives are what expose it.

5. **Bar 3 — mutate the predicate, not only the placement.** Moving a guard
   between neighbouring statements, or deleting it, shakes *where* it runs and
   says nothing about whether it asks the right question. Swap the predicate for a
   plausible **differently-wrong** one and require red. Staying green means no
   assertion lives in the window where the two candidate predicates disagree.

   This bar exists because the first two were cleared and the fix was still
   wrong: a guard asked an event-driven flag about a state the platform changes
   *synchronously*, and the proof awaited that very event before testing, so it
   never entered the window where the two predicates differ. Placement was
   mutation-tested and green; the defect survived verbatim. Do not stop at Bar 2.

6. **Classify a surviving green.** A mutation that should have reddened and did
   not is a finding, not a puzzle. Name which of the five patterns below it is.

7. **Collapse to one root.** Several weak assertions are usually one gap seen
   several times. Report the root and the **cheapest assertion that closes it**,
   not a list — and add that assertion *before* fixing anything else, so the fix
   lands against a proof that can observe it.

8. **Cold-read it where the stakes justify one pass.** Hand the test alone — never
   the implementation, never your reasoning — to a reader with no context, and ask
   what behaviour it pins. A test whose subject a stranger cannot state is one
   nobody will maintain correctly, however green it runs.

## The five patterns

Why a test that should have reddened did not. Each is mechanical enough to
confirm, and each names its own repair.

| # | Pattern | What happened | The repair |
|---|---|---|---|
| 1 | **Shared wrong model** | The test and the code encode the same misunderstanding, so they confirm each other. A golden can be green in both states *by construction* when the harness normalises its input with the same defect the engine has. | Derive the expected value from outside the code under test — a specification, a second implementation, a hand-computed case. |
| 2 | **Surface ablation** | The mutation removed a label the behaviour does not depend on while leaving the signal it actually uses. Moving or deleting a guard is placement; the predicate is the signal. | Mutate the predicate itself, then re-run. |
| 3 | **Vacuous window** | The state the assertion tests never occurred. A proof that awaits an event before testing never enters the window where two candidate predicates differ. | **Assert the window exists** before asserting behaviour inside it, so a platform that stops producing it makes the test *report* that instead of passing silently. |
| 4 | **Proxy condition** | The assertion measured a stand-in, not the thing: a flag for a state, an event for a transition, a successful return for liveness, an announced string for a visual effect. A headless run proves only what it consumes. | Assert the state directly, or drive it on the real surface and lock the regression in. |
| 5 | **Self-drawn fixture** | The artifact being graded was produced by the thing under test, or recorded under conditions that wash the state out before the assertion runs — the verifier is the author. | Re-record the fixture under the failing condition and confirm it differs, or pin the value independently of the producer. |

Patterns 1 and 5 are the expensive ones: both read as new coverage while proving
nothing, and neither is visible from the suite output.

## Rules

- **A green from a test you never saw fail is not evidence.** This is the whole
  reflex; every bar is a way of buying that observation.
- **A pass that finds nothing changes nothing.** All three bars cleared and every
  named mutation reddened is a real result — report it and stop.
- **Never loosen the target to make a mutation redden**, and never move a
  threshold, widen a tolerance, or delete an assertion to turn a build green.
  Lowering a floor permits exactly that much regression, and real regressions come
  to rest just under it.
- **Run each bar bare, never piped.** A pipeline's exit status is the last
  command's, so a run whose result is filtered through another command always
  succeeds. A gate you cannot fail is not a gate.
- **Roots over instances.** A spread of weak assertions sharing one gap is one
  finding with the others as evidence under it, not several findings.
- **Read, don't sweep.** Grepping for assertion patterns finds only the shapes you
  already suspected. The bars are run, not matched.
- **A mutation you did not see land is not a mutation.** Confirm the edit took —
  exactly one anchor match, then a diff — before the count means anything. A
  byte-for-byte restore check proves the *file* went back and says nothing about
  whether it was ever changed.
- **Restore after mutating.** The mutation is an experiment, not an edit — put the
  code back and confirm the baseline is green again before reporting.
- **The cold read comes from a context that never saw the implementation.**
  Self-assessing it in the session that wrote the test cannot work; you cannot
  un-know what the code does.

## Verification

Before finishing, turn the reflex on this pass:

1. Every assertion you *added* was itself put through Bar 1 — an assertion added
   to close a gap and never seen red has reproduced the defect it was written for.
2. The named assertion from step 1 is the one that reddened, and the others did
   not. If several went red, say which mutation was too broad.
3. Every surviving green is classified as one of the five patterns, or reported as
   unexplained — never left as *"probably fine"*.
4. The report is a root and the assertion that closes it, not a checklist.
5. Every mutation you ran is one you watched land, not one you assumed did.
6. The code is restored and the baseline is green.
