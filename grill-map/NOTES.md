# MAP notes — templates and conventions

Read before writing the first note. The note kinds and section headings are the
same as every MAP already in use, so maps written by either version read alike.

## Conventions

- **Section headings are exact strings, identical across every note.** Follow
  the repo's doc-language rule for the language, and use it everywhere: a note
  spelling a heading differently drops out of every query over that heading.
- **Empty sections stay, with the sentinel `**None.**`.** A governing-decisions
  heading with nothing under it *is* the finding. The same sentinel marks several
  headings, so a query for it names its heading:

  ```sh
  rg -lU '## Governing decisions\r?\n(\r?\n)?\*\*None\.\*\*' <map folder>/territory/
  ```

- **Symbols, never line numbers.** `launcher.go — Launch` survives the next edit;
  `launcher.go:88` is stale on it.
- **Plain markdown relative links**, `[text](../adr/0003-x.md)`. GitHub renders
  them and Obsidian's graph view resolves them.
- **Link a fact, never restate it.** A value another artifact owns — a record's
  status, a count, an issue's state — is linked. A tracker entry is cited as
  evidence that outlives it, never as a status that its closing makes false:
  *"`dispose` cannot reach the loop — it is not on the port. Tracked: #606"*.
- **A list of sites:** carry the command that produces the part a tool can see,
  hand-write the part no tool can see, and label the two halves.
- **Provenance:** every claim carries its evidence or its source and date
  (SKILL.md, step 3).

## Territory note

```markdown
# <territory>

## What it is
One paragraph: what this area is responsible for in the system.

## Governing decisions
Links to the decision records that govern it, or **None.** — then what sits
adjacent and why it does not govern ("this ADR decides delivery, not the model").

## Design model
The rules and invariants this area keeps. Say whether they come from a record or
only from reading the source; that is the territory's status. Where the area
takes input from outside the system — a byte stream, a user, a network peer —
say what bounds that input's size and count.

## Code
Symbols by file, as text: `file — Type::method`. A territory that is designed and
not built takes **None.**, then what does not exist and where a first slice
would start. It gets a note when something in the repo commits to it — a
decision record, a spec, an open issue with a design; an idea with nothing
behind it is a line in the hub's scope instead.

## Reference behaviour
Links into the repo's verified external-fact store, anchored to the entry, one
line each on what it settles here. Without a store, link the comparison's own
source — a pinned upstream file, the issue that measured it. **None.** only when
this area was never compared to a reference.

## Cross-cutting invariants
Links to the invariant notes that hold here.

## Blast radius
Links to the territories to check after changing this one, each with its reason.
The reason names **what goes wrong over there** — the assumption the two share —
not the route a call takes: *"the URI it stores has no size bound"*, not
*"the `OSC 8` arm"*. A reader holding a change picks edges by their reasons; a
route reason matches every change and so guides none.

## Known holes / open
What is not built, not decided, or not understood — including questions the
reading raised and nobody could answer — and an outside input that nothing
bounds (see `## Design model`).
```

## Cross-cutting invariant note

```markdown
# <invariant>

## The fact
Stated once, in the form that makes it checkable.

## Why it is cross-cutting
The shared assumption that makes it hold in several places, and that those
sites do not call each other or one shared primitive — which is why no
territory edge could carry it —
and why changing one without the other would be a bug.

## Territories it holds in
Territory links, naming the site in each. Each territory links back under its
own `## Cross-cutting invariants`.

## What a violation looks like
The symptom, and the condition under which it reproduces.

## Discovery history
Where it was found, one line each, with evidence — a reading is evidence; the
bar for being an invariant at all is in SKILL.md, step 2.

## Where it will recur
The test a future author can run: "if a function does X, it is subject to this".
```

## Aggregate note

Optional: only where several concepts genuinely belong side by side. It owns no
detail; a fact at home in one member goes there.

```markdown
# Aggregate — <the shared name>

**This note owns no detail.** <one line: what kind of relationship this is>

| Concept | Note |
|---|---|
| <one line each — enough to route> | [<name>](<file>.md) |

## Why they sit together
The relationship, stated as narrowly as it holds: "A reads B's state under one
condition, and B knows nothing about A".

## <the one thing only this note can say>
```

Name members by concept, not by file. If the last section has nothing to say,
the aggregate is a table of contents; leave it out.

## Hub note

The entry point. Bare links to every note keep it connected; **no roster
columns** (what governs each, how many…) — the folder is the roster, and the
sentinel queries answer the rest. It holds what no note holds:

- the two questions the map answers, and what to open for each;
- how to read it: `## Blast radius` is a checklist, `## Governing decisions`
  answers why, a **None.** is itself the answer;
- the conventions above, in one line each;
- what the map cannot answer: source files and issues are text inside notes,
  not nodes;
- the scope, and **what an absent note means** — when absence is correct and
  what makes a note owed ("a territory appears when something in the repo
  commits to it");
- what the orientation found that belongs to no single note (the repo's shape in
  one paragraph, the largest gap);
- the two stamps (SKILL.md, step 4).

## Splitting the writing

Where SKILL.md's step 4 is split across agents by territory, each one gets the
draft, this file and step 3's provenance rule. One owner keeps the invariants
and the hub: a territory agent that finds a fact holding beyond its territory
reports it to the owner with its sites rather than writing an invariant note,
and the owner, once the maintainer has been asked (SKILL.md, step 2), writes it
and adds it to the territories it holds in. A claim one
agent moves into a note another agent writes goes to the owner too, and every
such move is applied by the owner after all the agents have finished, and
checked as step 4 checks a note. At the end
the owner checks that every invariant and the territories it claims point at
each other.

## A map checker in the repo

A **map checker** is anything that reads the map's notes and fails on their
addresses — links, anchors, symbols, the section set. `check_map.py` is one,
under whatever name it was vendored as; so is one the repo wrote itself. A
general link check over all of the repo's markdown is not one, and stays.

**Find it in use**, after the mode line: in the map folder, `scripts/`,
`.github/` (a workflow step), the commands the identity docs and README name,
and a config at the root such as `.checkup.json`. `git grep -nE 'check_map|\.checkup\.json|<map folder>' -- .github scripts ':(glob)*.md'`
finds most of it; read each hit to tell a checker from a citation. None found:
say so in one line and go on.

**Ask before touching it.** List every part with its path — the script, its
config, its tests and fixtures, each CI step that runs it, each line in a doc
that tells a reader to run it — and put it to the maintainer with the tool that
renders a question (`AskUserQuestion` where the harness has one), recommending
removal for the reason in ADR-0083:

- **remove** — delete the script, its config and its tests; drop its CI steps;
  delete or reword the doc lines, so no sentence still tells a reader to run it.
  Touch nothing else; where a CI job holds only that check, the job goes.
- **keep** — leave every part as it is. This run still does not run it, and
  the next run asks again.

A listed part the maintainer says is not the checker is theirs to call: leave
it out. The closing report lists what was removed or edited, or *kept*.

## The binding

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
  only place the answer lives — once you know what reads the list (SKILL.md, Scope).
- **Promotion, at the first fix.** When a fix reveals a fact, ask whether it
  also holds outside the territory it was found in — phrased so grep can answer
  it: *"does this hold at every site that shares <the assumption>?"* If yes, the
  fix lands with an invariant note.
