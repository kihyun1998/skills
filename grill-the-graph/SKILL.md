---
name: grill-the-graph
disable-model-invocation: true
argument-hint: "[local|own] [init]"
description: "Set a repo up for `thegraph` by recording the real sources it is built against in one short file. Run before the repo's first /thegraph, and again to bring an earlier setup up to date."
---

# grill-the-graph — set a repo up for `thegraph`

## The mode comes first

**The invocation's argument decides it**, before anything is read:

| Argument | Mode |
|---|---|
| `local`, `oss`, `contributor` | *Contributor mode* — someone else's repository |
| `own` | the default — the maintainer's own |
| none | **ask it**, as the first question and alone |

With no argument, put the mode to the maintainer with the tool that renders a
question before reading anything for the build, and give §1's `viewerPermission`
check as the recommendation — never as the answer. **Do not take the mode from
existing files or a silent check**: a mode nobody chose is the step a run skips,
and every later step branches on it.

## init or update — decided from disk

A second question, and disk answers it: is this repo already set up? Say in one
line which run this is and why. §2's check for an older generated build comes
first in every run, and a build it finds goes to `salvage` whatever the table
says.

| On disk | Run | Process steps |
|---|---|---|
| no `docs/agents/thegraph.md` | **init** | §1–§5 |
| `docs/agents/thegraph.md` | **update** | §1, §2, then *Update*, then *Repoint*, then §5's check |
| `docs/agents/thegraph.md`, and the argument `init` | **init over an existing setup** | §1–§5 as at init, as *Init over an existing setup* amends them, then *Repoint* |

The two arguments do not overlap, so either order reads: `/grill-the-graph own
init` is `/grill-the-graph init own`. `update` as an argument changes nothing,
since disk already decides it; on a repo with no build, say there is nothing to
update and run init.

`thegraph` hardcodes no source names, no commands and no paths. Something has to
record **which real sources this project is built against**. That is this skill,
and it is very nearly the whole of it.

It writes that file, one rule in `CLAUDE.md`, and — where the repo has no map —
the map's folder and a one-line hub (§3). In a repository you contribute to
rather than own, it writes the same file and a rule locally, plus an attribution
check, and commits nothing (*Contributor mode*). In your own repository it asks
whether Claude attribution stays, and installs the same check where it does not.
Run again on a repo it already set up, it also repoints lines elsewhere that
point at what it wrote (*Repoint what points at the setup*). In your own
repository holding a Dart package for pub.dev, it asks whether `pub-ready` is
this repo's release bar, and where it is, offers to replace the older copies of
that bar with a pointer (*Release*). On update, it offers to remove a line of the
project's `CLAUDE.md` that only restates the user-level instructions file (*What
this never writes*). It touches nothing else.

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

Two sections, and a third in a Dart package of the maintainer's own. Nothing
else has cleared all three conditions.

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

### Release

Only in your own repository holding a publishable Dart package — a
`pubspec.yaml` with no `publish_to: none`: read [release.md](release.md), which
holds what the line records, the question at §4 and what §5 shows and checks.
Anywhere else, skip it.

## Contributor mode

In someone else's repository, read [contributor.md](contributor.md): what setup
writes there in place of the default's pieces, and the comment rule. Attribution
is always off there, installed as [attribution.md](attribution.md) says. In your
own repository, read neither file unless §4 turns attribution off, and then only
[attribution.md](attribution.md).

## Update

The repo was set up by an earlier run, and this skill has moved since: the
settings block, the hook, the comment rule's table, the map folder. Update
brings what setup installed up to what this file says now, and asks nothing a
person already answered.

- **Own or contributor** is still the first question where no argument names
  it. What the earlier run left — `CLAUDE.local.md` holding the contributor
  rule, its two `.git/info/exclude` lines — joins §1's `viewerPermission` check
  as the recommendation, never as the answer.
- **The build is kept.** References are not asked again, and lines a later run
  appended stay. Only a section *What to write* names and the build lacks is
  asked for, at §4 as at init.
- **Attribution in your own repository is not asked again.** The pieces on disk
  are the earlier answer: none installed is *keep*, any installed is *off*, and
  off means all three — the ones missing are written now.
- **Every piece setup writes is compared with this skill's current text** — the
  comment rule against §3's allow-list and table and the destinations on disk now, the map hub,
  the exclude lines, the `CLAUDE.local.md` rule. Where attribution is off, the
  settings and the `pre-push` hook are compared by running `install --preview`
  ([attribution.md](attribution.md)): each piece it marks `changed` is shown as
  its file now beside the preview, and `unchanged` needs no line.
- **A line that only restates the user-level instructions file** is shown as a
  removal (*What this never writes*).
- **Then the links** — *Repoint what points at the setup*.

Show each change as old line and new, get approval, write, and run §5's check.
Where nothing differs, say so and write nothing.

## Init over an existing setup

`/grill-the-graph init` on a repo that has a build: the maintainer has changed
their mind, and the build is written again as if none existed. The Process runs
whole — §4 asks its questions from scratch, and the existing build is neither
input nor the recommendation.

The overwrite is the maintainer's to approve. At §5, show the existing build in
full beside the new one, and every installed piece the new run replaces, before
writing anything. A piece setup wrote is replaced, not duplicated: the comment
rule already in `CLAUDE.md`, and the settings and `pre-push` that `install`
recognises as setup's own ([attribution.md](attribution.md)). Then *Repoint what points at the setup*.

## Repoint what points at the setup

Update and init over an existing setup both end here, because a file elsewhere
in the repo may still point at what setup wrote before. Search for the paths
setup writes — `docs/agents/thegraph.md`, the map hub, `no-attribution.mjs` —
with `git grep -n`, plus the ignored files setup itself writes
(`CLAUDE.local.md`, `.claude/settings.local.json`), and read each hit. A line
that names a path no longer there, a section the build no longer has, or a
script path that does not resolve is fixed in the same approval as the rest.
Decision records describe the world when they were written and are left as they
are.

## Process

### 1. Look before you ask

Read `CLAUDE.md`, the manifests and the directory tree. Asking what an existing
file already answers is the offloading `thegraph`'s decision-routing habit
forbids.

**Then check whose repository it is** — where no argument named the mode, this
is what the first question recommends. Ask
`gh repo view --json isFork,parent,viewerPermission`; where the default
repository is a fork, ask `viewerPermission` again of its `parent`, which is the
repository that receives the PRs. Asked of the fork, a clone whose `origin` is
the maintainer's fork reads `ADMIN`. `READ` or `TRIAGE` on the receiving
repository recommends **contributor mode**; anything else recommends the
default. It stays a recommendation — whether a team accepts commits to
`docs/agents/` is something a person knows and no permission says.

### 2. An older generated build goes to `salvage`, not to Update

A tracked file carrying a build stamp means this repo was built by an earlier
version of this skill, which generated code and copied repo facts into a long
document. The stamp took several forms and languages, in scripts, agents and the
build document itself, under whatever names that version chose. Search it with
its revision, so a document that only describes a stamp is not a hit, and keep
the search case-sensitive, since `grill-map` writes a lowercase stamp of its own:
`git grep -l -E '(Build stamp|Built from thegraph|빌드 스탬프)[^<]{0,40}[0-9a-f]{7}'`. `scripts/thegraph/` or `.claude/agents/thegraph-*` counts
as well. Either finding is the old build. A stamped `docs/agents/thegraph.md`
would read as *update* in the table above; the check before the table sends it
here instead.

An old build is not an earlier setup in *Update*'s sense: **do not read
it as input, do not update it, do not rebuild over it, and do not delete it.** Some of what is in there is a person's answer and the rest is a copy of the
repo, and telling those apart is `salvage`'s job. Say what you found, point at
`salvage`, and stop.

A `docs/agents/theflow.md` is the older bindings file. Some repositories still
cite it or run checks against it, so it does not stop the run: say once that it
is there and that `salvage` clears it when run.

### 3. The map, and the comment rule

In contributor mode this step is [contributor.md](contributor.md)'s table instead: no map
folder, nothing in `CLAUDE.md`.

A comment is written on every edit, most of them made outside `thegraph`, so
the rule has to sit where every session reads it: the repo's `CLAUDE.md`. This
is the one place anything writes it there. `comment-it` reads it from there on
every code change `check-it` measures, and holds no copy.

**Look for a territory map first.** Where there is none, **make its folder** —
setup does not build a map and does not ask whether to. The rule below needs a
destination on disk, and an empty map is the honest state of a young repo: the
folder is the roster, and it holds no notes because nothing has earned one yet.
Put it at `docs/map/` unless the repo's layout already names a place for docs of
this kind; the path is part of what §5 shows for approval.

Git keeps no empty directory, so the folder holds one file, a hub stub
(`README.md`):

> The territory map. A measured value, an outside constraint and the reason
> behind a design judgement go to a note here.
> Notes are added as they come up, or all at once with `grill-map`, which also
> reads hand-written notes as leads and keeps their paths.

Write no notes and do not run [`grill-map`](../grill-map/SKILL.md) — filling the
map is its job, not setup's. Where the repo already has enough that nobody can
say what depends on what — decision records, a spread of source files — name
`grill-map` once in the closing report as a next step, not as a question.

**Then the rule.** Its destinations name only what is on disk once this step's
writes land; a destination that does not exist is invented.

The rule is the allow-list, the same in every row:

> A comment is one of: a license header; behaviour forced by an outside
> dependency, platform, vendor or protocol we cannot reshape (Rust's `SAFETY:`
> on `unsafe` is one); a tool directive; a doc comment on a public API; an issue
> or RFC link for a constraint the code cannot express. Nothing else: a surprise
> in our own code is fixed, not explained.

followed by the row's sentence on where the rest goes:

| The repo has | Where the rest goes |
|---|---|
| a map | A measured value, an outside constraint and the reason behind a design judgement go to the territory note under `<map path>`. Where none seems to hold it, search the folder and the code symbol first; only then start a new note, named for what the system does there, not for the file. A workaround's reason goes nowhere: the workaround is fixed. History goes to the commit message. Comments written before this rule may still carry what the map keeps: never delete one whose content the map does not yet hold — move it there first. |
| decision records, no map | A decision and its reason go to `<records path>`; history goes to the commit message. |
| neither | Why it is this way and how it came to be go to the commit message. |

The last two rows are for a maintainer who turned the folder down at §5.

It goes in `CLAUDE.md` — or `AGENTS.md` where that is the only guidance file and
`CLAUDE.md` does not exist. Where neither exists, creating one is part of what
gets approved. **A rule already there is checked, not duplicated**: rewrite it
only where it no longer matches the allow-list or the table's row: a destination
moved (a map built since, a directory moved), or their wording changed.

Show the lines and where they go, get approval, write them. The reasons and
measurements behind the rule stay out of it; they are on
[#75](https://github.com/kihyun1998/skills/issues/75), and a copy in every repo
would drift from them.

Nothing about the map goes in `docs/agents/thegraph.md`. The check is a
directory listing, so it is re-derived on every run and cannot go stale — which
is also why it would fail the three conditions if it were written down.

### 4. Ask

**One question, and recommend an answer — two in the maintainer's own
repository, three where it holds a publishable Dart package.** The compiled
draft *is* the recommendation — the maintainer confirms or corrects it. Ask them together with the tool that renders a question;
a list printed with *"confirm or correct"* underneath is a question nobody was
put.

**Claude attribution**, own repository only: keep it, the default, or turn it
off, which installs the pieces [attribution.md](attribution.md) holds. Recommend from what
can be seen — a per-project memory asking for no Claude trailer, or a history
whose commits carry none, recommends off; a history that carries them recommends
keep. A contributor clone is never asked: there it is always off.

**Release**, own repository with a publishable Dart package only: `pub-ready` or
`None.`, recommended and shown as [release.md](release.md) says.

For the reference table, propose the sources you can see evidence for — an
upstream named in `CLAUDE.md`, a peer repo already installed, a dependency whose
shipped artifact is in the tree — and let the maintainer add, remove and correct.
**Always offer *none yet* as its own option**, and where you found no evidence,
recommend it rather than inventing a row. Take **concrete sources or none** and
accept no *"use judgement"*: a source nobody named is a source nobody reads, but
*none* names exactly what is read — nothing.

### 5. Show it, then write it

Show the mode and what chose it — the argument, or the answer to the first
question — and which run this is, init or init over an existing setup; then the file, the `CLAUDE.md` rule, and — where §3
makes one — the map folder's path and hub stub. In contributor mode show instead
the `CLAUDE.local.md` rule and the two `.git/info/exclude` lines. In contributor
mode, and in your own repository with attribution turned off, show as well what
`install --preview` printed ([attribution.md](attribution.md)): the merged
settings file and the `pre-push` hook or why none is written. Where *Release*
is `pub-ready`, show what [release.md](release.md) says to. Get approval. Write
them, the attribution pieces by running `install`. They are short enough to read
whole, so there is nothing to summarise and no reason to write before they have
been read.

**Then check what landed, line by line, and report each line**, in every mode.
The mechanical lines are one command, run at the repository's root, `<skill>`
being this skill's folder:

```sh
node <skill>/scripts/grill-the-graph.mjs check --mode own [--map <map path>] [--attribution]
node <skill>/scripts/grill-the-graph.mjs check --mode contributor
```

`--map` names the folder §3 made, and `--attribution` is for your own repository
with attribution turned off. It prints a line per check, `ok` or `FAIL` with what
failed, and exits 1 on any `FAIL`: the build exists; the map hub exists; in
contributor mode, `CLAUDE.local.md` holds the rule as [contributor.md](contributor.md)
words it, `.git/info/exclude` lists both files, and `git status --short` prints
nothing; where attribution is off, the settings file is what `install` would
leave, and `pre-push` is setup's and executable, or the reason none was written.
Two lines are read and judged, not run:

- [ ] `CLAUDE.md` (or `AGENTS.md`) holds the comment rule, its allow-list and row
      matching §3 and its destination on disk (own repository)
- [ ] the *Release* lines read as [release.md](release.md) says (own repository,
      a publishable Dart package)

A line that fails is written now, not reported as done. Where a per-project
memory asked for no Claude trailer and the pieces are now installed, name it in
the closing report as redundant; removing it is the maintainer's call.

## The size is the check

Fifteen lines or so, and there is no rule enforcing it — the number is a smell
test. **A build that has grown has almost certainly taken in something the repo
already answers.** The previous version of this skill emitted 686 lines here, and
the difference was entirely copies: command lists, surface lists, record numbers,
node counts, an artifact manifest.

## The build grows; a rebuild is asked for

There is no stamp and no drift queue, and nothing rebuilds the build on its own.

A run that needs something this file does not hold **asks then**, and the answer
is appended here. Nothing has to be recompiled, because nothing here was
compiled. A rebuild happens when the maintainer asks for one with
`/grill-the-graph init`, and is written only on their approval — *Init over an
existing setup*.

And a run that keeps asking the same question is the signal that its answer
belongs here — the maintainer answering *"show me it actually running"* on three
consecutive changes has stated a standing preference, not three per-change calls.
**Wait for the repeat**: a question asked before anything has repeated is a
question nobody can answer, and condition 2 is what it fails.

**Once it has repeated, ask first whether a check can hold the answer** — a
structure, a type, a lint, a test. Where one can, it goes to `ask-it` as a check
candidate, for `encode-it` to build once kept; a line is written here only where
the answer is a judgement no check can hold.

## What this never writes

- **Generated scripts or agents.** Setup produces none as its own output; the
  settings and hook `install` writes only call a script this skill ships.
- **A build stamp.** Nothing here is compiled from the catalog, so nothing here
  falls behind it.
- **A copy of anything the repo states** — command lists, surface lists, record
  numbers, directory rules, tracker capabilities, node rosters.
- **A line that only restates the user-level instructions file**
  (`~/.claude/CLAUDE.md`, or `AGENTS.md` in `$CODEX_HOME`, by default `~/.codex`),
  which every session on the maintainer's machine loads already. A line that adds
  something for this repository is not a restatement: the comment rule names this
  repository's destinations, and an exception departs from the user file. In a
  repository you contribute to, its `CLAUDE.md` is the owners', so nothing is removed.
- **A line nothing reads.**

The first four were each in the previous version, and each went for one reason: it was a
second copy of a fact, with nothing keeping the two in agreement. That is the
whole class.
