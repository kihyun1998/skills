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

Written only in your own repository, and only where it holds a publishable Dart
package — a `pubspec.yaml` with no `publish_to: none`. One line under the
heading: `pub-ready`, or `None.`

**Whether a package publishes is on disk; whether `pub-ready` is its release bar
is not.** A package can be publishable and released some other way, or not yet
released at all, so the line records the maintainer's choice and clears
condition 2. [`pub-ready`](../pub-ready/SKILL.md) reads it (condition 3): it runs
where the line names it and stops where the line says `None.` `None.` records
that the question was put, as it does under References, so an update does not
ask it again.

Where the answer is `pub-ready`, the copies of the release bar written before it
are sorted in the same approval. Read each place a release rule lives —
`CLAUDE.md`, `docs/agents/release.md`, a map note on releasing, another section
of `docs/agents/thegraph.md` — and sort every line:

| The line | Goes |
|---|---|
| says what `pub-ready` says — the dry-run bar, who publishes, frozen CHANGELOG entries, `pub get` before `dart format` | replaced by one pointer: *Before a release, run `pub-ready`.* |
| says more, or something only this package has — an SDK floor's reason, a `.pubignore` trap, a consumer to round-trip, a manual check | stays where it is |
| contradicts `pub-ready` | stays, since the repo's guidance wins, and is named in the closing report |

Where the answer is `None.`, no copy is touched.

## Contributor mode

A repository whose PRs land in someone else's repository. Its own guidance and
merged PRs decide how code and comments are written there, and nothing setup
writes may land in it.
[ADR-0079](../docs/adr/0079-in-a-repository-you-contribute-to-its-conventions-win.md)
holds the reasons, including why the rule below overrides
[ADR-0076](../docs/adr/0076-a-comment-says-what-the-code-is.md) entirely.

| | Default | Contributor mode |
|---|---|---|
| Build file | `docs/agents/thegraph.md` | same path, listed in `.git/info/exclude` |
| Comment rule | `CLAUDE.md`, from §3's table | `CLAUDE.local.md`, listed in `.git/info/exclude`, the text below |
| Map | §3 makes its folder | none, and the closing report does not name `grill-map` |
| Attribution | kept, unless the maintainer turns it off at §4 | always off: `.claude/settings.local.json` and `.git/hooks/pre-push`, below |

The build file keeps its path, so `read-it` and `check-it` find it unchanged. One
clone is assumed: untracked files, `CLAUDE.local.md` included, do not follow
`git worktree add`.

**The comment rule names no file**, because upstream's guidance can arrive
mid-run — a style guide merged between approval and rebase is one a copied list
misses:

> Comments follow this repository, not a rule written here. Before writing one,
> find and read its contributor and style guidance, at the root and under
> `docs/`, and the closest merged PR touching the same file, and do what they
> do — where the why goes included. Read them again on every run; they change.

**Attribution.** Installed in every contributor clone, and in a repository of
the maintainer's own where §4's answer turns it off — the same pieces, local
either way, so nothing is imposed on anyone else working there. Three pieces,
because no one of them sees everything that leaves. The two hooks run `scripts/no-attribution.mjs`, and
`scripts/attribution-check.mjs` beside it is the one copy of what is looked for;
nothing written into the clone holds a copy.

The **setting** stops the trailer and the PR footer where they are generated.
The **PreToolUse hook** checks what Claude sends — commands, including those a
shell is handed with `-c`, and GitHub MCP writes. The **`pre-push` git hook**
checks every push, from a script, an IDE or a person at the terminal.

Merge this into `.claude/settings.local.json`, keeping any keys already there.
Claude Code keeps that file out of every repository through the global git
excludes, so it needs no exclude line of its own. `<run>` starts `node` with no
shell, and `<script>` is the absolute path of
`~/.claude/skills/grill-the-graph/scripts/no-attribution.mjs`, with the home
directory written out and forward slashes, because a hook started with no shell
expands no `$HOME`:

```json
"command": "node", "args": ["<script>"], "onFailure": "block"
```

```json
{
  "attribution": { "commit": "", "pr": "" },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          { "type": "command", "if": "Bash(git *)", <run> },
          { "type": "command", "if": "Bash(gh *)", <run> },
          { "type": "command", "if": "Bash(bash *)", <run> },
          { "type": "command", "if": "PowerShell(git *)", <run> },
          { "type": "command", "if": "PowerShell(gh *)", <run> },
          { "type": "command", "if": "PowerShell(pwsh *)", <run> },
          { "type": "command", "if": "PowerShell(powershell *)", <run> }
        ]
      },
      { "matcher": "mcp__.*github.*", "hooks": [{ "type": "command", <run> }] }
    ]
  }
}
```

`onFailure: "block"` is what makes it fail closed: a hook that cannot start,
exits with anything but 0 or 2, prints output Claude Code cannot read, or times
out blocks the call, where it would otherwise let the command run. It needs
Claude Code v2.1.295 or later: read `claude --version` before writing the block,
and on an older one say so and stop, since there a hook that cannot start lets
every command through.

Write `.git/hooks/pre-push`, executable:

```sh
#!/bin/sh
exec node "$HOME/.claude/skills/grill-the-graph/scripts/no-attribution.mjs" --pre-push "$@"
```

Git runs it through its own `sh` on every platform. A missing `node` fails the
`exec`, and a failed hook stops the push. **Where `core.hooksPath` is set or a
`pre-push` of the project's own exists, write nothing there and say so in §5** —
the project runs its own hooks, and replacing one is not setup's to do. A
`pre-push` whose only line runs `no-attribution.mjs` is setup's, from an earlier
run, and is rewritten.

What none of the three can see: a push made with Claude Code not running and no
git hook (`core.hooksPath` set), and an `ask` in a headless `-p` run, which
Claude Code turns into a deny.

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
- **Every piece setup writes is compared with this file's current text** — the
  comment rule against §3's table and the destinations on disk now, the map hub,
  the settings block hook by hook, the `pre-push` hook, the exclude lines, the
  `CLAUDE.local.md` rule. Which `pre-push` is setup's own is *Contributor
  mode*'s rule.
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
rule already in `CLAUDE.md`, the settings block, and the `pre-push` *Contributor
mode* calls setup's own. Then *Repoint what points at the setup*.

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

In contributor mode this step is *Contributor mode*'s table instead: no map
folder, nothing in `CLAUDE.md`.

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
> reads hand-written notes as leads and keeps their paths.

Write no notes and do not run [`grill-map`](../grill-map/SKILL.md) — filling the
map is its job, not setup's. Where the repo already has enough that nobody can
say what depends on what — decision records, a spread of source files — name
`grill-map` once in the closing report as a next step, not as a question.

**Then the rule.** Its destinations name only what is on disk once this step's
writes land; a destination that does not exist is invented.

| The repo has | The rule |
|---|---|
| a map | A comment says what the code is. Why it is this way, what it deliberately leaves out, the trap and the measured value go to the territory note under `<map path>`. Where none seems to hold it, search the folder and the code symbol first; only then start a new note, named for what the system does there, not for the file. History goes to the commit message. Comments written before this rule still carry the rest: never delete one whose content the map does not yet hold — move it there first. |
| decision records, no map | A comment says what the code is. A decision and its reason go to `<records path>`; history goes to the commit message. |
| neither | A comment says what the code is. Why it is this way and how it came to be go to the commit message. |

The last two rows are for a maintainer who turned the folder down at §5.

It goes in `CLAUDE.md` — or `AGENTS.md` where that is the only guidance file and
`CLAUDE.md` does not exist. Where neither exists, creating one is part of what
gets approved. **A rule already there is checked, not duplicated**: rewrite it
only where it no longer matches the table's row: a destination moved (a map
built since, a directory moved), or the row's own wording changed.

Show the lines and where they go, get approval, write them. The reasons and
measurements behind the rule stay out of it; they are
[ADR-0076](../docs/adr/0076-a-comment-says-what-the-code-is.md)'s, and a copy
in every repo would drift from it.

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
off, which installs *Contributor mode*'s Attribution pieces. Recommend from what
can be seen — a per-project memory asking for no Claude trailer, or a history
whose commits carry none, recommends off; a history that carries them recommends
keep. A contributor clone is never asked: there it is always off.

**Release**, own repository with a publishable Dart package only: `pub-ready` or
`None.` Recommend `pub-ready` when the package is open source — `gh repo view
--json visibility` reads `PUBLIC` and a `LICENSE` is at the root — and `None.`
otherwise. Where `gh` cannot answer because the repo has no GitHub remote, the
recommendation is still `None.`, and it says *no GitHub remote, so whether it is
public is unknown* rather than *not public*. Show what `pub-ready` would replace beside the option, from the sort
under *Release*, so the answer is given knowing what it changes.

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
the `CLAUDE.local.md` rule, the two `.git/info/exclude` lines, the settings
block with `<script>` written out, and the `pre-push` hook or why none was
written. In your own repository with attribution turned off, show those last two
as well. Where *Release* is `pub-ready`, show each copy of the release bar it
replaces, old line beside its pointer. Get approval. Write them. They are short
enough to read whole, so there is nothing to summarise and no reason to write
before they have been read.

**Then check what landed, line by line, and report each line**, in every mode:

- [ ] `docs/agents/thegraph.md` exists
- [ ] `CLAUDE.md` (or `AGENTS.md`) holds the comment rule, its row matching §3's
      table and its destination on disk (own repository)
- [ ] the map folder and its `README.md` hub exist, where §3 made them (own
      repository)
- [ ] `CLAUDE.local.md` holds the contributor rule (contributor mode)
- [ ] `.git/info/exclude` lists both (contributor mode)
- [ ] `.claude/settings.local.json` has `attribution` and both matcher groups,
      every hook with `"onFailure": "block"` (contributor mode, or attribution
      off)
- [ ] `.git/hooks/pre-push` exists and is executable — or the reason none was
      written (contributor mode, or attribution off)
- [ ] `git status --short` prints nothing (contributor mode)
- [ ] the build has a *Release* line, and each copy of the release bar reads as
      approved — the pointer, or the line kept (own repository, a publishable
      Dart package)

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

## What this never writes

- **Generated scripts or agents.** A `code` check is a command a run is told to
  run, not a program committed to the repo.
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
