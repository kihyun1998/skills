# `tickets` is retired, and the schema it filled keeps its reader

## The call, and whose it was

The maintainer's, made on use, and made twice. First the worry — *"오버엔지니어링을
하진 않겠지? 그게 걱정되는거야. 그리고 human, derived, unkown 이런것도 공감이
안가"* — and then, once the mechanism had been read back against the code,
*"이 스킬을 없애자 은퇴시키자"*.

It moves to [`retired/`](../../retired/) by the mechanism
[ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) established:
the folder move *is* the uninstall, because the install scripts scan top-level
directories and prune any link whose `<name>/SKILL.md` has gone.

**This is a product judgement**, like [0058](0058-grill-code-is-retired.md) and
[0059](0059-to-deck-is-retired.md), and it falls only to the person who made it.
It differs from those two in one way worth recording: a measurement points the
same direction, and [ADR-0045](0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md)
asked for that measurement in advance. That is recorded below because a record
that says only *"it stopped being used"* would throw away the one thing this
attempt bought.

## What it did, recorded because nothing else records it

158 lines, `disable-model-invocation: true`, run as `/tickets <spec-issue>` at
one point in a pipeline and nowhere else:

```
grill → spec → slice into tickets → /tickets <spec-issue> → /clear → /thegraph <ticket>
```

Three acts. **Transcribe** the calls a maintainer had already made into each
freshly-cut ticket, in the shape `thegraph`'s *"What the issue must supply"*
names. **Enroll** the prose parent reference as the tracker's own sub-issue
relation, which is why `spine`'s roster is a relation query and not a body parse.
**Mark** every entry `human`, `derived` or `unknown`.

What it bought was not speed. It was that a re-decision **becomes visible**: a run
that inherited a settled call and a run about to make one otherwise leave the same
transcript, and a cost nobody can see is a cost nobody weighs. That argument is
not retired with the skill — see *What is no longer produced*.

## The falsification 0045 wrote in advance, and which fired

ADR-0045's *"What would make this wrong"* named three conditions. The second:

> **`derived` turns out to be the only value ever written.** Then the producer is
> running outside the window where it could observe a decision, and the placement
> is what is wrong, not the value.

**It fired on the only run anyone measured.** [#52](https://github.com/kihyun1998/kihyun-skills/issues/52)
records `/thegraph .scratch/the-marks-share-one-alphabet 01` in
a private work repository. That ticket carried a `## Issue contract` with all five
slots filled — **every one of them `provenance: derived`**. `derived` licenses
nothing, so the contract produced no behaviour change on the one occasion it was
observed working. The same run then lost a requirement the ticket's own prose
named, and needed three `fix:` commits.

0045 read that condition as an argument about **placement** — run it earlier, in
the unbroken window, and `human` marks appear. That reading is not refuted here
and may still be right. What the maintainer declined is paying the producer's
cost while waiting to find out.

## The second measurement: the taxonomy is one value wider than its readers

`thegraph/SKILL.md`'s Common Rationalizations table already carries the objection
*"`derived` and `unknown` both license nothing — merge them"*, and rejects it on
the ground that `derived` is an accurate starting point worth keeping.

The rejection was never checked against the consumers. There are **two** places
in `thegraph/NODES.md` where provenance is read, and both branch on `human`
alone:

| | What it reads |
|---|---|
| `NODES.md:329` | the deliberate-divergence list takes **the `human` entries** in `inherited` |
| `NODES.md:588` | `agreed_direction` is written by `decide` and **a `human` entry**; a `derived` or `unknown` direction is named, in one clause, as *"the unratified value it is"* |

**No node distinguishes `derived` from `unknown`.** For the mechanism the
taxonomy is one bit — *was the decision observed?* — and the third value is a
note for a human reader defended as though it were a machine value. This is
[ADR-0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md)'s shape
in a new place: a rationalization that names its ground and is never asserted
against it.

**This measurement is left standing, not acted on.** It argues for narrowing the
schema, which is `thegraph`'s to narrow, and narrowing a schema whose producer
just retired is a change with no consumer to answer to. It is recorded so the
next person to open that table finds the check already run.

## What this does not touch

- **`thegraph`'s contract schema.** It stays, whole. `thegraph` never names
  `tickets` anywhere — the producer was deliberately placed outside (0045), so
  the reader survives it. And `thegraph/SKILL.md` already states that *"a ticket
  answering none of it is the ordinary case, not a gap — the graph ran that way
  before the contract existed and still does."* Nothing degrades on the read
  side.
- **The upstream slicers.** `/to-tickets` keeps a ticket thin because it cannot
  know who will execute it, and thin is correct for it. That was never this
  skill's job and is unaffected.
- **`spine`'s relation query.** The sub-issue relation is the tracker's, written
  by whoever files; `docs/agents/issue-tracker.md` holds the calls. `tickets`
  enrolled it as one of three acts, it was not the only thing that can.
- **[ADR-0045](0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md)
  and [ADR-0062](0062-the-issue-contract-names-the-cases-and-the-comparison-keys-on-answered.md).**
  Both decided things about the **schema**, which is live. Each gains a banner
  pointing here for the producer half only.

## What is no longer produced

Stated once, here, the way [0065](0065-this-repos-thegraph-build-is-retired.md)
enumerated its holes rather than reporting a clean removal.

- **No skill in this catalog writes an issue contract.** The section can still be
  written by hand or by an upstream producer, and `thegraph` reads whatever it
  finds. What is gone is anything that writes it *in the shape the schema names*
  without a person holding the shape in their head.
- **`human` can no longer be produced at all.** It required a producer that
  watched the decision happen, and there is none. So `agreed_direction` is
  written only by `decide`, and the deliberate-divergence list holds only build
  values — `verify` re-opens every settled call, which is the loud failure
  direction and the one 0045 chose to keep when it could not have both.
- **The borrow-don't-copy demonstration goes with it.** `tickets` is the case
  that proved the rule paid: the schema went from five slots to six
  ([0062](0062-the-issue-contract-names-the-cases-and-the-comparison-keys-on-answered.md))
  and the producer needed **zero edits**, because it read the slot list at
  runtime instead of holding a copy. `grill-the-graph` still follows the rule and
  is now the only live instance of it.

## Relation to the trail

- [0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) supplies the
  mechanism and is unamended. One thing it checked does not hold here: it noted
  that every cross-reference among the moving skills was *"between skills that
  moved together, so those relative paths still resolve."* `tickets` moves
  **alone** and reads `../thegraph/SKILL.md`, so the link was repaired to
  `../../thegraph/SKILL.md` in the same act. A retired skill is frozen against
  fixes and new precision; a path repaired by the move itself is neither.
- [0065](0065-this-repos-thegraph-build-is-retired.md) listed `tickets` under
  *"What this does not touch"* when this repo's `thegraph` build was retired.
  That was true then and is superseded here — this is the separate, later call
  0065 declined to make, not an extension of it.
- [0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) is why the
  rationalization measurement above is written down instead of dropped.

## What would make this wrong

- **A contract gets written by hand and pays.** If someone fills the section
  manually before a `/thegraph` run and the run demonstrably confirms instead of
  re-deciding, the mechanism works and only the producer was wrong. Reversing
  costs one `git mv` back.
- **`verify` starts re-opening the same call across several runs.** That is the
  cost this retirement accepts, made visible. It is loud by design, so it will be
  seen rather than inferred.
