# A copy names its authority and is checked against it, because a build stamp labels and does not warn

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).
> Every artifact this record names is deleted; the rule is not.** `cluster.py`,
> `gates.py`, `stamp_check.py` and the build they were compiled from were retired
> with this repo's `thegraph` build, so the five-link chain below has no live
> instance in this repository. It is stated in `grill-the-graph` and applies to
> every repo built by it. **The evidence keeps its full force** — a stamp labels
> and does not warn — and ADR-0065 enumerates what stopped being asserted here
> rather than reporting a clean removal.

The first `/grill-the-graph` build wrote four artifacts under `scripts/thegraph/`,
each stamped with the revision it was compiled from. The stamp's stated job is in
`thegraph`'s own words: *"if the stamp is behind, say so and continue — warn,
never rebuild."*

Eight commits later all four were behind, and the re-grill at `c39f0a0` turned
that into an experiment with a control nobody arranged.

## The measurement

| Artifact | Behind | Its data actually wrong | Warned |
|---|---|---|---|
| `gates.py` | yes | yes — recorded 3 gate commands, the hook ran 5 | **yes, exit 2 on every run for eight commits** |
| `cluster.py` | yes | yes — roster missing `0049`/`0050`, so `next_record_number()` returned a number already taken | **no** |
| `tree_rule_check.py` | yes | no | no *(correct)* |
| `trigger_check.py` | yes | no | no *(correct)* |

Identical stamps, identical staleness, opposite behaviour. **`gates.py` did not
die because of its stamp** — it reads `scripts/hooks/pre-commit` and asserts its
own command list against it, in both directions; its docstring says *"This list is
not authoritative."* The stamp is a string printed inside the resulting message.

> **A stamp labels. It does not warn.** What warns is a copy that names its
> authority and is checked against it.

## Trigger 1 — a stated premise measured false

Issue #14 recommends **S**: *extend the build stamp to every skill that writes
artifacts into a repo; the consumer notices it is behind when it next runs the
skill.* That rests on the stamp being a detector. It is not one, so extending it
to `grill-map` would produce a `grill-map` artifact that also labels and also
warns nobody.

`promote`'s trigger list names this case directly — *measuring an earlier item's
stated premise false before you could start.* S is re-specified in that issue as
**assert against an authority**, not **carry a stamp**.

## Trigger 2 — a gate that could not fail in one direction

`cluster.py` had a `--selftest`, and it was green the entire time. It checks that
the roster is contiguous from 1:

```python
used = sorted(int(n) for n in nums + list(VACATED))
if used != list(range(1, len(used) + 1)):
```

A roster missing its **newest** records is perfectly contiguous. `1..48` passed
while `0049` and `0050` sat on disk unlisted. **The check was anchored at the
bottom and nothing held the top.**

This is D5's own bar — *a gate you cannot fail is not a gate* — failing in a way
the bar does not describe. The gate could fail; it could not fail on **this**,
and a green result from a check designed for exactly this class is worse than no
check, because it is read as an answer.

## The decision

**1. A generated artifact that holds a copy of build data names its authority and
asserts against it on every run.** `cluster.py` now reads `docs/adr/` — the record
files themselves, which cannot be stale — and reports both directions: a number
listed with no file, a file no area lists, a live record called vacated. Run
against the pre-fix roster it reports exactly the two missing numbers.

The authority is the **files**, not `docs/adr/README.md`. The index is a curated
document that can itself drift; the files are the fact.

**2. The assertion is proven able to fail by mutation, and the mutations attack
the direction that was missed.** Three: drop the newest record from its area,
list a number with no file, call a live record vacated. The first is the actual
defect.

Each is checked to have **landed** before its result is read (ADR-0035). The
first draft dropped `max(...)` from one named area on the assumption the newest
record lives there; when it does not, the mutation edits nothing, the check
returns `[]` anyway, and the selftest reports *"MUTATION SURVIVED"* — naming the
wrong cause and making the roster look unbreakable when the edit simply missed.
This was found by the refuting pass on this change, not by the check going red.

**3. The generated artifacts are gated.** The hook goes from five commands to
nine — the three artifact selftests plus `gates.py --drift-only`. This is the
part without which the other two buy nothing, and the reason is measured in the
same data: **`gates.py` detected its own drift correctly and changed nothing for
eight commits, because nothing ran `gates.py`.** The chain is four links, not
three:

> hold a copy → name the authority → assert against it → **and be invoked by a
> gate**

An assertion nobody runs is exactly as inert as a stamp nobody reads. ADR-0048
made this argument once for the repo-level gates; the generated artifacts were
outside it, which is why the same failure recurred one layer down.

## Cost

The hook goes from **1.8 s to 2.4 s**, best of three, on the development machine.
Four more Python process starts at roughly 150 ms each — consistent with the
profile taken for ADR-0048, where process start was about a quarter of the total
and the prose scan was 68%. Nothing here touches the scan.

## What this does not do

- **It does not close #14.** That issue's subject is a skill improving while the
  repos built against it do not, and every instance measured so far was in *this*
  repo. The consumer half is untouched and now has a working shape to copy —
  `check-skills.py --resolve` already proves a repo-local check can read
  `~/.claude/skills`, guarded by that directory's presence.
- **It does not give `gates.py` a `--selftest`.** Its drift check has gone red
  twice in practice, which is evidence and not a mutation proof. Recorded as
  `gate` blind spot 7 rather than left implicit, because it is the one gate in
  this repo held to a weaker standard than D5 states.
- **It checks the numbers, not the grouping.** `docs/adr/` is authoritative for
  *which records exist*; it cannot say which **area** a record belongs to, and
  `cluster.py`'s value is the grouping. A record filed under the wrong heading
  passes every check here. The authority for that is `docs/adr/README.md`'s
  by-area sections, which is a curated document and can itself be wrong — so
  checking against it would assert one editorial judgement against another rather
  than against a fact. Left unchecked deliberately, and named here so the next
  reader does not mistake a green roster for a correct one.
- **It does not make every artifact assertable.** `tree_rule_check.py` and
  `trigger_check.py` hold path lists whose only authority is the build document
  that generated them, so their selftests remain internal. That is honest: an
  artifact whose authority is its own generator has no independent fact to check
  against, and inventing one would be the tautological trap this build already
  records three of.

## [Amended the same day] Gating the artifacts was necessary and not sufficient

Within hours of the hook gaining `cluster.py --selftest`, `cluster.py` was found
**broken in its only real function.** `search()` shelled out to `gh` with
`text=True` and no `encoding`, so the output decoded with the console codepage;
every issue title in this tracker contains an em-dash, so the reader thread died,
`r.stdout` came back `None`, and the run ended in an `AttributeError`.

**The `search` node's artifact had never once returned a result** — not since the
first build. The selftest was green the whole time, in the hook, because it
checks the record roster and never runs the query.

That is this record's trigger 2 a second time, in the same file, one level over:
the first was a check whose *assertion* missed a direction; this is a check that
never *executes* the subject. So the four-link chain above has a fifth condition
that was implicit and should not have been:

> hold a copy → name the authority → assert against it → be invoked by a gate →
> **and let the assertion reach the work**

A selftest over pure data structures proves the data structures. It says nothing
about the subprocess, the decode, or the print — which is where this artifact
actually lived. `cluster.py`'s selftest now runs a real query and prints a live
title, so the path that broke is the path that is exercised.

**The same hole was latent in two more artifacts.** `tree_rule_check.py` and
`trigger_check.py` both decoded `git ls-files` with the console codepage; the
paths in this repo are ASCII today, so neither had failed yet. Fixed in the same
pass rather than left to fail later, and the note is copied to each call site
because the next author of a generated artifact will reach for `text=True` alone.

## Consequences

- **`gate` blind spot 6, *"the generated artifacts are gated by nothing"*, is
  closed** and replaced by the narrower blind spot 7 above. Two entries have now
  been closed by measurement rather than edited in place, and the list renumbers
  each time — the same discipline as a vacated record number.
- **`cluster.py`'s selftest gained a baseline-green step**, matching
  `check-skills.py`'s shape: assert the live state, then mutate. It previously
  ran its checks with no statement that the unmutated input passes, which is what
  let a green result mean two different things.
- **The four-link chain is the reusable part.** Any future generated artifact
  holding build data should be read against it, and the question *"what is this
  copy's authority"* is the one that decides whether the artifact can be trusted
  at all. Where there is no answer, say so in the artifact rather than stamping
  it.
