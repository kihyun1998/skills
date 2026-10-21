---
name: map-it
disable-model-invocation: true
description: "Write a repo's MAP by reading it the way a person learns a codebase. Use when a repo has no map yet. /map-it, /map-it init."
---

# map-it — read the repo, then map it

A **MAP** is a repo's linked note graph (see `GLOSSARY.md`). It answers the two
questions that gate a change: *if I touch this, what else moves?* and *what
decision is this shape derived from?* It lives in `docs/map/` unless the repo's
layout names another place, and its hub is linked from the repo's identity doc.

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
| notes, and a hub with a `map-it synced at` line | **update** |
| notes, and no `map-it synced at` line (a map written by another skill or by hand) | **init over an existing map** |

`/map-it init` forces init on a map with a synced-at line.

**update** and **init over an existing map** are not built yet (tracked:
#17, #16 in the skills repository). For either — including `/map-it init` over a
folder that holds notes with no synced-at line — say so, name the issue, and
stop without writing.

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
  so a blast edge can point at exactly one. A `&` in a territory name is the
  tell. Where several concepts belong side by side, add an **aggregate** note
  over them.
- **A fact that holds in several territories is an invariant**, its own note —
  the shared storage layout, the coordinate space, the lifecycle rule. Put it in
  one territory and the others never see it.
- **Quiet areas count.** Release tracks, published packages, frozen shims, CI,
  generated or vendored directories: they rarely change and break silently when
  touched. Shipping is something the system does.

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

An old note, a comment or a commit message used as a source follows the same
rule.

**Done when** the maintainer has answered the draft question and every open
question from the reading is answered or written into a note's
`## Known holes / open`.

### 4. Write

Write one note per territory, per invariant, per aggregate, and the hub. The
templates and conventions are in [NOTES.md](NOTES.md); read it before the first
note.

**Check each note as you finish it**, against the code it names: reread the
symbols under `## Code`, follow each link, and make sure each claim has its
evidence or its source. A defect found at the third note ends there; found at the
end, it has been copied into every note after it.

The hub carries two stamps, one line each:

```markdown
<!-- map-it build stamp: <skills repo commit> -->
<!-- map-it synced at: <this repo's HEAD commit> -->
```

The build stamp is the commit of the skills checkout that `~/.claude/skills/map-it`
resolves to. The synced-at line is what update reads from.

**Done when** every territory from step 2 has a note, the hub links them all,
both stamps are written, and the identity doc carries the hub link and the
binding from [Once the map exists](#once-the-map-exists).

### 5. The reading test

The map is done when it can explain a change. Pick the most recent commit that
changed behaviour (not a dependency bump, release or formatting pass); in a repo
without one, pick an open backlog item. A commit that bundles unrelated work
under one subject is scored per part: a territory reached only by the part the
subject does not name is not a miss.

You have read that change's code, so the prediction is not yours to make. Give a
fresh subagent that can read **only the map folder** the change's subject line
or backlog text — no diff — and have it name, from the hub, the territories the
change touches and why, following blast-radius and invariant links. Then compare
with the commit's real diff, or with the code the backlog item would need.

- A territory the change touched and the map did not reach is a **missing edge**
  or a **missing note**: fix it and run the test again.
- A territory the map reached and the change did not touch is fine. The blast
  list is a checklist, and an item with nothing to do is a correct outcome.

If the repo already has a map checker, run it as a check on addresses: fix the
broken links it reports. Passing it does not finish the map; the reading test
does.

**Done when** the test reaches every touched territory, and its transcript — the
change, the path from the hub, the explanation, the comparison — has been shown
to the maintainer.

## Once the map exists

A map that is only written is pure cost. Bind it before closing, in the repo's
identity doc next to the hub link:

- **Read before the change, write after it.** Where the repo's working
  discipline has phases, the read binds to an early one, before a design is
  committed; the write to a late one.
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

Writes map notes and the hub, and the binding above in the repo's identity doc.
Never edits source, decision records or specs, and never proposes moving,
merging or shrinking a doc without knowing what consumes it. Where one of those
looks wrong, say so in the closing report and leave it.
