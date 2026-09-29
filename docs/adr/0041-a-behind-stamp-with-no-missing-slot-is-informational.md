# A behind build stamp with no missing slot is informational, and there is no second stamp

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** There
> is no build stamp. A build is short prose that **grows by being appended to**,
> compiled from nothing, so there is nothing it can fall behind.

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).
> The stamp half has no implementation again.** The 2026-08-31 amendment below
> describes `scripts/thegraph/stamp_check.py` in the present tense; that script
> was a `/grill-the-graph` artifact and was deleted with this repo's build.
> **The decision is unchanged and is not this repo's to hold** — it lives in
> `thegraph/BUILD_CONTRACT.md`, so any repository built by `/grill-the-graph`
> still gets it. What is gone is the instance that read it here.

> **Amended 2026-08-31.** The decision is unchanged; **the stamp half now has an
> implementation.** `scripts/thegraph/stamp_check.py` resolves
> `~/.claude/skills/<skill>` to a git checkout and reports the commits touching
> that skill since the build stamp — so a behind stamp arrives with *what
> changed*, in sentences, rather than only *that* it changed. It exits 0 when
> behind, exactly as the table below requires, and is red only when the
> artifacts' stamps disagree with the build document's, which is this record's
> *"no second stamp"* enforced rather than stated.
>
> The schema half stays as written: it needs a model reading *"What the build
> must supply"* against the build, is not mechanical, and is not attempted
> there. **Only both halves agreeing is a finding**, and the script says so in
> its own output so a reader cannot mistake the informational case for one.
>
> Written because the stamp on an artifact **labels and does not warn**
> ([ADR-0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md)).
> This record described a warning nothing performed; the script is what reads it.

Five decision records cite this rule and none of them holds it. It is written
out in exactly one place — `retired/checkup/SKILL.md` § *Schema* — which
[ADR-0033](0033-checkup-retires-and-its-script-is-promoted.md) retired. This
record is the rule's home.

## The rule

Each artifact `grill-the-graph` emits carries a **build stamp**: the `thegraph`
revision it was built from. The **schema check** is the other half — read the
skill's own *"what the build must supply"* section and report slots that are
empty rather than answered `none`.

A stamp is a revision of the **whole skill file**, so it moves for any edit — a
reworded rule, an added war story, a method lifted out into a sibling skill.
None of those changes what a build must *answer*. So the two can disagree, and
**the disagreement is the useful outcome**:

| Stamp | Schema | Verdict |
|---|---|---|
| behind | a slot the intervening revisions added is **missing** | a **finding** — the build owes an answer it does not have |
| behind | every slot **filled** | **informational** — *"stamped behind by N revisions; no slot missing"*. The skill moved underneath the build without asking for anything new |
| current | a slot empty **mid-run** | neither detector fires; the run substitutes by judgement and writes `build_gaps` (see [ADR-0036](0036-a-carried-build-gap-needs-a-durable-address.md)) |

**A behind stamp is a question, and the schema check answers it.** Never
reported as stale, never a reason to rebuild. Only the agreement case is a
finding.

**Warn, never rebuild**, in either case. A rebuild writes agents and scripts,
and those pass through the maintainer the same way the build itself does.

## No second stamp

The tempting fix is a separate **schema revision**, bumped only when a slot
changes, so the stamp stops moving for cosmetic edits. Rejected:

- it **stores a fact the schema check already derives**, so it rots the first
  time someone edits a slot without bumping it;
- it fails **silently, in the direction that under-reports** — the worse
  direction for a detector;
- it is `downstream`'s own rule — *"a stored list is a derivable fact that
  rots"* — applied to a stamp.

The comparison is cheap and a derived answer cannot drift from the thing it is
derived from.

## Why this needed a record of its own

The rule was load-bearing before it had a home, and the citation trail closed
into a circle:

| Where | What it says |
|---|---|
| `retired/checkup/SKILL.md` | the rule, in full — the only statement of it anywhere |
| [ADR-0033](0033-checkup-retires-and-its-script-is-promoted.md) | retires `checkup`; attributes the stamp tier's settlement to ADR-0027 |
| `docs/thegraph-restructure.md`, Inventory 5 | *"the stamp rule **survives in ADR-0027**"* |
| [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) | is about moving a skill to `retired/`, and **contains the word `stamp` zero times** |
| the four extraction records (now [ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md)) and [ADR-0032](0032-downstream-writes-a-candidate-at-proof-time.md) | each closed with *"by ADR-0027's stamp rule…"* |

The first two extraction records and ADR-0027 landed in one commit
(`37d6236`), which is where the
attribution most likely came apart. The effect is that four extractions and one
retirement justify *"zero rebuilds, zero stale findings"* against a record that
never made the claim, while the claim itself sat inside a skill nobody installs.

**A rule cited by five decisions and owned by none is a rule that survives by
accident.** Retiring the skill that held it should have promoted it, the way
ADR-0033 promoted `check_map.py` to `scripts/map/` in the same act, and did not.

## Consequences

- **The five citations are repointed here.**
  [ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md),
  [ADR-0032](0032-downstream-writes-a-candidate-at-proof-time.md), and
  [ADR-0033](0033-checkup-retires-and-its-script-is-promoted.md) name this record
  instead of ADR-0027; `docs/thegraph-restructure.md`'s Inventory 5 row does the
  same. ADR-0027 is untouched — its decision was always about
  `retired/` and it never claimed otherwise.
- **The rule outlives its author.** `checkup` stays readable under `retired/`
  for the `.checkup.json` files that may exist against it, but nothing
  load-bearing depends on reading a retired skill any more.
- **This is a promotion, not a new decision.** Nothing about the rule changes —
  it is the same two paragraphs, moved to where the citations already pointed.
  A stamp warning behaves today exactly as it did yesterday.
