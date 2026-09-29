---
name: winnow
requires: [writing-for-agents]
description: "Cut an always-loaded agent document — CLAUDE.md, AGENTS.md, a skill body — down to what every run needs. Sorts it paragraph by paragraph into rule, detail, number, roster and history; shows that table and stops for the maintainer; on approval keeps the rules in place, moves detail behind pointers that name their trigger, replaces rosters with the command that derives them, and leaves history to version control. Then proves every rule still has a home. Use when such a document has grown past being read, or reads as a diary of its own past."
---

# winnow — keep the grain, let the chaff blow off

**It runs on a document an agent loads every time**: a repository's `CLAUDE.md`
or `AGENTS.md`, a `SKILL.md` body, a doc a pointer pulls in on most runs. Every
line there is paid for on every session. Source comments are `decant`'s;
decision records are out of scope, since they are where history is kept.

Load `writing-for-agents` first. It holds the levers — pointers, disclosure,
pruning, positive phrasing. This skill is the procedure that applies them to a
document that already exists.

## 1. Measure

Record lines and bytes, whole and per section, before anything moves:

```sh
wc -lc <doc>
awk '/^## /{if(h)printf "%5d %s\n", n, h; h=$0; n=0} {n++} END{printf "%5d %s\n", n, h}' <doc>
```

Find where detail could go: list the repository's existing agent-reference
directory (`docs/agents/` or its equivalent) and grep the repo for references to
the document and its section names. A destination that already exists beats a
new file.

## 2. Sort, paragraph by paragraph

Split each section into paragraphs, and a paragraph at the clause when it
carries two verdicts. Each part gets one bin.

| Bin | What it is | Where it goes |
|---|---|---|
| `RULE` | what every run must do, with its reason in one line | stays |
| `DETAIL` | an instruction only some runs need — a command's flags, a list, a procedure for one kind of task | a detail doc behind a pointer |
| `NUMBER` | a value a decision turns on — the reading that set a threshold, the measurement that rejected an option | beside its rule, stripped of its date |
| `ROSTER` | a list or count the environment already answers | replaced by the command that derives it |
| `HISTORY` | a date, a correction of this document, an incident story, how something came to be | version control; the commit message if the story matters |

Ask in order; the first yes decides.

1. **Does one command answer it** — `ls`, `--help`, a config file? → `ROSTER`,
   written as that command.
2. **Does every run need it?** → `RULE`. Keep the reason as one line; the story
   that taught the reason is a separate part.
3. **Does some run need it?** → `DETAIL`.
4. **Would someone changing a threshold or reversing a decision need this
   value?** → `NUMBER`.
5. **Otherwise** → `HISTORY`.

**History is asked last**, because a wrong move costs a lookup and a wrong drop
costs a measurement nobody reconstructs.

**Extract before you drop.** An incident story usually carries a rule. Write the
rule out as its own part, then bin the story.

| Paragraph | Parts |
|---|---|
| *"main did not type-check for 69 hours across 68 commits, because a red in someone else's file read as not-mine"* | `RULE`: a type error is a fact about the tree whoever touched the file · `HISTORY`: the 69 hours |
| *"the same commit read 3.19 headless and 2.71 headed against a 3.0 floor"* | `NUMBER`: it is why no contrast floor is gated, and whoever re-adds one needs it |
| *"measured when the rule landed: 538 with `w/crlf` alone, 540 including `mixed`"* | `RULE`: count `mixed` too · `HISTORY`: the counts |
| *"this paragraph said `src-tauri/target/` until 2026-09-02"* | `HISTORY` |
| a written list of a script's group names | `ROSTER`: the script's `--only=?` |

Tense decides nothing. *"Do not reach for `cargo-sweep --time` here"* is a
`RULE`.

## 3. Show the table and stop

Report, in this order:

1. **Size** — lines and bytes, whole and per section.
2. **Per section** — bin counts.
3. **Every `HISTORY` part, quoted in one line.** This is what the maintainer
   signs off on; a count alone hides it.
4. **Every `DETAIL` destination** — an existing file, or a proposed new one
   named for the task branch that needs it.
5. **The pointer wording** for each destination.

Ask for approval and wait. Nothing is written before it.

## 4. Write

- **The document** keeps `RULE`, `NUMBER` and `ROSTER` commands, and one pointer
  per destination. A pointer names its trigger: *"Run X when you touched Y"*,
  *"Before committing, read Z"*. A pointer without a trigger is a file nobody
  opens.
- **Detail docs** get their `DETAIL` with its reasons and numbers, and no
  `HISTORY` either.
- **Phrase rules as the target behaviour.** Keep a prohibition only as a
  guardrail, paired with what to do instead.
- **A table beats prose** for command-to-trigger and bin-to-destination
  mappings.
- **History that explains the change** goes into its commit message.

## 5. Prove nothing was lost

Read the original from version control (`git show HEAD:<doc>`), not from memory.
List every `RULE`, `DETAIL` and `NUMBER` part as one line. Find each in the new
document or its destination and mark it `found: <file>`. A part with no home is
a defect in the cut: restore it before going on.

## 6. Repoint

Grep the repository for the old section names and fix every reference that
would now send a reader to a missing section — docs, messages in scripts and
tests. A vague mention in untouched source ("per CLAUDE.md") still resolves and
stays. Run the repository's document checks bare: link checkers, markdown lints,
anything that reads the files you moved.

## Done

The pass is done when the report shows the size before and after, every part
from step 5 is found, references resolve, and the checks are green. Commit by
the repository's own rules.

## Boundaries

- **`decant`** sorts source comments into the map; this sorts an agent document
  into itself and its detail docs.
- **`sweep`** asks whether a change made a surface wrong; this asks whether a
  paragraph earns its place in a document every run loads.
- **`writing-for-agents`** says how a document for agents should read; this
  applies it to one that already exists.
