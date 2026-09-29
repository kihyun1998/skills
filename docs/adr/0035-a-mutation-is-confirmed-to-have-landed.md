# A mutation is confirmed to have landed before its count is read

`redden` said *"turn the change off and run"* and then read the colour. It never
said to check that the turning-off worked. Two independent runners had already
discovered that it must.

## Both misses come back looking like results

A mutation is applied by replacing an anchor. When the anchor is wrong, the run
still finishes and still prints a verdict — about the anchor, in the grammar of a
verdict about the test.

| The anchor matched | What happened | What the run reports | Cost |
|---|---|---|---|
| **zero times** | nothing was edited | green → *"this assertion is vacuous"* | a false accusation against a working test |
| **twice or more** | a site nobody named was edited too | red → *"discriminating"* | a false **CONFIRMED**, which is the expensive one |

The zero case is the common one and it hides well, because an anchor that matches
nothing is usually an anchor that looks right.

## Two triggers, in two repositories

| Where | What it cost |
|---|---|
| A vitest mutation runner in a downstream repository, written before `redden` existed | It refuses zero-and-many matches as its **first** refusal, recorded as coming *"from a real failure"*: an anchor that was a superstring of the real one *"silently edits nothing while `toContain` still passes, and the sweep reads green"* |
| This repository's `scripts/check-restructure-spec.py` | **Three false greens in one pass** — a probe missed a hard line wrap (fixed by `flatten()`); a lowercase `never average` searched a file saying `Never average`; `\1`/`\2` written into a replacement string became literal control bytes `\x01`/`\x02` (fixed with a replacement function) |

Two triggers clears the bar in [`promote`](../../promote/SKILL.md), so this is a
rule in the Workflow and the Rules, not a note on one bar.

## What it is not

Not the restore check. `redden` already said *"put the code back and confirm the
baseline is green again"*, and the downstream runner goes further, comparing bytes
after the restore and failing hard on a mismatch. **Both prove the file went back
and neither proves it was ever changed.** A no-op mutation restores perfectly.

Not the baseline re-run either. Bar 1's *"re-run the baseline in the same pass"*
catches a suite that was already red; it cannot see an edit that never happened,
because in that case the two runs agree — correctly, and about nothing.

## Consequences

- **`redden` gains a step between Bar 1 and Bar 2**, and the following steps
  renumber. Nothing cites them by number: every reference in this repo names
  *Bar 1/2/3* or *the five patterns*, which is why those carry names.
- **The Verification list gains a sixth item** — *every mutation you ran is one
  you watched land* — so a pass that skipped the check reports that it did.
- **The rule states the mechanism**: exactly one anchor match, then a diff. Both
  halves are needed; a unique match still fails to apply if the write is
  re-encoded on the way out.
- **Both of this repo's gates gained the guard**, and it reports a *third*
  outcome rather than folding into the existing two:

  | | `check-restructure-spec.py` / `check-skills.py` |
  |---|---|
  | before | `FAIL … stayed green; asserts nothing` — the check is blamed |
  | after | `DEAD … edited nothing; the anchor is wrong, not the check` |

  Measured by running a probe whose anchor cannot match against both the pre-fix
  and post-fix harness: the pre-fix one prints the false accusation, the post-fix
  one names the anchor, and all fourteen real mutations still land in both.
- **A red catalog blocks the catalog selftest**, by design — *"the real catalog is
  not green, so nothing can be proved from it"*. While `sift` is over the cap that
  gate proves nothing, which is a larger cost than the failing check itself.
