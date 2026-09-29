# A prose rule and the pattern that reads it are one design, because the fix the rule demands is the edit that blinds the pattern

`scripts/check-skills.py` gained a check that every skill named in another
skill's prose resolves. Two of its rules turned out to be in direct opposition,
and neither could see the other.

## The two instances

**A remedy that disables its own detector.** The gate requires a live skill
pointing into `retired/` to acknowledge the retirement in the same paragraph. The
pattern that finds those references was written as *"inherited from `X`"* —
backtick immediately after the preposition. The remedy the rule demands is to
write *"inherited from **the retired** `X`"*, which inserts two words in exactly
that position. Applying the fix to all four failing sites took three phrasings to
zero matches. The rule and the pattern were designed an hour apart, by the same
pass, and each was correct alone.

**A population that was a property of the pattern.** The spec this work
implements measured *"seven distinct skill names are referenced in other skills'
prose"* and concluded the checker would land green — *"this buys a regression
guard, not a fix."* Re-measured, the same phrasings yield **4**, and widening
them as the spec's own rule instructs yields 16, then 17, then 18. Every widening
surfaced a real defect: an undeclared external, and four live documents pointing
at retired skills without saying so. The count was never a measurement of the
population. It was a measurement of the pattern.

## Why this is one decision and not two

Both are the same mistake at different scales: **treating a prose rule and the
regex that reads prose as separable artifacts.** They are not, because the rule's
output is the regex's input. A rule that says *"write X in the prose"* changes the
text the pattern matches against, and a pattern narrow enough to be precise is
narrow enough to be broken by the rule's own remedy.

`promote`'s trigger list names both halves independently — *two artifacts inside
the project requiring opposite things*, and *measuring an earlier item's stated
premise false before you could start*. Two triggers in one pass is the bar, and
the shared root is what makes them one record rather than two notes.

## The decisions

**1. A phrasing pattern tolerates a modifier where its own remedy inserts one.**
The lineage patterns carry a bounded `MOD = (?:\w+ ){0,3}` between the
preposition and the backticked name. It is not defensive breadth; it is the
specific span the acknowledgement rule writes into.

**2. The false-negative assertion is a per-phrasing floor, not a global count.**
A single total cannot say *which* phrasing stopped matching, and it fails on every
legitimate prose addition — which teaches the reader to raise it, which is how a
floor stops meaning anything. Per-phrasing floors fail only on a decrease, and
name the phrasing that decreased. When the acknowledgement fixes landed, three
floors went red in the same commit and said which three.

**3. The ten `thegraph` siblings are asserted by name, not by count.** The
dominant dependency phrasing in this repo is *"The method is `X`'s"*, which names
`bare`, `boundary`, `byartifact`, `envelope`, `firsthand`, `lens`, `promote`,
`redden`, `spine` and `sweep`. A count of 7 passed while missing all ten. A count
cannot distinguish *"nothing to find"* from *"looking in the wrong place"*; a
roster can.

**4. A mutation is anchored at a site the scan actually sees.** The
retired-acknowledgement mutation was first anchored at `nit/register.md`, which
carries a real acknowledgement — and it went green, because *"comes from `X`"* was
not yet a phrasing. The mutation found the coverage gap before any reference did.
An anchor must be verified to be *detected*, not merely to be edited; the
existing DEAD check catches an anchor that edits nothing and cannot catch one
that edits something invisible.

**5. Two reference classes, because they fail in opposite directions.** A
*dependency* (*"the `X` skill"*, *"the method is `X`'s"*) demands the target
exist. A *lineage* reference (*"inherited from `X`"*, *"successor to `X`"*,
*"reuses `X`"*) names an ancestor that is usually retired, and demands only that a
live document say so. Collapsing them either forces retired ancestors to stay
installed or lets a dead dependency pass.

## What this does not do

It does not make prose machine-readable. The right mechanism is a skill declaring
its own dependencies where a machine reads them — the checker inferring them from
prose is the checker compensating for a declaration that does not exist, and
every cost above is the price of that compensation. That change waits on a probe
of whether an unknown `SKILL.md` frontmatter key survives, which the platform
documentation cannot answer because this repo marks that source class
*summarized*.

It does not widen the scan to `docs/`, `CONTEXT.md` or `README.md`. Nearly every
live mention of a retired skill in this repo is in `docs/adr/`, where naming a
retired thing without a label is correct — a record describes the world when it
was written.

> **Amended 2026-08-31: the scan does now read `scripts/`, and the sentence above
> is why rather than despite.** The test it states is *record vs not*, and an
> error message fails it — a reader follows an instruction now, so a skill name
> in one that resolves to nothing is simply wrong. `scripts/map/check_map.py`
> said *"Run the `checkup` skill"* after ADR-0033 retired `checkup`, and the
> record that retired it is the one saying the only part of it that ever ran
> became that very file. Nothing could see it.
>
> The widening cost nothing in precision: across the nine scripts there are 55
> distinct backticked lowercase tokens, the phrasings match **4**, and **0** are
> false positives. That is decision 5 above working — a phrasing matches a claim
> of reference, never a word — and Python having no backtick syntax makes a
> script a cleaner surface than markdown, with no code spans to blank first.
>
> One mutation is anchored in a script, because every other reference mutation
> would still pass if the script reader returned nothing.

## Consequences

- **The gate can now go red on prose.** Four documents were changed to satisfy
  it, one of which (`unregistered-archives/SKILL.md`) carried a statement that had
  become false: it called `unexported-archives` one *"which stays"* after that
  skill was retired. The retirement never reached the sentence, which is this
  check's own subject appearing in its own evidence.
- **Widening the pattern is now the first move, not the last.** Three widenings in
  one pass each produced a real finding. The next reader should expect the same:
  a low hit count means the pattern is clean *or* narrow, and only widening tells
  you which.
- **`scripts/thegraph/gates.py` and `docs/agents/thegraph.md` are behind.** The
  build records three gate commands and a blind spot reading *"`check-skills.py
  --selftest` is never run"*; there are now five commands and the blind spot is
  closed. Neither is edited here — a build write passes through the maintainer,
  and this is recorded as a re-grill request instead.
- **The floors are calibrated against one tree.** They are a lower bound measured
  at this commit; a deliberate removal of prose is a legitimate reason to lower
  one, and lowering it silently to get green is the thing `bare` forbids.
