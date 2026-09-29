# Skill authoring — this repo's position

**Status: decision record for a standing question.** What this repo does about
[Anthropic's skill-authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices):
where it diverges and why, and which gate enforces which part.

## Contents

- [What this file is not](#what-this-file-is-not)
- [Reading the authority](#reading-the-authority)
- [Deliberate divergences](#deliberate-divergences)
- [Measured against three other catalogs, once](#measured-against-three-other-catalogs-once)
- [Known violations, not divergences](#known-violations-not-divergences)
- [What a gate enforced, and what nothing does](#what-a-gate-enforced-and-what-nothing-does)

## What this file is not

**It does not restate the guidance.** Two rules in this repo point that way —
`grill-the-graph`'s *"**borrow, do not copy**: read the owner at runtime"*, and
`thegraph`'s own seam test, which says a rule *"that governs any test, any
completeness read, or any layering decision is one this method **borrows** rather
than holds, and copying it here would be the divergence seed the method exists to
prevent"* — `thegraph`'s wording, in the file that carried the seam test until
that file was deleted with the rest of the node machinery; the rule is unchanged
and now lives in the skills that borrow. ADR-0051 is
adjacent and is **not** a third: it permits a copy that names its authority and
is asserted against it on every run. A prose restatement of an external document
is exactly the copy that cannot be asserted against anything, which is why there
is none here.

So the authority stays where it is and is read raw. What lives here is only what
is **ours**: the divergences, the violations we know about and have not fixed,
and the gate map.

There was a companion measurement record, `docs/skill-shape-measurements.md`. It
is deleted (ADR-0073): most of it anatomised a `thegraph` that no longer exists,
and the two findings worth keeping are below rather than in a second file.

## Reading the authority

Append `.md` to the doc URL and `curl` it. **Never a summarizing fetch** — a
summary drops exact wording, and the wording is what the arguments turn on. One
whole argument in the #39 cluster rested on a `<Tip>` at L738–740 that a summary
had dropped; reversing it cost a session.

The Korean and English pages are **the same document** — 1,185 lines each,
aligned line for line, no guidance in one and not the other. Verified twice
independently, once by diffing heading, fence and blank-line positions across all
1,185 lines. Either is fine; cite line numbers from the raw `.md`.

**Quote it, do not reconstruct it.** The first version of this file carried a
sentence attributed verbatim to `thegraph` that `grep` returns zero hits for — a
splice of two sentences that silently broadened the rule from three named
categories to *"work of its kind anywhere"*. In a file whose opening argument is
that exact wording is load-bearing, that is a self-refutation rather than a slip.

## Deliberate divergences

Each is a place the guidance says one thing and this repo does another **on
purpose**. Recorded so the next reader does not re-derive them, and so a
divergence that stops being deliberate is visible as one.

**Some skills exceed the 500-line guidance** (L257, L1134). **No count is
written here.** Ask:

```sh
for f in */SKILL.md; do
  n=$(sed '1{/^---$/!q};1,/^---$/d' "$f" | wc -l)
  [ "$n" -gt 500 ] && echo "$n  $f"
done
```

`thegraph/SKILL.md` is deliberate: #40 ([ADR-0057](adr/0057-the-catalog-points-somewhere.md)) cut it by
roughly two thirds, and going under the line would mean moving `## State` or
`## The reasoning habits`, both read on every traversal and neither carrying the
size trigger that licensed moving the node contracts.

**`grill-map/SKILL.md` is deliberate now, and was not before.** It is the longest
in the catalog and had never been examined against this rule at all. It has been:
every section was read against the two tests this repo uses — *does anything read
what this produces*, and *is being wrong caught elsewhere* — and none failed.

What makes it long is that its rules carry their evidence inline. `Measured`
appears twelve times, each with a number: 48 issues cited across 27 notes of
which 46 were closed; 72% of a spec file being unimplemented behaviour and cited
by 2 notes of 27; a sweep pattern that returned one reassuring hit while two
worse ones sat outside it. A measurement cannot be compressed the way an argument
can, and its two sections about checks — *the one gate worth writing* and *the
check no gate can do* — reached
[ADR-0066](adr/0066-there-are-no-gates.md)'s conclusion before it was written:
*"the documents are written to be read by people … that gap **is** the
false-positive rate"*, and *"the pattern that survives is one owner and
pointers"*.

Excluding its 119 lines of note templates it runs 11.9 prose lines per rule,
against 7.6 for `thegraph/SKILL.md`. The gap is the evidence, not padding.

**The guidance offers no way to test the 500-line rule.** It states the number
twice and gives its rationale as *optimal performance*, and that is all. Model
testing (L134–144) sits ~120 lines earlier under Core principles and the source
never connects the two; an earlier version of this file asserted the linkage and
was wrong to. So this divergence is held on judgement, and #44's model runs are
the nearest thing to evidence anyone will get — not a check the guidance asked
for. A pilot has since run one query on two of the three tiers (Opus is not
reachable from a subagent) and found the pointer this split relies on followed by
one tier and missed by the other, at n=1 — see [ADR-0057](adr/0057-the-catalog-points-somewhere.md) for the run and what it does and does not settle.

**Naming** (#45). The guidance prefers gerunds, accepts noun phrases and
action-oriented names (L170–185). `thegraph` is neither — the definite article
plus a generic noun. And the collection mixes bare nouns, adjectives and verb
forms, which puts it **on** the Avoid list at L192 (*"Inconsistent patterns
within your skill collection"*), not beside it.

Not renamed, and the reason is cost rather than disagreement: every name is a
slash command, and the most-referenced of them is written across dozens of
documents including generated artifacts that carry a build stamp
(`grep -rc '`thegraph`' --include='*.md' . | grep -v ':0'`). Revisit only if a
name starts being mis-invoked.

**Terminology is split by design, not by drift** (#45). `human` is not a third
name for the maintainer: it is the **decider label** invariant ④ fixes (`code` /
`AI` / `human`) and the **provenance value** the issue contract uses. A word
count cannot tell either from the actor — a pass over this corpus counted every
occurrence of `human` in one file while correctly protecting the load-bearing
ones, and a reader taking the count alone would have swept the vocabulary of the
invariant that requires it.

**A cross-skill shared contract has no pattern in the guidance** (#40).
`thegraph/BUILD_CONTRACT.md` was read by `grill-the-graph`, a *different* skill,
and all three progressive-disclosure patterns (L289, L317, L353) describe
material the same skill loads later. **The arrangement is gone** — that file is
deleted and each skill states what it owns — so the finding stands as a record of
what the guidance did not cover rather than as a live divergence. The narrow claim
is what held: no pattern contemplates a second skill reading the file.
`thegraph`'s own conditional link to it **was** Pattern 3; the cross-skill reader
is an additional consumer, not an
uncovered case. The split is justified on token cost — 139 lines loaded by every
run and read by none — and **must not be cited as evidence of conformance**.

**An invocation placeholder is not an XML tag** (L158–163, L1128). `/nit
<subcommand>` and `/brief <issue>` are the syntax a reader needs in order to call
the skill, and they stay. The maintainer's call, and the exception is granted to
the **form** rather than to those two skills: a bare lowercase identifier in
angle brackets, no closing tag, no attributes. A new skill documenting `/foo
<bar>` inherits it; a genuine `<b>bold</b>` does not. `scripts/desc-audit.py`
classifies by that shape, so neither the exception nor its holders are stored
anywhere as a list.

Unverified, and left that way: nothing has established whether the platform's
validator would treat a placeholder as a tag. Nothing has rejected them.

**Evaluations do not run themselves.** L774: *"There is not currently a built-in
way to run these evaluations. Users can create their own evaluation system."*
Whatever #44 produces is executed by hand or by something this repo writes; a
file count satisfies the checklist and nothing else.

**The `description` field has an opposing position in the wild, and this repo
does not take it.** The skill collection at `github.com/obra/superpowers` holds
that a description should carry triggering conditions *only*, under ~500
characters, on the ground that one summarising the workflow becomes a shortcut
an agent takes instead of reading the body — reported there as a testing result,
with a worked case of a two-stage review collapsing to one stage.

The guidance says the opposite on the first half: L203 and L1143 ask a
description for what the skill does **and** when to use it, and L158–163 sets
the cap at 1,024 rather than 500. Where the two conflict, this repo follows the
guidance — the cap is gated, and the what-**and**-when shape is why six
descriptions gained a trigger clause rather than losing their first half.

The opposing claim is not refuted here and nothing in this repo has tested it.
One local fact weakens it and does not settle it: eleven of the twenty-two
skills carry `disable-model-invocation: true`, so for those the description is
never what selects the skill — it arrives with the body, not instead of it. The
execution-time half of the claim survives that and remains untested.

Recorded so that the next reader who finds that collection does not re-derive
the question, and so that a divergence which stops being deliberate is visible.

## Measured against three other catalogs, once

Four corpora, per 10 KB of `SKILL.md` so file size does not drive the comparison:
`anthropics/skills` (n=20), `obra/superpowers` (14), `mattpocock/skills` (37), and
this repo (24 at the time). Two things came out of it that still bind.

**Where this repo is an outlier, and it is not length.** The word *because* runs
about **6×** the other three, concentrated in a handful of files; descriptions run
**2.5–7.6×**, with this repo's *minimum* exceeding two corpora's median; past-tense
narrative markers about **6×**. Against `mattpocock/skills` in particular the
description median was **179 against 794**. Where a new skill's description is
being written, that is the number to write toward.

**Four things were disproved and are not to be acted on again.**

- ~~*"Anthropic shows instead of arguing; add contrastive examples."*~~ Their 258
  code blocks are **66% concentrated in six syntax-teaching skills**, and their
  judgement skills carry **zero**. The spread across corpora is 2.0–6.5, which is
  no norm at all. A quota of one contrastive pair per judgement skill was applied
  to four skills and reverted.
- ~~*"We over-prohibit."*~~ This repo's rate of *never* is the **lowest** of the
  four.
- ~~*"Description length is the defect."*~~ Half-right, and the half that is
  wrong matters: the fix is **triggers only**, and shorter is the consequence
  rather than the target. A 1,071-character description that is all routing logic
  is correct in content and still over the stated 1,024 maximum — so length is a
  rule violation and content is the diagnosis, and neither substitutes for the
  other.
- ~~*"Split the node contracts one file per node."*~~ Rejected on read count and
  on the section names another skill read by name. Moot since ADR-0071 deleted
  the contracts, but the reasoning holds for any future per-item split: count the
  reads a run would gain.

## Known violations, not divergences

Nothing here has been decided. Listed because an unlisted violation is
indistinguishable from conformance.

| Violation | Source | Extent |
|---|---|---|
| a skill named in prose that is neither in this catalog, under `retired/`, nor declared | CLAUDE.md's own rule | `retired/grill-code` names `grill-me`, which exists and is described correctly but is declared nowhere. Retiring the skill did not discharge it — the prose scan covers retired documents. The `/grill-me` alias collision this row used to carry is gone: `to-deck` advertised it while the installed `grill-me` was a different skill, and `to-deck` is retired (ADR-0059) |

## What a gate enforced, and what nothing does

**Nothing does.** [ADR-0066](adr/0066-there-are-no-gates.md) deleted
`check-skills.py` and the hook that ran it, so every row that once named a gate
now names none. The table is gone rather than rewritten with `nothing` in each
cell, because a column with one value is not a column.

What the seven checks covered, so that a reader knows what stopped being
asserted: the description's length cap and its person; a `## Contents` block
against the headings it indexes; a skill name in prose resolving to the catalog,
`retired/`, or a declared external; the completeness of an external declaration;
a `requires:` roster against the directories; one spelling of a word per
document; and the hook's own command list.

Each was a check that two copies of one fact still agreed. The replacement is in
ADR-0066 and is not a smaller check: do not write the fact twice.
