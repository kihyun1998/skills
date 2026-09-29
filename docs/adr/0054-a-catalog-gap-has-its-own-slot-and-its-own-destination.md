# A catalog gap has its own slot and its own destination

## The gap

A run has one outbound slot for *"the method could not answer this"*:
`build_gaps`. Its disposition is **re-grill this repository**, and the catalog
names two drifts — build behind catalog, caught by the stamp; build behind repo,
caught by that slot.

There is a third. **The catalog is behind reality**: a fact true of every
repository compiling this graph, which no rebuild of any single build supplies. A
run that finds one has nowhere to put it, so it goes to `build_gaps` — arriving
at a disposition structurally unable to act on it, because `grill-the-graph`
recompiles *that repository's* build.

**Every destination a run can reach belongs to the repository it is running in.**
That is the whole of it.

## Two measured instances, both routed by a human asking a question

| | Found in | How it reached this tracker |
|---|---|---|
| [#19](https://github.com/kihyun1998/kihyun-skills/issues/19) | `flutter_table_plus` | the maintainer asked *"isn't this not an issue for this repo?"* |
| [#24](https://github.com/kihyun1998/kihyun-skills/issues/24) | `justerm` | the maintainer asked *"so what is the actual fix?"* |

#19 was filed on the consumer's own tracker with a label and a full acceptance
list. It sat there looking correctly filed. **A misrouted item is
indistinguishable from a filed one** — it renders exactly like every neighbour,
and the only thing wrong with it is invisible.

#24 is worse: it never reached a tracker at all. It became a `pending — needs a
thegraph change` marker in justerm's build doc, which is read by *the next build
of that same repo* — structurally the party that cannot act on it. A marker looks
like a disposition and is not one.

## The decision

**A fourth slot, `catalog_gaps`** — written by any node, `append`, read by
`batch`, and **not read by the next `/grill-the-graph`**. That last clause is the
distinction from `build_gaps`, which the next build reads as its drift detector; a
catalog entry there is noise for the one reader the slot exists for.

`batch`'s disposition is not a re-grill and never becomes one: the entry is filed
against **the catalog's own tracker**, derived from where the installed skill
resolves rather than stored, and it carries **the repository the run was in and
the build stamp it ran against** — without those it is unactionable at the other
end, where nobody can see the run.

### Telling the two apart, in the order that makes it decidable

The obvious test is the split rule — *"may a repository answer this
differently?"* — and it does not work from inside a run: that is a claim about
every build, and a run has exactly one. The order that does work:

1. **Is the wrong thing in a file this repository owns?** A stale surface list, a
   missing gate command, an unnamed sacred path — the build's.
2. **Would a re-grill of this repository stop it happening?** Not *stop the
   symptom* — a rebuild regenerates artifacts and the symptom usually clears. Ask
   whether the **cause** clears.

**Question 2 is the load-bearing one**, and #19 is why. Re-grilling
`flutter_table_plus` regenerates its agents — with `Bash` again, because
`grill-the-graph` said nothing about tool grants. The symptom clears on every
rebuild and the cause never does.

## The objections, recorded rather than resolved

The direction was the maintainer's, taken with the adversarial pass already run
against the options. Two findings stand against this slot and are kept here rather
than argued away:

- **`candidates` already carries the same signature** — `any node | append |
  batch`. What is unique to `build_gaps` is its fixed disposition and its second
  reader, so the axis genuinely under dispute was **disposition**, not container.
- **This repo's slot-admission bar is stricter than "no new slots".**
  `docs/thegraph-state-model.md` records it as *"it went in on its own evidence,
  closing two bars that were already stated and already recollection"* — and a
  hand-written `catalog_gaps` entry closes no recollection bar; whoever notices
  still has to notice.

What it does close is a **destination** nothing else reaches. That was the
maintainer's call and it is theirs to reverse.

**The prior cited against a new slot during the run was mis-cited**, and the
correction is worth keeping: [0040](0040-the-peer-comparison-is-a-method-and-leaves-as-plat.md)'s
*"the table stays at ten"* is the **extracted-methods** table, not the state
table, and the seam test's *"an extraction that needs a state slot has found the
wrong seam"* governs **extractions**, which this is not. Neither forbids a slot.

## What the adversarial pass changed, and what it left open

The pass ran on the **options**, before any proposal — `classify`'s open-decision
route, which exists so that the costs a lens finds are part of the decision rather
than follow-ups after approval. It broke the enumeration in three places:

- the issue's premise (*"exactly one outbound slot"*) is false;
- options 1 and 3 **nest** rather than partition, since option 1 without new
  disposition prose is inert;
- *"the catalog is behind reality"* is at least four classes with four routes, and
  one of them — **a catalog rule that is simply wrong** — is **already routed**, as
  an ordinary `verify` finding through `findings`. This slot is for the class that
  has no route: the schema has no slot for what the node needed.

**Closed in the same change, once the diagnosis was corrected.** The pass
reported it as *"the envelope has no destination axis"* and the obvious reading —
add an eighth column — is wrong: with this slot in place the destination is
**derivable from which slot the candidate sits in**, and a column restating it
would be the stored-derivable defect this repo keeps meeting. The real defect is
smaller and entirely inside the existing column: `search` ran `gh issue list`
with no `--repo`, so `Tracker: nothing` was a **true sentence about the wrong
repository** — and *nothing* reads identically whichever tracker produced it, so
`envelope`'s *never blank* bar passed it through.

So `Tracker` now names the tracker it searched, `cluster.py` takes `--repo`, and
which tracker to query is decided by the slot rather than by where the run is
standing. No new column, and `envelope`'s fixed list is untouched.

The three *"seven columns"* counts in this catalog went with it — a count whose
authority is a table in another file, which is the fourth instance of that shape
found in one day and the reason the promotion candidate below exists.

## Relation to the trail

[0032](0032-downstream-writes-a-candidate-at-proof-time.md) is the mirror and the
closest template: the catalog's existing answer to an obligation crossing the repo
boundary, carrying its evidence rather than being a notification. The arrows are
opposite — that one is catalog→consumer, this is consumer→catalog — and a node
type on 0032's exact shape was the strongest alternative to this slot.

[0045](0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md)
settled the neighbouring routing question: an empty *issue* slot does **not** reach
`build_gaps`, because a missing issue value already has a route to a human and a
missing build value does not. Applied to a catalog gap the same test returns the
opposite answer, and had never been applied — a catalog gap has no other route at
all.
