# ADR-0092 — `assay`, `silt` and `decant` retire; `sweep` and `firsthand` stay

**Status:** accepted. The second cut of #44's catalog audit, after
[ADR-0090](0090-four-delegates-retire-into-their-callers.md). The retirement
follows [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md).

> **Amended by [ADR-0095](0095-check-it-reviews-in-a-fresh-agent.md).** Review is
> one fresh agent answering both axes and harm, not two readers.

| Retired | Into | What moved |
|---|---|---|
| `assay` | `check-it`'s review (4) | two readers at once, each given the whole diff and one axis: does it hold up against what the repo wrote down, and does it do what the issue asked (missing, crept in, done wrongly). Grades: violation, judgement, already decided. The axes are reported apart, each with its own worst finding |
| `silt` | `check-it`'s cost check (5) | no defect without a number; a shape nobody measured is a question |
| `decant` | the comment rule `grill-the-graph` writes into `CLAUDE.md` | nothing. The rule already said what a comment is. Its sentence *"move it first (`decant`)"* now reads *"move it there first"* |

Boundary sentences that pointed at `decant` (`grill-map`, `plat`, `sweep`,
`winnow`) now point at the comment rule in `CLAUDE.md`.

## The call, and whose it was

The maintainer's, on 2026-10-27. After the audit's verdicts were put to them,
they chose `assay`, `silt` and `decant` for this cut. They kept `sweep` and
`firsthand` over the option of retiring all five.

**`decant` was retired against a recommendation to keep it.** Evidence on both
sides was put to them:

- zero invocations from 2026-09-28 to 2026-10-27;
- **but** one real bulk migration before that window (`just-apps-kit` `524ad01`,
  2026-09-23, 12 files);
- user-invoked, so it costs no context;
- named in 22 consumer repos' copied comment rule.

They judged that the rule belongs in `CLAUDE.md`, and that a one-off migration
of old comments can be asked for in a sentence. The judgement is theirs to
reverse.

## What it was decided on

The transcript audit on #44: `check-it` runs wrote two-axis review briefs
themselves and found the same kinds of defects as the few runs that loaded
`assay`. Runs also measured cost with numbers without `silt`. Both verdicts were
*absorbed*, medium confidence.

## What did not move

The completeness read before commit (`lens` in a fresh agent, ADR-0091) listed
what stayed behind. Nothing live relies on any of it, and it stays readable in
`retired/`:

- From `assay`: the Fowler smell table it handed its first reader as a baseline
  *"even where a repo has written nothing"*; *open the module, not just the
  hunk*; and *no spec, skip that axis and say so*. Without the table, the first
  axis in a repo with no written standards has nothing to read against.
  The maintainer chose one line in its place: where the repo wrote nothing,
  the baseline is the well-known code smells (Fowler's catalogue). The table
  itself stays out, since the model knows it.
- From `silt`: its seven shapes; *a suspicion arrives with the way to settle
  it*; and *measured as free, say so*.

The same read found two more things, and both were fixed. A stale successor
link to `decant` sat in `retired/README.md`'s `sift` row. And `grill-the-graph`
§3 rewrote an installed rule only when its *destination* moved, so in an `init`
over an existing setup the old *"(`decant`)"* sentence would have stayed. §3
now also rewrites a rule whose row wording changed.

## Why `sweep` and `firsthand` stay

- **`sweep`** was absorbed only shallowly. The one gap the audit found, missing
  surfaces, is exactly what its *list the surfaces before searching* rule is for.
  `grill-map`, `plat` and `winnow` point at it as a boundary.
- **`firsthand`'s** research half is absorbed (#47). Its hidden-state half
  showed up in 12 of 73 runs, and whether that is too few is unmeasured.
  `read-it`, `make-it`, `pub-ready` and `thegraph`'s signal name it.

## Consequences

- The 22 consumer repos' `CLAUDE.md` still say *"(`decant`)"* until their next
  `grill-the-graph` run, which in update mode compares the installed rule with
  §3's table and rewrites it.
- `check-it` now names only `lens` and `sweep`. The review, cost and harm
  checks are its own text.
- The review and cost rules are unmeasured as text. #37's suite stops at the
  confirm stop.
