---
name: checkup
disable-model-invocation: true
description: "Check whether a repo's written agent artifacts are still true and still current — the maps `grill-map` wrote, the bindings `grill-the-flow` wrote, the graph `grill-the-graph` wrote. Three tiers, separated because their costs differ by orders of magnitude and bundling them means the expensive one gets skipped: **mechanical** (links and `#anchors` resolve, every symbol named under `## Code` lives in the file its own bullet names, reciprocity in both directions, a repo path cited from a source comment still exists) runs as a config-driven script in seconds and belongs in CI; **schema** reads the owning skill's own \"what the build must supply\" section and reports slots that are empty rather than answered `none`, plus whether the build stamp is behind; **semantic** is the check no gate can do — the same fact stated in two notes, read together. Reports and stops: it never edits a note, never rebuilds a build, and never files anything, because every one of those is a write the maintainer owns. Holds no repo knowledge — path roots, source globs and the section set are configuration, since every false-positive run this has ever had was a root-convention mismatch rather than a defect. Use when a map or a build doc may have drifted, before trusting one for a change, after a refactor moves symbols, or when the user invokes /checkup."
---

# checkup — is the written artifact still true, and still current?

> **Retired — no longer installed.** This skill lives under `retired/` and the
> install scripts do not link it, so `/checkup` does not resolve. Its one part
> that ever ran is promoted to [`scripts/map/check_map.py`](../../scripts/map/),
> which is where it was actually used — vendored into a repo's CI, never invoked
> through this skill. See [ADR-0033](../../docs/adr/0033-checkup-retires-and-its-script-is-promoted.md).
>
> The schema and stamp tiers below are covered elsewhere now: `grill-the-graph`
> re-reads `build_gaps` as its own drift detector, and the stamp tier's rule —
> a behind stamp with no missing slot is informational rather than stale, and
> there is no second stamp — was written **here** and had no other home, so it
> is promoted to
> [ADR-0041](../../docs/adr/0041-a-behind-stamp-with-no-missing-slot-is-informational.md).
> The text below is its origin, not its home.

Three skills write durable artifacts into a repo: `grill-map` (map notes and a
hub), `grill-the-flow` (`docs/agents/theflow.md`), `grill-the-graph`
(`docs/agents/thegraph.md` plus generated agents and scripts). Each is authored
once and then read for months.

Two questions get asked about them later, and neither had a cheap way to be
answered:

1. **Is it still true?** Do its links land, do its symbols still exist where it
   says, is every slot its schema names actually filled?
2. **Is it current?** Which revision of the skill wrote it, and has the skill
   moved since?

The check apparatus mostly existed — inside `grill-map`, as prose. But its entry
point is an authoring interview, and **nobody starts an interview to ask whether
their map is still fine.** This is the missing verb.

## What this is not

- **Not an authoring pass.** It never writes a note, never rebuilds a build,
  never opens a question. If something is wrong, it says so and stops.
- **Not a re-grill.** A map does not rot uniformly. The parts that rot are
  mechanically checkable, so this is a sweep. Re-grilling is for when a
  territory's *answers* changed, which is a conversation.
- **Not a style checker.** Every rule here fires on a claim that is false, not on
  one that is ugly.

## The three tiers, and why they are named separately

Their costs differ by orders of magnitude. A single undifferentiated "check"
means the cheap ones run and the expensive one quietly never does — and the
expensive one is where the remaining defects live.

| Tier | Cost | Runs as |
|---|---|---|
| **Mechanical** | seconds | `scripts/check_map.py`, in CI and on any doubt |
| **Schema** | one read of the artifact plus one of the owning skill | this skill |
| **Semantic** | a model reading two notes together | this skill, asked for explicitly |

**Measured, on why the third cannot be folded into the first two:** a note paired
*"three kinds of event that move this coordinate"* with *three functions*, and the
correspondence was false — one function handled a case the three kinds did not
name, and one kind's handler was not among the three. **The counts matched, so
nobody looked.** Every symbol resolved, every link worked, every mechanical gate
passed; the note contradicted itself four paragraphs later and that passed too.

---

## Process

### 1. Find what was written, and by which skill

Look for `docs/map/`, `docs/agents/theflow.md`, `docs/agents/thegraph.md`. Say
which exist. **An artifact that does not exist is not a finding** — a repo may
legitimately have a map and no graph.

Read each one's **build stamp** if it has one, and hold it for step 4.

### 2. Mechanical — run the script, do not write a new one

    python3 <skill>/scripts/check_map.py            # every note
    python3 <skill>/scripts/check_map.py --selftest # verify the gate itself
    python3 <skill>/scripts/check_map.py docs/map/territory/x.md   # one note

It needs `.checkup.json` at the repo root. If there is none, derive one from
`checkup.example.json` — read the repo's layout and the map's own `## Code`
bullets to fill `path_roots`, `source_globs` and the section set, then **show it
to the maintainer before writing it**, because a wrong root turns a correct map
into a wall of red.

**Never hand-write a replacement checker.** Three separate attempts to
re-implement this from scratch in one session each produced a false-positive run
on its first execution, and all three failed the same way: **a path-root
convention the port did not know.** One reported 0 of 286 symbols as resolving,
because the notes address crates as `pkg-pdu/src/x.rs` while the tree has a
`crates/` prefix. Run against real data only, that output is indistinguishable
from catastrophe. `grill-map` carries a commit titled exactly this — *"why a new
checker is wrong on its first run"*.

**A run that inspected nothing is not a pass.** The script fails rather than
prints `ok` when a configured scan matched zero files, because that is the one
outcome indistinguishable from clean. It found this in its own fixture: the test
crate was named `pkg`, which the default `skip_dirs` blanks as a wasm-pack output
directory, so the comment scan silently examined no files and reported success.

**Do not "fix" the first failures you see. Adjudicate them one at a time.** For
each, open the note and the code and decide whether the note is wrong or the
config is. On a real map the second is more common on the first run.

### 3. Schema — read the owning skill's own list

**The schema is not written here.** Read it from the skill that owns the
artifact, the same way `grill-the-flow` and `grill-the-graph` read theirs:

| Artifact | Its schema lives in |
|---|---|
| `docs/agents/thegraph.md` | `thegraph/BUILD_CONTRACT.md` § *What the build must supply* |
| `docs/agents/theflow.md` | `retired/theflow/SKILL.md` § *Bindings the skill expects* |
| `docs/map/**` | `grill-map/SKILL.md` — the note templates in § *Write* |

Then apply the rule those sections state: **a slot left empty is not finished; a
slot answered `none` is finished**, because an empty slot and an unasked question
look identical later. Report empty slots. Do not fill them.

### 4. Stamp — is the build behind?

Compare the artifact's stamp against the skill file's own last-touched revision.

**Compare against the file, not the repo.** A skills repo holds many skills, and
its HEAD moves when any of them does. An artifact built from `thegraph` is behind
only when `thegraph/SKILL.md` itself has moved. Getting this wrong reports a
current build as stale — it has already happened once, in an issue, using a
`grill-map` commit as evidence that a `thegraph` build was behind.

**If the stamp is a content hash rather than a revision, say so as a finding.**
Identifying one required guessing that the build machine's checkout used CRLF and
re-deriving the hash under that assumption, because no revision in the history
matched the recorded md5 directly. A stamp that cannot be compared to history
without knowing the consumer's line-ending config does not do the one job a stamp
has.

**Warn, never rebuild.** A rebuild writes agents and scripts, and those pass
through the maintainer the same way the build itself does.

The schema tier and the stamp tier check each other. When both fire on the same
artifact — a stamp two revisions behind, and exactly the slot those two revisions
added found missing — that agreement is the first evidence either mechanism
works. It happened on the first run of this skill's method.

**They can also disagree, and that outcome is the useful one.** A stamp is a
revision of the whole skill file, so it moves for any edit — a reworded rule, an
added war story, a method lifted out into a sibling skill. None of those changes
what a build must *answer*. So **a behind stamp is a question, and the schema tier
answers it**: every slot filled means the build is current in substance and the
skill moved underneath it without asking for anything new. Report that as
informational — *"stamped behind by N revisions; no slot missing"* — never as
stale, and never as a reason to rebuild. Only the agreement case is a finding.

**Do not ask for a second stamp to fix this.** A separate schema revision, bumped
only when a slot changes, looks like the clean answer and is not: it stores a fact
the schema tier already derives, so it rots the first time someone edits a slot
without bumping it, and it fails silently in the direction that under-reports.
The comparison is cheap and the derived answer cannot drift from the thing it is
derived from.

### 5. Semantic — the check no gate can do

Every mechanical check verifies a note against the **code**. Nothing verifies a
note against **another note**, and once a map is large enough for a fact to appear
twice, that is where the remaining defects are.

List the facts stated in more than one place — shared constants, enumerations,
named rules, and *the same claim in two sections of one note* — and read each set
together.

**The pattern that survives is one owner and pointers.** One note carries the
fact; the others say *"I am one of them"* and link.

**Two lists of the same length side by side is the smell.** So is a `## Code`
section describing behaviour that the same note's `## Design model` contradicts.

**Measured, first run:** a territory note's `## Code` described a constant as
*"the one the registry refuses to remove"*. The constant and the refusal had both
been deleted six days earlier — and the same note's `## Design model`, fifty lines
above, already said so correctly. Two copies of one fact, disagreeing, inside one
file. Every mechanical gate passed.

### 6. Report, and stop

One list, grouped by tier, each item naming the note, the claim, and what the
code actually says. Then stop.

**Offer the fix; do not make it.** A note is the maintainer's prose. When they
accept, apply the *"one owner and pointers"* shape rather than correcting the
second copy in place — a corrected copy is still a copy.

---

## Configuration is the whole portability story

`check_map.py` contains no repo knowledge. Everything specific lives in
`.checkup.json`: `path_roots`, `source_globs`, the note kinds and their section
sets, the reciprocity pair, the owned-value patterns.

That is not tidiness. **Every false-positive run this checker has ever had was a
configuration mismatch**, so the configuration is where the accuracy lives, and
putting it in the script would make the script wrong per repo rather than
adjustable per repo.

Two rules the script encodes because getting them wrong is silent:

- **Split on `\r?\n`, never `\n`.** On a CRLF checkout the naive split leaves
  `\r` on every line; `.` does not match it and `$` does not match before it, so
  the heading pattern matches **zero** headings, every anchor set comes back empty,
  and every correct link is reported broken. It did exactly that against eleven
  valid links.
- **Each space in a heading becomes one hyphen — runs are not collapsed.** A
  heading like `## Damage / dirty tracking` loses the slash and keeps both spaces
  around it, so its anchor is `damage--dirty-tracking`. And an inline code span in
  a heading **keeps its text** in the anchor, so it must not be blanked there even
  though it must be blanked before extracting links.

## Scope

Reads. Reports. Never edits a note, a build doc, a decision record or source.
Never files an issue. Never rebuilds. If an artifact looks wrong, say so and
stop — the prohibition applies to this skill's own author first.

## War-story index

Each rule above exists because it caught something real. The four that pay for
the rest:

- **A symbol at a path it had moved out of** passed a tree-wide check because the
  name still existed elsewhere. This is why the locality rule checks the bullet's
  *own* files, and it is the check one of the two source implementations lacked
  entirely — its tokenizer could not even extract the `Type::CONST` form, so the
  claim was never examined at all.
- **Four one-way edges that were not defects.** The reverse reciprocity direction —
  a territory naming an invariant the invariant does not name back — fired four
  times on its first run, and all four were correct notes. An invariant's own
  section is a roster of **sites**; a territory may name it as its *origin* (*"this
  territory is the source of that constraint rather than a site of it"*) or as
  context. One of the two rosters is even deliberately partial, deriving the
  mechanical half from a grep and hand-writing only what no grep can see. So the
  forward direction is load-bearing and the reverse is `both_ways`, opt-in. **The
  rule that survived a real map is the narrower one**, and it took adjudicating all
  four to find that out — which is step 2's instruction, applied to this skill's own
  output.
- **A gate that inspected nothing and printed `ok`** — see step 2.
- **A fact stated twice in one note, disagreeing for six days** — see step 5.
