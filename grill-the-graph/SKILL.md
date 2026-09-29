---
name: grill-the-graph
disable-model-invocation: true
description: "Set a repo up for `thegraph`: record which real sources the project is built against — or that there are none yet — as one short prose file at `docs/agents/thegraph.md`. Writes that file and one rule in the repo's `CLAUDE.md` — a comment says what the code is, and where the why goes — with no generated scripts, no generated agents, no copy of anything the repo already answers. Where there is no territory map, makes its folder with a one-line hub so the rule has a destination, and leaves the notes to later edits or `grill-map`. Hands an older generated build to `salvage` instead of updating it. Use before a repo's first `thegraph` run."
---

# grill-the-graph — set a repo up for `thegraph`

`thegraph` hardcodes no source names, no commands and no paths. Something has to
record **which real sources this project is built against**. That is this skill,
and it is very nearly the whole of it.

It writes that file, one rule in `CLAUDE.md`, and — where the repo has no map —
the map's folder and a one-line hub (§3). It touches nothing else.

## What the build is

One prose file — `docs/agents/thegraph.md` — holding **what a person already
knows and no file in this repo answers.**

It generates no code, copies no fact the repo already states, and **does not go
stale when the repo moves.** It goes stale only when someone changes their mind.

## What earns a place in it

Three conditions, and a line needs all three.

1. **No file in this repo answers it.** If one does, a run reads that file. A
   copy fails by being silently wrong, and a node handed a wrong value uses it
   and reports nothing.
2. **A person already knows it.** Not *"only a person could decide it"* — those
   are different sets, and the gap between them is where a build fills up with
   questions nobody can actually answer. **If you can draft the answer from the
   repo, it is a copy.** Leave it out.
3. **Something reads it.** Name what reads it. A line nothing reads is a
   document, not a build.

Condition 2 is the one that was missing, and it is why an earlier version of this
skill asked for sacred paths, a tie-breaker, the project's seams and a proof
method per layer. Each passes condition 1. None survives condition 2: the answers
that came back were drafted by the builder and ratified by a person who could not
have produced them.

## What to write

Two sections. Nothing else has cleared all three conditions.

### What this project is

One line.

**Read `CLAUDE.md` first.** A repo that opens with *"a personal collection of
Claude Code skills"* has already answered this, and asking again is offloading.
Ask only where that file is absent or says nothing about the project itself.

### References

**The one question that has to be asked.** Nothing in a repo states which
outside sources it is built against: the code does not say that its graph design
is read against LangGraph's source tree, and no ticket says it either.

| Source | Informs | Reached by | Binding |
|---|---|---|---|
| LangGraph | how it works | its source tree — raw | example |
| Claude Code skill docs | how it works | the published docs — **summarized** | binding |
| mattpocock/skills | where files go | its real tree — raw | example |

**Informs** routes it: *how it works* is read while building and reviewing,
*where files go* while deciding a file's home.

**Binding is the column that gets skipped, and it decides what a disagreement
means.** Diverging from an example is a choice worth recording; diverging from a
spec is a bug. A spec recorded as an example gets written up as a deliberate
difference and shipped.

**Reached by carries the summarized flag inline**, because the two are one fact —
a documentation site is summarized, a source tree is not. A summarized source can
never settle a question outright; what rests on it carries forward as *needs
confirming against the real thing*. Treated silently as raw, it is how a dropped
method body becomes an absent handler.

**None is an answer.** A young project is often built against nothing outside
itself yet, and a maintainer who says so has answered concretely. Write `None
yet.` under the heading and no table: it records that the question was put,
which an absent file cannot, and a run that later reads against an outside
source appends it (see *The build grows*). Never fill the table to avoid an empty
one — a row proposed without evidence and ratified by someone who had no answer
is exactly condition 2's failure.

## Process

### 1. Look before you ask

Read `CLAUDE.md`, the manifests and the directory tree. Asking what an existing
file already answers is the offloading `thegraph`'s decision-routing habit
forbids.

### 2. An older generated build goes to `salvage`, not to an update

`scripts/thegraph/` or `.claude/agents/thegraph-*` means this repo was built by
an earlier version of this skill, which generated code and copied repo facts into
a long document. **Do not read it as input, do not update it, and do not delete
it.** Some of what is in there is a person's answer and the rest is a copy of the
repo, and telling those apart is `salvage`'s job. Say what you found, point at
`salvage`, and stop.

### 3. The map, and the comment rule

A comment is written on every edit, most of them made outside `thegraph`, so a
pass that checks comments after the fact is undone by the next edit. The rule
has to sit where every session reads it: the repo's `CLAUDE.md`. This is the one
place anything writes it there.

**Look for a territory map first.** Where there is none, **make its folder** —
setup does not build a map and does not ask whether to. The rule below needs a
destination on disk, and an empty map is the honest state of a young repo: the
folder is the roster, and it holds no notes because nothing has earned one yet.
Put it at `docs/map/` unless the repo's layout already names a place for docs of
this kind; the path is part of what §5 shows for approval.

Git keeps no empty directory, so the folder holds one file, a hub stub
(`README.md`):

> The territory map. A comment's why, trap and measured value go to a note here.
> Notes are added as they come up, or all at once with `grill-map`, which also
> brings hand-written notes into its format.

Write no notes and do not run [`grill-map`](../grill-map/SKILL.md) — filling the
map is its job, not setup's. Where the repo already has enough that nobody can
say what depends on what — decision records, a spread of source files — name
`grill-map` once in the closing report as a next step, not as a question.

**Then the rule.** Its destinations name only what is on disk once this step's
writes land; a destination that does not exist is invented.

| The repo has | The rule |
|---|---|
| a map | A comment says what the code is. Why it is this way, what it deliberately leaves out, the trap and the measured value go to the territory note under `<map path>`. Where none seems to hold it, search the folder and the code symbol first; only then start a new note, named for what the system does there, not for the file. History goes to the commit message. Comments written before this rule still carry the rest: never delete one whose content the map does not yet hold — move it first (`decant`). |
| decision records, no map | A comment says what the code is. A decision and its reason go to `<records path>`; history goes to the commit message. |
| neither | A comment says what the code is. Why it is this way and how it came to be go to the commit message. |

The last two rows are for a maintainer who turned the folder down at §5.

It goes in `CLAUDE.md` — or `AGENTS.md` where that is the only guidance file and
`CLAUDE.md` does not exist. Where neither exists, creating one is part of what
gets approved. **A rule already there is checked, not duplicated**: rewrite it
only where its destination no longer matches the table — a map built since, a
directory moved.

Show the lines and where they go, get approval, write them. The reasons and
measurements behind the rule stay out of it; they are
[ADR-0076](../docs/adr/0076-a-comment-says-what-the-code-is.md)'s, and a copy
in every repo would drift from it.

Nothing about the map goes in `docs/agents/thegraph.md`. The check is a
directory listing, so it is re-derived on every run and cannot go stale — which
is also why it would fail the three conditions if it were written down.

### 4. Ask

**One question, and recommend an answer.** The compiled draft *is* the
recommendation — the maintainer confirms or corrects it. Ask it with the tool
that renders a question; a list printed with *"confirm or correct"* underneath is
a question nobody was put.

For the reference table, propose the sources you can see evidence for — an
upstream named in `CLAUDE.md`, a peer repo already installed, a dependency whose
shipped artifact is in the tree — and let the maintainer add, remove and correct.
**Always offer *none yet* as its own option**, and where you found no evidence,
recommend it rather than inventing a row. Take **concrete sources or none** and
accept no *"use judgement"*: a source nobody named is a source nobody reads, but
*none* names exactly what is read — nothing.

### 5. Show it, then write it

Show the file, the `CLAUDE.md` rule, and — where §3 makes one — the map folder's
path and hub stub. Get approval. Write them. They are short enough to read whole,
so there is nothing to summarise and no reason to write before they have been
read.

## The size is the check

Fifteen lines or so, and there is no rule enforcing it — the number is a smell
test. **A build that has grown has almost certainly taken in something the repo
already answers.** The previous version of this skill emitted 686 lines here, and
the difference was entirely copies: command lists, surface lists, record numbers,
node counts, an artifact manifest.

## The build grows; it is never rebuilt

There is no rebuild, no stamp and no drift queue.

A run that needs something this file does not hold **asks then**, and the answer
is appended here. Nothing has to be recompiled, because nothing here was
compiled.

And a run that keeps asking the same question is the signal that its answer
belongs here — the maintainer answering *"show me it actually running"* on three
consecutive changes has stated a standing preference, not three per-change calls.
**Wait for the repeat**: a question asked before anything has repeated is a
question nobody can answer, and condition 2 is what it fails.

## What this never writes

- **Generated scripts or agents.** A `code` check is a command a run is told to
  run, not a program committed to the repo.
- **A build stamp.** Nothing here is compiled from the catalog, so nothing here
  falls behind it.
- **A copy of anything the repo states** — command lists, surface lists, record
  numbers, directory rules, tracker capabilities, node rosters.
- **A line nothing reads.**

Each of these was in the previous version, and each went for one reason: it was a
second copy of a fact, with nothing keeping the two in agreement. That is the
whole class.
