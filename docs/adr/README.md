# Decision records

One decision per file, numbered in the order it was made. A record is **never
silently edited to match a later decision** — when a later record supersedes,
scopes, or amends an earlier one, the earlier one gains a banner at the top
pointing forward, and keeps its reasoning intact.

Some numbers are **vacated**: their record was folded into a merged one because
several records had become layers on a single current rule, and reading only one
of them gave the wrong answer. A vacated number is never reused, and the table
at the bottom says where it went — a commit message or another repo may still
cite it.

## By area

### The toolkit itself

| # | Decision |
|---|---|
| [0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) | Retirement moves a skill to `retired/`, and five skills move there now |
| [0033](0033-checkup-retires-and-its-script-is-promoted.md) | `checkup` retires, and the one part of it that ever ran becomes a script |
| [0048](0048-the-gates-fire-from-a-hook.md) | The gates fire from a pre-commit hook, because the rule to run them was written three times and did not fire twice |
| [0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md) | A prose rule and the pattern that reads it are one design, because the fix the rule demands is the edit that blinds the pattern |
| [0050](0050-a-skill-declares-what-it-invokes-and-prose-still-has-to-resolve.md) | A skill declares what it invokes, and prose still has to resolve, because naming a skill and needing one are different acts |
| [0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) | A copy names its authority and is checked against it, because a build stamp labels and does not warn |
| [0052](0052-the-build-side-of-the-split-is-a-generalisation-not-an-enumeration.md) | The build side of the split is a generalisation, not an enumeration, because five builds walked one unchanged list and returned three different answers |
| [0053](0053-a-delegated-nodes-license-is-its-tool-grant-not-its-brief.md) | A delegated node's license is its tool grant, not its brief, because eight generated agents declared read-only and eight were handed a shell |
| [0054](0054-a-catalog-gap-has-its-own-slot-and-its-own-destination.md) | A catalog gap has its own slot and its own destination, because every destination a run can reach belongs to the repository it is running in |
| [0055](0055-a-new-rule-is-swept-for-before-it-is-called-finished.md) | A new rule is swept for before it is called finished, because three records claimed completion on the day they shipped and none of the three had it |
| [0056](0056-one-file-is-not-one-home.md) | One file is not one home, because the catalog stated its own graph three times in one document and the three disagreed in eleven places |
| [0057](0057-the-catalog-points-somewhere.md) | The catalog points somewhere — 1,503 lines to 654 across three files, because a skill that is its own reference material has no progressive disclosure to use inappropriately, it has none at all |
| [0058](0058-grill-code-is-retired.md) | `grill-code` is retired — the maintainer's call on use, made while its description was being fixed for a different finding |
| [0059](0059-to-deck-is-retired.md) | `to-deck` is retired — the maintainer's call on use, which also settles the `/grill-me` alias two skills were claiming |
| [0060](0060-a-delegable-node-declares-what-is-delegated.md) | A delegable node declares what is delegated, because the catalog said a node writes documents and said the same node is read-only, and only a pronoun held the two apart |
| [0065](0065-this-repos-thegraph-build-is-retired.md) | This repo's `thegraph` build is retired, and the three gates whose corpus was the skill go with it — the maintainer's call on use, with the four things that stopped being checked named rather than discovered later |
| [0066](0066-there-are-no-gates.md) | There are no gates — `check-skills.py` and its hook are deleted, because all seven checks asserted that two copies of a fact still agreed, and the selftest proving they could fail was larger than the checks |
| [0069](0069-tickets-is-retired.md) | `tickets` is retired, and the schema it filled keeps its reader — the maintainer's call on use, with the falsification 0045 wrote in advance recorded as having fired, and the provenance taxonomy measured one value wider than any node that reads it |
| [0070](0070-promote-is-retired.md) | `promote` is retired — the maintainer's call on use, with the worry that records would pile up faster than they earned their place. Two things narrowed what a reversal must answer: the `triggers` slot that made its bar a count was already deleted, and in the session that retired it the skill was installed, invocable, trigger 1 squarely met, and fired not once. The two-occurrence bar survives in `sift` |
| [0071](0071-thegraph-is-four-skills-in-order.md) | `thegraph` is four skills in order and there are no nodes — 88 KB across five files becomes 8 KB in one. A node was a skill call, a header and a sentence; 24% of the node file was the form itself, and all eleven sibling skills describe themselves as triggers rather than steps. Three merges each made a sentence sayable that could not be written while the parts were apart, and the guess that eleven of eighteen nodes were thin measured as seven |
| [0073](0073-the-measurement-record-is-deleted.md) | The skill-shape measurement record is deleted — confusing rather than wrong, since most of it anatomised a `thegraph` that no longer exists and six evaluations that are all gone. Two survivors move to `skill-authoring.md`: the corpus comparison and four disproved hypotheses, three of which had already been acted on and reverted once |
| [0074](0074-the-evaluations-directory-is-deleted.md) | The evaluations directory is deleted and its measured failures are kept in the record — it had emptied on its own, both sets having gone with the things they were about, and what was left was a method with no subject pointing at a deleted results file. Eleven findings about running an evaluation survive, each one bought by a run that failed in a way nobody predicted |
| [0075](0075-sift-is-retired.md) | `sift` is retired, and `decant` is the one comment pass — the maintainer's call, made while `decant` was being cut for length. The guard layers, strandings and the two-occurrence bar do not carry over |
| [0076](0076-a-comment-says-what-the-code-is.md) | A comment says what the code is, and the evidence for that lives here — `decant`'s measurements move out of the skill, which kept a policy against exactly that shape |
| [0077](0077-an-always-loaded-document-keeps-its-rules-and-history-leaves.md) | An always-loaded document keeps its rules, and the history leaves — `winnow` is the procedure, cut from a `CLAUDE.md` that went 933 → 234 lines and whose detail docs went 721 → 417 once dates and stories were dropped. History is asked last so a decision-bearing number survives |
| [0078](0078-work-skills-move-to-their-own-repo.md) | Work skills move to their own repo — `nit`, `unregistered-archives`, the three paste-file retirees and their records leave for `kihyun-work-skills`, history preserved, numbers kept |

### `gate` — the Acceptance Gate

| # | Decision |
|---|---|
| [0001](0001-acceptance-gate-delegates-to-review.md) | Acceptance Gate delegates its review engine to the `code-review` skill — amended: renamed upstream from `review`, and the recorded consequence named the wrong cause |

### `grill-code` (retired)

| # | Decision |
|---|---|
| [0002](0002-grill-code-is-standalone.md) | `grill-code` is standalone — it does not delegate to `code-review`/`audit` |
| [0003](0003-grill-code-learning-mode-uses-its-own-value-axis.md) | The learning mode scores on its own Value axis, not the defect priority matrix |
| [0005](0005-grill-code-defect-modes-report-strengths.md) | The defect modes report a capped list of Strengths, not findings only |

### `thegraph` and its siblings

**Lineage**

| # | Decision |
|---|---|
| [0019](0019-theflow-is-frozen-thegraph-inherits-by-copy.md) | `theflow` is frozen; `thegraph` inherits its rules by copy |
| [0034](0034-bindings-are-spent-at-the-first-build.md) | Bindings are spent at the first build, and `grill-the-graph` says which run it is on |

**The method/bound seam**

| # | Decision |
|---|---|
| [0042](0042-a-nodes-method-leaves-its-bound-stays.md) | A node's method leaves and its bound stays — twelve extractions under one seam |

**The node catalog** — every record here predates
[0071](0071-thegraph-is-four-skills-in-order.md), which deleted the nodes. Each
carries a banner saying what survived and where it went; several rules did, in the
skill that now does the work.

| # | Decision |
|---|---|
| [0030](0030-the-staying-nodes-absorb-their-reflexes.md) | The staying nodes absorb their reflexes, and an inventory that cannot say "yet" is not an inventory |
| [0032](0032-downstream-writes-a-candidate-at-proof-time.md) | `downstream` writes a candidate at `proof` time, because it never discovered anything |
| [0037](0037-placement-is-a-node-because-the-alternative-was-four-files.md) | Placement is a node, because spreading it over four files was the alternative |
| [0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md) | The traversal is a run-level statement, and `sweep` gets the slot it never had |
| [0045](0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md) | The issue contract is thegraph's schema, its producer lives outside, and the downgrade keys on who decided |
| [0047](0047-a-state-slot-declares-how-it-combines.md) | A state slot declares how it combines, and only the main thread writes one — amended twice: the column has a third value, `keyed`, and the body holds an address where it first held the entry |
| [0040](0040-the-peer-comparison-is-a-method-and-leaves-as-plat.md) | The peer comparison is a method, so it leaves as `plat` |
| [0062](0062-the-issue-contract-names-the-cases-and-the-comparison-keys-on-answered.md) | The issue contract names the cases, and the comparison that reads them keys on answered rather than on `human`, because a check that can only add a finding has no silent direction to fail in |
| [0064](0064-a-human-stop-asks-one-reply-at-a-time.md) | A human stop asks one reply at a time, because two skills in this repo gave opposite instructions for the same act and nine call sites resolved it one at a time |
| [0067](0067-the-theflow-migration-path-is-gone.md) | The `theflow` migration path is gone, because a branch whose condition will not become true again is not a path — recoverable from `retired/theflow/` on request |
| [0068](0068-the-two-thegraph-working-specs-are-deleted.md) | The two `thegraph` working specs are deleted, reversing one line of 0065: a `Status: draft` document competes with the decision record that replaced it and loses, because only one of the two is maintained |

**Builds and artifacts**

Rules about what a `/grill-the-graph` build emitted. Both are **superseded by
[0071](0071-thegraph-is-four-skills-in-order.md)**, which deleted the queue one
gave an address to and the stamp the other graded: a build is now short prose that
grows by being appended to, compiled from nothing.

| # | Decision |
|---|---|
| [0036](0036-a-carried-build-gap-needs-a-durable-address.md) | A carried `build_gaps` entry needs a durable address, and the flush is two-way |
| [0041](0041-a-behind-stamp-with-no-missing-slot-is-informational.md) | A behind build stamp with no missing slot is informational, and there is no second stamp — amended: the stamp half has no implementation again |

**Testing**

| # | Decision |
|---|---|
| [0035](0035-a-mutation-is-confirmed-to-have-landed.md) | A mutation is confirmed to have landed before its count is read |

## Vacated numbers

| # | Where it went | Why |
|---|---|---|
| 0026 | [0042](0042-a-nodes-method-leaves-its-bound-stays.md) | four records of one rule — 0026 opened the seam, 0028 wrote it down, 0029 amended it, 0031 applied it seven more times. Reading any one of them gave a partial rule |
| 0028 | [0042](0042-a-nodes-method-leaves-its-bound-stays.md) | as above |
| 0029 | [0042](0042-a-nodes-method-leaves-its-bound-stays.md) | as above |
| 0031 | [0042](0042-a-nodes-method-leaves-its-bound-stays.md) | as above — and it says of itself *"the seam held for all seven without amendment"*, which is a log line, not a decision |
| 0038 | [0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md) | a `plan` node that shipped and was reverted four days later — one decision with a wrong first attempt, not two. 0039 already restated the gap and the node's three defects; the rejected human-approval argument moved with it |
| 0061 | [0065](0065-this-repos-thegraph-build-is-retired.md) | two layers on one rule — a copy of build data is rooted and asserted, the build document included. 0061 rooted every artifact in the document; 0063 asked what the document itself was rooted in and answered that 0061's own two measurements were instances of its gap. Both subjects (`build_doc_check.py`, `slot_authority.py`, the slot audit) were deleted with the build, so reading either returned a wrong answer about this repository. **The rule they share is not vacated** — it is stated in `grill-the-graph` and 0065 restates what it covered |
| 0063 | [0065](0065-this-repos-thegraph-build-is-retired.md) | as above |
| 0046 | [0047](0047-a-state-slot-declares-how-it-combines.md) | a third property on invariant ② that shipped and was reverted the same day — the fourth call of one audit whose other three stand, so one decision with a wrong fourth attempt, not two. 0047 restates the gap it aimed at and the four defects that reverted it |

## Moved to `kihyun-work-skills`

These numbers belong to records that left with the NIT skills
([0078](0078-work-skills-move-to-their-own-repo.md)). They keep their numbers there
and are never reused here: 0004, 0006, 0007, 0008, 0009, 0010, 0011, 0012, 0013,
0014, 0015, 0017, 0021, 0023, 0043, 0044 — and the vacated 0016, 0018, 0020,
0022, 0024, 0025 that were folded into 0043 and 0044.
