# ADR-0076 — A comment says what the code is, and the evidence for that lives here

**Status:** accepted.

`decant` applies one policy to source comments: **a comment says what this code
is**, and the why, the deliberate absence, the trap, the measured value and the
history belong to the repo's map, to version control, or to nothing. The skill
held that policy *and* every measurement behind it — 377 lines, second-longest in
the catalog, with no decision record anywhere naming it. That is the shape the
policy tells a comment not to take, so the measurements move here and the skill
keeps the rule plus a pointer.

Nothing below is an instruction. The instructions are in
[`decant/SKILL.md`](../../decant/SKILL.md), once.

## Why one bin

`sift` classified a paragraph into seven bins and left three in place, on the
ground that some knowledge is only enforced by sitting where it sits. That
argument was never refuted. The maintainer took its cost knowingly: a comment
carrying a rule is a **second copy** of that rule, and the copy is the half
nothing checks — the same reason [ADR-0066](0066-there-are-no-gates.md) gives for
deleting the gates. `sift` is retired by [ADR-0075](0075-sift-is-retired.md).

Measured across five repositories that keep maps — 163 territory notes against
45,041 comment blocks:

- **310 blocks share verbatim phrasing with a note that already says it**, and
  the note is routinely the better copy. `overflow_cache.dart` and its territory
  note state the same rule in nearly the same words; only the note carries the
  issue number.
- **58 of 163 notes (36%) already hold in `## Design model` the history** a
  comment would otherwise duplicate — *"it keyed on `(text, width)` until #156,
  and that is a hand-written subset"*. No rule told them to. The section absorbs
  it because a constraining history **is** a design rule.
- **273 lines carry history that constrains nothing** — *"Pure extraction of the
  sort-cycle state machine (previously inline in the header State)"*. Version
  control holds every one of them.
- One repository's `lib/` ran **3,152 comment lines against 10,051 code lines**.
  Deleting all 273 history lines moves that by under one point. **The
  restatement is the volume, not the history**, so a pass that only hunts
  tombstones reports success and changes nothing a reader notices.

## Why the drop question is last

`sift` asked its keep-questions first, because there keeping was cheap and
dropping expensive. Under one bin almost everything moves, so moving is not the
risk and dropping is: a paragraph sent to `DESIGN` in error costs one lookup in a
note, a paragraph dropped in error costs a measurement nobody reconstructs. A
single ordering cannot serve both policies, which is why the two were never one
pass.

## Why the pointer line is required

An invariant was once satisfied at six sites: four called the helper, and **two
satisfied it by arguing in a comment that the helper was unnecessary there**.
Move that argument to a note with nothing left behind and the site reads as a
missing call — the next reader "fixes" it into a redundant one, and no grep for
the helper's name finds them to warn. `grill-map` records this as the hardest
class of fact to rediscover, and it is the class a comment pass is most likely to
destroy.

## Why `DESIGN` stays one bin, as a known cost

On the first real run seven `DESIGN` verdicts covered four shapes — a trap, the
reason an inert field is carried, a measured negative result, and a proof of
unreachability — and the bin said which note they were owed to but not how to
write any of them. Splitting it is the obvious repair and is **not** taken: four
sub-bins is `sift`'s seven under another name.

On the same run **five of the seven named something the territory note did not
carry**, among them a proof that a width check was unreachable. Moving those "because
they belong in the note" would have moved them into a note with no line for them —
which is why the skill reports *notes owed* as its own list.

## Why "two grounds" is its own finding

A note said a custom tap widget exists because the framework's own handling *"did
not compose with the counting and with the row-level hover treatment"*; the
widget's header said it exists *"without delaying single taps when double-tap is
enabled"*. Related, both plausible, not the same claim. It is not a restatement,
so no matcher flags it; not a contradiction, so nothing fails; and each half reads
as complete from inside its own file. Only reading the two side by side finds it.

## Why the unit is the paragraph, and sometimes the clause

A real header, four paragraphs: `KEEP` (what the memo is) · `DESIGN` (why the
measurement is the key) · `DROP` (extracted from three loose fields) · `DESIGN`
(the `(text, width)` tombstone). A block verdict takes all four to whichever
reads loudest.

On the same run one sentence carried two verdicts — *"only bidirectional strings
can break differently under it, so no failure is known — but it is an input the
glyphs get, and this type exists so the two cannot list a different set"*: a
measured negative result and a fifth copy of a rule, joined by a dash.

## Why the repository scope is read by territory, in a derived order

The five repositories ran 544 to 18,365 comment blocks each; one territory runs
29 to 459, which is a sitting. A territory note's `## Code` section already names
its files, so the map supplies the scoping.

**The order is derived because the first run's was not.** The territory chosen
was the one already known to hold a restatement, and every number it produced —
a recall figure, a count of copies — was measured on a sample selected for
containing them. None generalised, and the bias was invisible in the report.
`grill-map` names the same trap one level up: ordering by where the commits are
misses the areas that never change and break silently when touched.

Comment blocks per line of `## Design model` measures how much the comments carry
against how much the note does. A high ratio is either a note missing its content
or comments holding it instead — the two findings the pass exists to tell apart.

> **Amended 2026-09-23, after the first territory run on a Rust/TS repository.**
> Two premises above were false there. **`## Code` does not reliably name a
> territory's files:** the first note read named, as the site its module is
> reached through, a file that never mentions it, and omitted the two files that
> do — so the scoped scan read the wrong file and missed the right ones.
> `narrow.py` now reports that drift (`+` a file using the module but unnamed, `-`
> a named file with no use either way) and adds the `+` files to a scoped run.
> **The ratio counted test comments:** that territory's file was 57% tests, so it
> ranked first (11.1) on blocks that were mostly test labels and yielded about 27%
> removal; counting production blocks only, it ranks 3.7 and second. Test blocks
> are still read; they no longer rank. The same run found 0 history lines by
> matcher and 8 by reading; three phrasings it missed were added (5 of 8 now).
> Separately, a `DESIGN` paragraph whose fact a decision record already holds was
> binned *owed* because the questions checked only the note; `decant` now greps the
> records first.
>
> **Amended again 2026-09-23, after nine territories.** Three more measured flaws in
> the drift and ranking. A harness page (`demo/main.ts`) carries one probe comment per
> feature it proves, so its territory stayed first after its own comments were done —
> `demo/` now counts beside the rank, like tests. `+` reported consumers (files that
> import a territory's types) as omissions; it is now split into `+!`, a file **no
> note names**, and `+`, one another note already names — on this repository `+!`
> named exactly one file, a controller the map had never listed, while every `+`
> was a consumer — and a TS `import type` no longer counts as a use. And `-`
> compared a named file only against the note's *own* files, so two shared files the
> note names that import each other read as wrong entries; it now compares against
> every file the note names.

## Why a shared god-file is a refactoring target

On a 58-note repository one 10,473-line file — **18% of its whole language
tree** — is named by **ten** notes, and one of those ten names nothing else.
Three territories in that map own no file of their own. `grill-map` M3: a file
holding a large share of a layer is several modules that were never named, and
when the map has named a concern the code has not, the note is right and the file
is the problem. It surfaced only because the order had to be computed, so it is
reported with the other findings rather than swallowed as a scope caveat.

## What narrowing can and cannot see

`scripts/decant/narrow.py` (deleted 2026-09-29, see below; its last version is at
`ae75090`) removed mechanical work before the repository scope. **It finds about half of what is there.** Of
two territories it reported clean, one held at least two real restatements: the
map said *"ping-pong between the two controllers"*, the source said *"jump the
master back, and so on forever"* — the same fact, zero shared phrasing. People do
not copy their own sentences; they rewrite them.

A within-file repeat check was built and removed. Against the case that motivated
it — a doc-comment and an inline comment four lines apart giving the same
rationale — it returned **0**, because the two were a rewrite, while adding 828
findings on a 1,819-file repository. Raising the bar until those fell to 50 still
returned 0. That finding is reached by reading the file whole.

**Three runs building the script exited 0 having inspected nothing** — a path
form the runtime did not resolve, a heading convention one repository writes
differently, and a field index that counted a drive letter. Each was
indistinguishable from a clean result. `grill-map` and `sweep` both carried the
rule in prose, and a 3-of-3 violation rate put it in the output instead: the
script prints its scope before its findings, and the skill's report does the same.

## Why applying has its own rules, and why the script is gone (2026-09-29)

The skill ended at a report — *"every write is the maintainer's"*. On justerm's
epic #975 the maintainer handed the writes over, and 21 decant PRs (#996–#1021)
were applied by an agent, each followed by an adversarial read. Those reads
confirmed **111 defects**, all fixed before merge; none shipped. By the stage each
arose in:

| Stage | Found | What it was |
|---|---|---|
| the source comment was already false | 19 | a stale count, a removed function still cited, a wrong reference line — moved as it stood |
| the moved text was rewritten false | 33 | widened, two claims merged, compressed until false, a cause reversed, a miscount |
| a fact or a reason was dropped | 19 | ten short reasons in one PR alone |
| something else still quoted the comment | 17 | a note or a doc-comment pointing at prose that had moved |
| placed where it contradicts its neighbours | 15 | a count, a *none pinned*, a section it did not belong in |
| a reference fact restated or unpinned | 6 | |
| copied to the note, not cut | 1 | |
| mechanical | 1 | doubled CRs from a scripted edit |

**Every row but the first is in the moving, which the skill did not govern.** The
first is in the reading: `DESIGN` was checked against its note and never against
the code, so a false fact travelled into the map intact. Both now have rules —
the code check before binning, and `## Applying it`.

**The script is deleted, the maintainer's call (2026-09-29)** — they judged that
the skill should state the rule and the agent should follow it, rather than a
script standing in for the reading. What they were shown, and what it did not
cover:

- `narrow.py` had not been run once across the 21 PRs; the reading carried every
  finding.
- It read line comments only. On a TypeScript file it counted 57 of 333 comment
  lines — every JSDoc block was invisible — and still printed a scope that looked
  complete: the fourth run of this record's *"exited 0 having inspected nothing"*.
- A replacement that computed the moving's defects over a diff (`ledger.py`) was
  built and discarded unmerged. Measured before it was dropped: on #1017's decant
  reconstructed without its pointer fixes, it found 5 of the 8 pointers left
  dangling. The three it missed name the *symbol* rather than the file (*"the same
  rule `wheelScrollTarget` carries"*, *"`wheelScrollTarget` states the reason"*) —
  and one of those, in `scrollbar.test.ts`, had passed the adversarial read as well
  and was still in justerm's master when this was written. On its first real run
  10 of its 11 quotation hits were held copies, not quotations. **Not covered:** whether prose alone lowers the quotation misses,
  which prose had already failed to prevent 17 times. The `## Applying it` rule
  names the grep and forbids truncating its output, because one of those misses
  was a truncated line.

The territory order, the scope count and code drift stay as rules; the agent
counts them. The candidate matchers (history phrases, verbatim restatement,
repeated sentences) go without a replacement: by this record's own measurement
they found about half, and the reading had to cover the other half regardless.

## Consequences

- `decant/SKILL.md` carries the rule and the report shape, and names this record
  for the reason behind any of it.
- A measurement added later lands here, not in the skill.
- If the one-bin policy is reversed, this record is what a reversal answers, and
  [ADR-0075](0075-sift-is-retired.md) records the method it would return to.
