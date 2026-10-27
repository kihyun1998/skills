---
name: grill-map
disable-model-invocation: true
description: "Write and keep a repo's MAP by reading it the way a person learns a codebase. Use when a repo has no map yet, or its map has fallen behind its commits. /grill-map, /grill-map init."
---

# grill-map — read the repo, then map it

A **MAP** is a repo's linked note graph (see `GLOSSARY.md`). It answers the two
questions that gate a change: *if I touch this, what else moves?* and *what
decision is this shape derived from?* It lives in `docs/map/` unless the repo's
layout names another place, and its hub is linked from each of the repo's
identity docs (`CLAUDE.md`, `AGENTS.md`).

This skill builds one the way a new maintainer learns a codebase: read what the
repo says about itself, walk its tree, read the code that runs, and **ask when
the reading does not explain something**. Counting and grepping are probes for a
doubt the reading raised, never the opening move. A map is trusted for what its
notes can show, so every claim in it carries where it came from.

## Mode — decided from disk

Look at the map folder and say in one line which mode runs and why. Find the
**hub** first: the map file each identity doc links to; with no link, the map
folder's `README.md`. A short file whose only job is to point at another is a
**pointer**, not the hub. Both stamps live in the hub, and the table reads it.

| On disk | Mode |
|---|---|
| no map folder, or only a hub or a pointer with no notes beside it | **init** |
| notes, and a hub with a `grill-map synced at` line | **update** |
| notes, and no `grill-map synced at` line — a map written by hand, by another skill, or by this skill's first version (a `grill-map build stamp` with no synced-at line) | **init over an existing map** |

The working tree decides, not the git index: map files the index lists and the
tree lacks are a deleted map, named in the one-line statement, and the mode is
read from what is on disk.

**No map checker runs** — `check_map.py` (retired), a vendored copy, or one the
repo wrote — since it verifies addresses and the reading verifies claims
(ADR-0083). Where the repo has one in use, put its removal to the maintainer
right after the mode line, before step 1, and on a yes remove it:
[NOTES.md](NOTES.md#a-map-checker-in-the-repo).

`/grill-map init` forces init on a map with a synced-at line; that run follows
[init over an existing map](#init-over-an-existing-map), since notes are there.

## init

Five steps in order. Each ends on its criterion; the next one starts only then.

### 1. Orient

Read in the order a person would, and take notes as you go:

1. the README and any identity doc (`CLAUDE.md`, `AGENTS.md`);
2. the glossary and the decision records, enough to hold the repo's vocabulary
   and what has been settled;
3. the folder tree, as a **reading guide**: it tells you where to look, and it
   is never the list of territories;
4. the entry points — `main`, the exported surface, the CLI, the build and
   release configuration — and from them the code they reach;
5. **the open backlog, and anything that records what is not built yet** (a
   roadmap, a TODO register, a "not implemented" section). The code cannot
   contain this, and a map without it maps only what already happened;
6. **the other side of the boundary**, where the repo names the project that
   calls or consumes it, or the maintainer points you there: read the seam —
   the call site, how it is built and shipped from there — at one commit, read
   with `git -C <repo> show <sha>:<path>` so a moving checkout cannot shift it,
   and cite that sha and its date. A helper whose contract lives in its caller is
   half-mapped from inside.

Where a doubt appears — *is this the only caller? does this file really hold half
the logic?* — settle it with a grep or a count right then, and note what it
showed.

**Done when** you can say in one paragraph what the system does, in the
maintainer's vocabulary, and name each thing it does, with every entry point and
every top-level folder accounted for by one of them or by a stated reason it is
not.

### 2. Draft the territories

A **territory** is an area of what the system *does*. Draft them from the
paragraph you just wrote, not from the folders:

- **Overlap is expected.** A file can sit in three territories; a territory can
  span four folders. A large file holding several jobs is several territories.
- **One concept, one note.** Two things with separate names get separate notes,
  so a blast edge can point at exactly one. A `&` in a territory name — or a
  spelled-out `-and-` — is the tell. Where several concepts belong side by side, add an **aggregate** note
  over them.
- **A fact that holds in several territories is an invariant**, its own note —
  the shared storage layout, the coordinate space, the lifecycle rule — when it
  can name at least two sites, by symbol, that neither call each other nor reach
  the fact through one shared primitive, and changing one without the other
  would be a bug — values that merely agree are
  not one. Put it in one territory and the others never see it; with fewer
  sites it is a design-model line in one territory. One first found after step
  3's question is asked about before it is written.
- **Quiet areas count.** Release tracks, published packages, frozen shims, CI,
  generated or vendored directories: they rarely change and break silently when
  touched. Shipping is something the system does.

**Note paths already cited.** Code comments, docs and a CI link check may name
note paths before any note exists. Search for the map's last folder name with a
note subfolder or a `.md` after it — `git grep -nE '(^|[^[:alnum:]_-])<map>/((territory|invariant)/|[^ )]*\.md)' -- .`
with `<map>` the folder's last segment (`map`) — so a relative citation such as
`../map/invariant/x.md` is found too, and `roadmap/` is not. Read each hit: a
path in a map checker's **tests** is fixture data, not a citation; a checker's
config that names note paths is one. The bodies of the open issues step 1 read
cite too, since the next worker follows their links; closed issues are not
searched. A cited path with no note on disk — resolved against the citing file
when relative — may have a past version in git: `git show HEAD:<path>` when
only the working tree lacks it, else `git show <d>^:<path>` with `<d>` from
`git log -1 --no-renames --format=%h --diff-filter=D -- <path>`. Read it after
the draft as a lead under step 3's source rule, with that commit as its source;
it takes no ledger row. A drafted concept that a cited path names
takes that path; where one cited path names several drafted concepts, it is
placed by the ledger's split row in
[init over an existing map](#init-over-an-existing-map). A cited path no concept
claims is listed at closing with the note that now holds its subject. Draft
first, then match: a cited name never adds a territory the system does not have.

A listed reference stays broken until someone repoints it, and this skill edits
none of them: where the repo's link check covers those files, say in the closing
report that it stays red until they are repointed.

**Done when** every entry point, every top-level folder and every open-backlog
item lands in some territory or in the hub's stated out-of-scope.

### 3. Ask what the reading raised

Ask once, with the tool that renders a question, whether the territory draft
carves the system the way the maintainer does. Recommend an answer and give the
reason that would make it wrong.

Then ask whatever the reading raised and did not settle, when it raises it —
*why does the launcher copy the binary before replacing it?* Every question has a
subject you found. Record each answer by its **provenance**:

- **The repo can confirm it** — check, then write the fact with the evidence
  that confirmed it (a symbol, a record, a commit).
- **Nothing in the repo can** — intent, history, a constraint from outside —
  write it with its source and date: `(maintainer, 2026-10-21)`. A reader can
  then tell a stated reason from a checked one.

An answer that points somewhere — *"look at the caller"* — is a lead: read
where it points, and record what you found there under the first rule.

A README, an old note, a comment or a commit message used as a source follows
the same rule: what it says about the code is checked against the code before a
note repeats it.

**Done when** the maintainer has answered the draft question and every doubt in
your notes from steps 1 and 2 that a grep did not settle is answered or written
into a note's `## Known holes / open`.

### 4. Write

Write one note per territory, per invariant, per aggregate, and the hub. The
templates and conventions are in [NOTES.md](NOTES.md); read it before the first
note.

**Check each note as you finish it**, against the code it names: reread the
symbols under `## Code`, follow each link, check that each blast reason names a
shared assumption, and make sure each claim has its evidence or its source. A
link to a drafted note not yet written is expected to dangle until step 4 ends.
A defect found at the third note ends there; found at the end, it has been
copied into every note after it.

**A large repo may split this step** across agents by territory, under one owner
of the invariants and the hub — [NOTES.md](NOTES.md#splitting-the-writing).

The hub carries two stamps, one line each:

```markdown
<!-- grill-map build stamp: <skills repo commit> -->
<!-- grill-map synced at: <this repo's HEAD commit> (<its committer date, yyyy-mm-dd>) -->
```

The build stamp is the commit of the skills checkout whose `grill-map` this run
read — `git -C <that checkout> rev-parse --short HEAD`, normally the one
`~/.claude/skills/grill-map` resolves to — with `(uncommitted)` after it when
`git -C <that checkout> status --porcelain -- grill-map` lists changes. It is
read once, when the run begins; a skill changed mid-run is not re-read. The
synced-at line is what update reads from; the date is its fallback when the
commit is gone.

**Done when** every territory from step 2 has a note, the hub links them all,
both stamps are written, and every identity doc carries the hub link and the
[binding](NOTES.md#the-binding) — or, in a repo with no
identity doc, the hub says so and the closing report names it.

### 5. The reading test

The map is done when it can explain a change it does not already describe. The
map was written at HEAD, so a commit's own fix is in a note. In order: an
**open backlog item**; else a `## Known holes / open` item as a change, compared
with the code it would need; else the most recent commit that changed behaviour
(not a bump, release or formatting pass), its issue number cut from the subject.
For either of the last two, the predictor reads a scratch copy of the map
without the lines naming the change — the hole's own line, the issue or commit. A commit that bundles unrelated work
under one subject is scored per part: a territory reached only by the part the
subject does not name is not a miss.

You have read that change's code, so the prediction is not yours to make. Give a
fresh subagent the change's subject line or backlog text — no diff — and the map
folder, or that copy, as the only thing it may read, and have it name, from the hub, the
territories the change touches and why, following blast-radius and invariant
links. Nothing confines it, so have it list every file it opened: one outside the
map voids the run. Then compare with the commit's real diff, or with the code
the backlog item would need.

- A territory the change touched and the map did not reach is a **missing edge**
  or a **missing note**: fix it and run the test again.
- A territory the map reached and the change did not touch is fine. The blast
  list is a checklist, and an item with nothing to do is a correct outcome.

**Done when** the test reaches every touched territory, and its transcript — the
change, the path from the hub, the explanation, the comparison — has been shown
to the maintainer.

## init over an existing map

The old map — one written by this skill's first version (`retired/grill-map-v1`, ADR-0082), a flat folder of hand-written notes, a map from
an earlier init — is one more thing a new maintainer reads: useful, possibly
stale, and written by someone who knew things the code does not say. Run init's
five steps with these changes.

**Before anything, show what is there and ask.** Rewriting someone's map is hard
to take back, and its shape varies by repo, so survey it and get a yes before
writing. The survey reads file names, the identity docs, and the hub and any
pointer only far enough to tell a pointer from the hub and to take their links
and stamp lines; their prose is a lead like any note's, read after the draft:

- **the hub**, as Mode found it;
- **files that are not notes** — a pointer, a map checker's config where the
  maintainer kept it, and any `.md`
  the notes link into as a store, such as a reference-facts file: search by
  link, `git grep -lE '\]\(([^)]*/)?<file>' -- <map folder>`, not by bare name,
  which also matches files outside the map. These stay as they are;
- **the notes** — every other `.md` in the folder: how many, and the layout,
  `territory/` and `invariant/` folders, flat, or other;
- **references from outside** — `git grep -c '<map folder>/' -- . ':(exclude)<map folder>/**'`,
  the count that says how much depends on the paths kept.

Put that to the maintainer with the tool that renders a question, as a proposal
with a recommended answer and the reason that would make it wrong: the hub
path, the notes to be rewritten in place, the files kept, the outside count,
and the cost — notes and lines to be read and rewritten.
Three answers: **rewrite**, below; **adopt**, offered when a hub exists, the map
folder is committed and clean (`git status --porcelain -- <map folder>` empty), and init was not forced — write the synced-at
line at the map folder's last commit (`git log -1 --format='%h (%cs)' -- <map folder>`)
and the build stamp, then run [update](#update) from there, every step even on
an empty range, and end on its criteria; its reading test is the adoption test
and never "nothing to run on". A claim false since before that commit is not
caught, which is the price; **no** — nothing is written: say so and stop. An answer that corrects the survey — *"the
hub is the other file"*, *"that one is not a note"* — is recorded as theirs and
followed.

**Steps 1 and 2, draft first.** Orient on the repo and write the territory
draft down **before opening any old note** — the file names seen when the mode
was chosen are not a draft. Then read every old note, the hub included, and take
each claim in it as a **lead**, keeping the lead's own provenance: *"decided on
#1"*, *"the maintainer chose on #5"*, an ADR, a pinned reference — each is
already a source. Revise the draft where a lead shows the system does something
you missed.

**The ledger.** Place every old note against the draft:

| Old note is… | What happens to its path |
|---|---|
| the same concept as a drafted note | the new note **keeps the old path** |
| split into several concepts | the path stays with the part that references outside the map cite (`git grep`), or, with none citing a part, the part that holds most of the old note; the other parts are new notes, and references now landing on the wrong part are listed at closing. An aggregate takes the path only where NOTES.md's aggregate rule holds on its own |
| merged into another concept | the path dies |
| no longer a concept the system has | the path dies |
| the old hub | replaced by the new hub at its path |

A new note may be built from several old notes; it takes a new path unless one
of them is the same concept. Code comments, identity docs and other docs
point at note paths, and this skill edits none of them, so a path is kept
wherever a concept survives. New notes follow the old map's layout — flat beside
flat notes, under `territory/` and `invariant/` where the old map used them; in
a flat layout an invariant is named for its fact, and the hub links it under its
own heading, apart from the territories. Put the ledger beside the draft when you ask step 3's question
whenever a path would die or split: it decides which references break.

**Step 4, carrying.** A note that keeps its path is edited in place, not
written from blank. Every claim in an old note ends one of four ways:

- **re-verified** — checked against the code at HEAD and written with that
  evidence. A claim true in substance and wrong in a detail is re-verified with
  the detail corrected, and the correction goes in the closing report;
- **attributed** — not checkable in the repo (a decision recorded only on an
  issue or by a person, a measurement on an issue, an upstream comparison),
  written with its original source and date. A decision recorded in the repo — a
  decision record, a direction doc — is evidence that it was decided; whether
  the code follows it is re-verified;
- **moved** — re-verified or attributed into another note, because it is that
  note's fact;
- **dropped** — false at HEAD, a to-do already done, or a story whose lesson
  no section holds, with the reason in the closing report. A discovery history
  and a dated measurement are not dropped as history: they go to the sections
  that hold them.

The evidence or source written beside each claim is the marker; there is no
separate tag. A heading an old note used that the templates lack is folded into
the template's sections.

**Closing, the references that changed meaning.** Delete every note whose path
died; git keeps it. Then list every reference outside the map's notes —
`git grep -n '<path inside the map, e.g. territory/x.md>' -- . ':(exclude,glob)<map folder>/**/*.md'`,
searching by the path inside the map so relative citations are found, and so a
kept checker config is searched too — that now lands somewhere else
than it meant: each reference to a dead path, and each reference to a kept path
whose cited content moved out. Section citations too — `git grep -nE '\.md ?(§|#)'`
over the same scope, read for note names: a cited heading (a `#` hit by its
slug) that no longer exists is listed with the heading that now holds it. Name the note that now
holds each, so the maintainer can repoint it.

**Done when** the maintainer said rewrite, init's criteria hold,
every old note appears in the ledger, every
carried claim is re-verified, attributed, moved or dropped with a reason, and
every reference that changed meaning is listed.

## update

The map was true at its synced-at commit. Update reads what happened since, the
way a maintainer back from leave reads the log: subjects first, then the diffs
that matter, then the notes those diffs falsified. A note is opened only when a
commit or a backlog change names it (step 1), it holds a copy of a fact the
range changed (step 3), or it owes a link to a note this run added, an
invariant this run changed, or a moved path; or a fold writes into it (step 2).

### 1. Read the range

Resolve the synced-at commit. If it no longer exists (a rebase, a squash), read
from the first commit **on** its date — the stamp has no time, and re-reading a
day costs less than missing a commit — and say so in one line naming both. If
it is HEAD, the map is current: say so and stop — except on adopt.

Read every commit subject in the range, and give each one a class:

| Class | Examples | What follows |
|---|---|---|
| **behaviour** | a feature, a fix, a changed default | its diff is read |
| **refactor** | a file split, symbols moved, a module extracted, a module path renamed — behaviour unchanged | its diff is read for moved addresses, and for a fact restated at the new site (a module doc, a comment) that a note already owns |
| **structure** | a new top-level package, a moved entry point, a reorganised tree, a territory's code removed whole | see below |
| **doc** | the README, the identity doc, the glossary, a decision record | its diff is read: a doc can falsify a claim, and a new decision record fills a `## Governing decisions` |
| **build** | build, release, CI, packaging | its diff is read |
| **map** | a commit touching only the map — a hand edit, a `sweep` pass | its diff is read: each note it changed is named, and its edits are kept unless the code at HEAD shows them false; a claim it added with no evidence or source is attributed to it as a message's is (step 2) |
| **noise** | a dependency bump, formatting, a release tag with no change | named, not read |

A commit of another class that also edits the map has its map part read as a
**map** commit's. In a commit that changes the hub's `grill-map synced at` line,
what this skill writes — map, binding — is its own run: **noise**; the rest
keeps its class.

Search for new note paths — init's step 2 grep over the files `git diff --name-only -G'<map>/' <start>..HEAD -- . ':(exclude)<map folder>'`
lists, `<start>` the synced-at commit or the parent of the fallback's first — and the
bodies, not comments, of issues opened since. A new citation of a path that
exists is fine; one naming an existing note's concept under another path goes
to step 2's path rule; one no concept claims is listed at closing.

Read the backlog too: issues opened or closed since that date. It changes
without a commit. An **opened** issue is read like a behaviour commit's subject
— which notes would it bite? — and goes in as a `Tracked:` pointer or a
`## Known holes / open` line; a **closed** one is found where notes cite it, and
the sentence around the citation is checked against the code.

A subject can lie about its commit. Where the files a commit touched do not
match its subject, read the diff and class it by what it did.

**A structure commit is a reason to stop.** The territories were drafted from a
system that is no longer there, and patching them maps the old one. Recommend
`/grill-map init`, give the commit and what moved, and stop unless the maintainer
says to continue.

**Done when** every commit in the range has a class, every backlog change is
read as opened or closed, and each that is not noise names the notes it may
falsify, or *none* with the reason.

### 2. Fix what the range falsified

For each named note, read the whole note against the code as it is now — not
the diff alone. The diff says where to look; the note says what was claimed.

- **A claim the change made false** — a design rule, a blast edge, a known hole
  now closed, a governing decision now written — rewrite it with its evidence.
  Provenance follows init's step 3; a commit is evidence, its message a source.
  What a message says that the code can show is checked and written with the
  code's evidence; what it cannot — an incident, a measured count — is written
  as `(commit <sha>, <committer date>)`, in the section that holds that kind
  of fact, as init over an existing map places a discovery history.
- **An address that moved** — a symbol renamed or moved between files —
  correct `## Code`. A symbol gone from the whole tree: reread the design model
  above it, which may be gone too.
- **An area no note covers** — draft it under init's step 2 rules and write it
  with NOTES.md. An entry point or top-level folder that appeared is the usual
  tell.
- **An invariant that no longer meets init's step 2 bar** is folded. Fewer than
  two sites left, or one shared primitive now holding the fact: it becomes a
  design-model line in the territory holding that primitive or the last site,
  and a territory that still reaches the fact gains a blast edge to it. Sites
  that could now change apart: each keeps or gains its own line, with no edge.
  Either way the territories' cross-cutting link goes when the note does.
- **Every identity doc**, changed in the range or not — make sure it carries the
  hub link and the [binding](NOTES.md#the-binding), so one missing before the
  range is caught too.

**A note path is never renamed or deleted unasked.** Code comments and docs
cite note paths and this skill edits none of them. When a change calls for it —
a cited path added in the range that names an existing note's concept, an
invariant folded as above — count the references outside the map to each path
(`git grep -n '<path inside the map>' -- . ':(exclude,glob)<map folder>/**/*.md'`,
reading hits as init's step 2 does), and ask with the tool that renders a
question, recommending an answer. Until a yes, the note keeps its path; a folded
invariant's note says where its fact now lives and links there. After
a yes, every link to the old path in the map — the hub's, blast edges,
cross-cutting sections — is rewritten, or removed with a deleted note, and the
references outside it that now land elsewhere go in the closing report. A note a
**map** commit already renamed or deleted is handled the same way: the act was
not this run's to ask about.

Section citations to any note this step edited or moved — init over an existing
map's `§`/`#` grep, `-- . ':(exclude,glob)<map folder>/**/*.md'` — whose heading
is gone go in the closing report too, whether or not a path moved.

Ask when the reading does not settle which claim a change moved, as in init's
step 3. Keep each invariant's territories and the territories' cross-cutting
sections pointing at each other.

**Done when** every note named in step 1 has been reread and either changed or
confirmed unchanged, every identity doc carries the hub link and the binding,
and no other note was edited in this step except for back-links, the hub's link
to a note this step wrote, the links a moved path needs, and a fold's edits.

### 3. Read the same fact in two notes

A map gains a second copy of a fact through updates, and the copy usually sits in
a note no commit named. For every fact the range changed — an enumeration, a
shared constant, a named rule — search **every** note for it and read the copies
side by side. **One note owns it; the others say they are one of its cases and
link.** Two lists of the same length beside each other is the smell: check that
each entry in one maps to an entry in the other, and where one does not, ask what
the unmatched entry was — it is usually the sharpest fact in the territory.

**Done when** each such fact has one owner and the rest are pointers. Besides
step 2's edits outside its notes, these are the only ones.

### 4. Advance the stamps

Set `grill-map synced at` to HEAD with its committer date (`git log -1 --format=%cs`),
and the build stamp as init's step 4 says.

**Done when** both lines name this run.

### 5. The reading test

As init's step 5, masked the same way, on a behaviour commit **from the
range**; where it has none, on an opened backlog item, and where there is none
of those either, say the test had nothing to run on (on adopt, init's order).

**Done when** the test reaches every territory that change touched, or was
reported as having nothing to run on, and the run — the range, each commit's class, the notes changed and why, the test — has been
shown to the maintainer.

## Closing report

Every mode ends with one report to the maintainer. Collect into it, from
wherever the run met them:

- references outside the map that land somewhere else or nowhere, with the note that
  holds their subject — and whether the repo's link check stays red until they
  are repointed;
- corrections made to old claims, and drops with their reasons (init over an
  existing map);
- holes the reading found, with the note that records each;
- a map checker the repo had: each file removed or edited, or *kept* and by
  whose answer;
- anything that looked wrong in source, records or specs, left as it was, and
  checks worth having, as proposals (Scope);
- a missing identity doc, and the reading test's transcript.

## Scope

Writes map notes, the hub, and the binding in the identity docs. Never edits
source, decision records or specs, and proposes moving or merging a doc only
once it knows what consumes it; one that looks wrong is named in the closing
report and left. A hole the reading found goes in its note's `## Known holes /
open` and the closing report — never into the tracker, even where the repo's
rules want an issue per hole; filing is the maintainer's.

**Builds no tool.** A doubt is settled by a command run once and read. A saved
script, a loop that judges covered or not, a checker the repo lacks (step 4
follows each link by hand) are not this run's to write, even when asked whether
something can be checked: the closing report names the check, what it would
test and the miss it would have caught, and building it is the maintainer's. A
map checker is never one of them (ADR-0083).
