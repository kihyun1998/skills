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

Look at the map folder and say in one line which mode runs and why.

| On disk | Mode |
|---|---|
| no map folder, or only a hub stub (a hub with no notes beside it) | **init** |
| notes, and a hub with a `grill-map synced at` line | **update** |
| notes, and no `grill-map synced at` line (a map written by this skill's first version, another skill or by hand) | **init over an existing map** |

The working tree decides, not the git index: map files the index lists and the
tree lacks are a deleted map, named in the one-line statement, and the mode is
read from what is on disk.

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
   the call site, how it is built and shipped from there — and cite it with that
   repo's commit and the date. A helper whose contract lives in its caller is
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
  the shared storage layout, the coordinate space, the lifecycle rule. Put it in
  one territory and the others never see it.
- **Quiet areas count.** Release tracks, published packages, frozen shims, CI,
  generated or vendored directories: they rarely change and break silently when
  touched. Shipping is something the system does.

**Note paths already cited.** Code comments, docs and a CI link check may name
note paths before any note exists. Search for the map's last folder name with a
note subfolder or a `.md` after it — `git grep -nE '<map>/(territory|invariant)/|<map>/[^ )]*\.md' -- .`
with `<map>` the folder's last segment (`map`) — so a relative citation such as
`../map/invariant/x.md` is found too. A drafted concept that a cited path names
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

**Done when** the maintainer has answered the draft question and every open
question from the reading is answered or written into a note's
`## Known holes / open`.

### 4. Write

Write one note per territory, per invariant, per aggregate, and the hub. The
templates and conventions are in [NOTES.md](NOTES.md); read it before the first
note.

**Check each note as you finish it**, against the code it names: reread the
symbols under `## Code`, follow each link, check that each blast reason names a
shared assumption, and make sure each claim has its evidence or its source. Where
the repo has its own map checkers, run them on the note here, not only at the
end — and read their result for this note's own addresses only: a link to a
drafted note not yet written is expected to fail until step 4 ends. A defect
found at the third note ends there; found at the end, it has been copied into
every note after it.

**A large repo may split this step** across agents by territory. Each one gets
the draft, NOTES.md and step 3's provenance rule. One owner keeps the
invariants and the hub: a territory agent that finds a fact holding beyond its
territory reports it to the owner with its sites rather than writing an
invariant note, and the owner writes it and adds it to the territories it holds
in. At the end the owner checks that every invariant and the territories it
claims point at each other.

The hub carries two stamps, one line each:

```markdown
<!-- grill-map build stamp: <skills repo commit> -->
<!-- grill-map synced at: <this repo's HEAD commit> (<its committer date, yyyy-mm-dd>) -->
```

The build stamp is the commit of the skills checkout whose `grill-map` this run
read — `git -C <that checkout> rev-parse --short HEAD`, normally the one
`~/.claude/skills/grill-map` resolves to — with `(uncommitted)` after it when that
checkout has uncommitted changes to `grill-map`. The synced-at line is what update reads from; the date is its
fallback when the commit is gone.

**Done when** every territory from step 2 has a note, the hub links them all,
both stamps are written, and every identity doc carries the hub link and the
binding from [Once the map exists](#once-the-map-exists) — or, in a repo with no
identity doc, the hub says so and the closing report names it.

### 5. The reading test

The map is done when it can explain a change. Prefer an **open backlog item**:
the map was written at HEAD, so every commit is already in it, and a predictor
handed a commit's subject can find that commit's own fix written in a note.
Without a backlog, pick the most recent commit that changed behaviour (not a
dependency bump, release or formatting pass) and say the map has absorbed it. A commit that bundles unrelated work
under one subject is scored per part: a territory reached only by the part the
subject does not name is not a miss.

You have read that change's code, so the prediction is not yours to make. Give a
fresh subagent the change's subject line or backlog text — no diff — and the map
folder as the only thing it may read, and have it name, from the hub, the
territories the change touches and why, following blast-radius and invariant
links. Nothing confines it, so have it list every file it opened: one outside the
map voids the run. Then compare with the commit's real diff, or with the code
the backlog item would need.

- A territory the change touched and the map did not reach is a **missing edge**
  or a **missing note**: fix it and run the test again.
- A territory the map reached and the change did not touch is fine. The blast
  list is a checklist, and an item with nothing to do is a correct outcome.

If the repo already has a map checker, run it as a check on addresses: fix the
broken links inside the map's notes, and list the ones outside them as step 2's
cited-path rule says. Passing it does not finish the map; the reading test
does.

**Done when** the test reaches every touched territory, and its transcript — the
change, the path from the hub, the explanation, the comparison — has been shown
to the maintainer.

## init over an existing map

The old map — one written by this skill's first version (`retired/grill-map-v1`, ADR-0082), a flat folder of hand-written notes, a map from
an earlier init — is one more thing a new maintainer reads: useful, possibly
stale, and written by someone who knew things the code does not say. Run init's
five steps with these changes.

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

**Step 4, carrying.** Every claim in an old note ends one of four ways:

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
the template's sections. The counts per old note go in the closing report, not
the notes.

The new hub replaces the old one and carries grill-map's stamps; an old stamp line
goes with it. Files in the map folder that are not notes — a checker script, its
config — stay where they are, and a checker is run as in init's step 5.

**Closing, the references that changed meaning.** Delete every note whose path
died; git keeps it. Then list every reference outside the map's notes —
`git grep -n '<path inside the map, e.g. territory/x.md>' -- . ':(exclude,glob)<map folder>/**/*.md'`,
searching by the path inside the map so relative citations are found, and so a
kept checker config is searched too — that now lands somewhere else
than it meant: each reference to a dead path, and each reference to a kept path
whose cited content moved out. Name the note that now holds it, so the
maintainer (or `decant`, for a code comment) can repoint it.

**Done when** init's criteria hold, every old note appears in the ledger, every
carried claim is re-verified, attributed, moved or dropped with a reason, and
every reference that changed meaning is listed.

## update

The map was true at its synced-at commit. Update reads what happened since, the
way a maintainer back from leave reads the log: subjects first, then the diffs
that matter, then the notes those diffs falsified. A note is opened only when a
commit or a backlog change names it (step 1), or it holds a copy of a fact the
range changed (step 3).

### 1. Read the range

Resolve the synced-at commit. If it no longer exists (a rebase, a squash), read
from the first commit **on** its date — the stamp has no time, and re-reading a
day costs less than missing a commit — and say so in one line naming both. If
it is HEAD, the map is current: say so and stop.

Read every commit subject in the range, and give each one a class:

| Class | Examples | What follows |
|---|---|---|
| **behaviour** | a feature, a fix, a changed default | its diff is read |
| **refactor** | a file split, symbols moved, a module extracted, a module path renamed — behaviour unchanged | its diff is read for moved addresses, and for a fact restated at the new site (a module doc, a comment) that a note already owns |
| **structure** | a new top-level package, a moved entry point, a reorganised tree, a territory's code removed whole | see below |
| **doc** | the README, the identity doc, the glossary, a decision record | its diff is read: a doc can falsify a claim, and a new decision record fills a `## Governing decisions`. A claim the doc makes about the code is checked against the code before a note repeats it |
| **build** | build, release, CI, packaging | its diff is read |
| **noise** | a dependency bump, formatting, a release tag with no change | named, not read |

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
says to continue. A rename that touches every file and changes no behaviour (a
module path) is not structure; it is a refactor.

**Done when** every commit in the range has a class, every backlog change is
read as opened or closed, and each that is not noise names the notes it may
falsify, or *none* with the reason.

### 2. Fix what the range falsified

For each named note, read the whole note against the code as it is now — not
the diff alone. The diff says where to look; the note says what was claimed.

- **A claim the change made false** — a design rule, a blast edge, a known hole
  now closed, a governing decision now written — rewrite it with its evidence.
  Provenance follows init's step 3; a commit is evidence, its message a source.
- **An address that moved** — a symbol renamed or moved between files —
  correct `## Code`. A symbol that no longer exists anywhere is not an address
  problem: the design model above it may be gone too.
- **An area no note covers** — draft it under init's step 2 rules and write it
  with NOTES.md. An entry point or top-level folder that appeared is the usual
  tell.
- **An identity doc that appeared or changed** — make sure it carries the hub
  link and the [binding](#once-the-map-exists).

Ask when the reading does not settle which claim a change moved, as in init's
step 3. Keep each invariant's territories and the territories' cross-cutting
sections pointing at each other.

**Done when** every note named in step 1 has been reread and either changed or
confirmed unchanged, and no note outside them was edited in this step.

### 3. Read the same fact in two notes

A map gains a second copy of a fact through updates, and the copy usually sits in
a note no commit named. For every fact the range changed — an enumeration, a
shared constant, a named rule — search **every** note for it and read the copies
side by side. **One note owns it; the others say they are one of its cases and
link.** Two lists of the same length beside each other is the smell: check that
each entry in one maps to an entry in the other, and where one does not, ask what
the unmatched entry was — it is usually the sharpest fact in the territory.

**Done when** each such fact has one owner and the rest are pointers. The edits
here are the only ones allowed outside step 1's notes.

### 4. Advance the stamps

Set `grill-map synced at` to HEAD with its committer date (`git log -1 --format=%cs`),
and the build stamp to the skills commit this run used — with `(uncommitted)`
after it when the skills checkout had uncommitted changes to `grill-map`.

**Done when** both lines name this run.

### 5. The reading test

As init's step 5, on a behaviour commit **from the range**; where the range has
none, on an opened backlog item, and where there is none of those either, say
the test had nothing to run on. The predictor sees only the updated map and the
subject line.

**Done when** the test reaches every territory that change touched, and the run
— the range, each commit's class, the notes changed and why, the test — has been
shown to the maintainer.

## Once the map exists

A map that is only written is pure cost. Bind it before closing, next to the
hub link in every identity doc the repo has (`CLAUDE.md`, `AGENTS.md`) — and
where one already carries a map binding, revise that one rather than adding a
second:

- **Read before the change, write after it.** Where the repo's working
  discipline has named phases, the read binds to an early one, before a design
  is committed, and the write to a late one; where it has none, say *before
  designing a change* and *after it lands*.
- **Replace hand-kept lists with the map.** Where a checklist or process doc
  hand-lists what a map note now holds — "also check these files", an area
  roster — propose replacing the list with a link to the note, so the map is the
  only place the answer lives. Find out what reads the list first: a table that
  looks misfiled may be there because something consumes it.
- **Promotion, at the first fix.** When a fix reveals a fact, ask whether it
  also holds outside the territory it was found in — phrased so grep can answer
  it: *"does this hold at every site that shares <the assumption>?"* If yes, the
  fix lands with an invariant note.

## Scope

Writes map notes and the hub, and the binding above in the repo's identity docs.
Never edits source, decision records or specs, and never proposes moving,
merging or shrinking a doc without knowing what consumes it. Where one of those
looks wrong, say so in the closing report and leave it. A hole the reading found
goes in its note's `## Known holes / open` and in the closing report — never
into the tracker, even where the repo's rules want an issue per hole; filing is
the maintainer's.
