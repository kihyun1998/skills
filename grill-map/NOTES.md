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
sites do not call each other — which is why no territory edge could carry it.

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
