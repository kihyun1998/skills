---
name: grill-map
disable-model-invocation: true
description: "Author a repo's MAP — a linked note graph that answers \"if I touch this, what else moves?\" and \"what is this code derived from?\". Not a taxonomy and not a doc index: territories may overlap (many-to-many), cross-cutting invariants are their own nodes, and a broken derivation chain (decision → design → code) is left visibly blank because the blanks are the output. Measures the repo before asking anything (public-surface count, record *subject* vs *mention*, file-size distribution, forward-looking doc comments vs closed issues), drafts the territory list from the system rather than from existing artifacts, then asks only the scope and what the reading itself raises — never a prescribed list. Writes plain-markdown notes that work as an Obsidian vault (graph view) and on GitHub. Standalone — no execution-half skill. Use when a repo has ADRs/issues/specs but no one can say what depends on what, when the same invariant keeps being rediscovered one site at a time, or when the user invokes /grill-map."
---

# grill-map — author a repo's MAP

A repo accumulates decisions (ADRs), specs, epics and issues, and still nobody
can answer the two questions that actually gate a change:

1. **Horizontal** — *"if I touch this, what else moves?"*
2. **Vertical** — *"what design is this code derived from, and what decision is that design derived
   from?"*

Neither is answerable from the existing artifacts, because each of them is
indexed by an **event** — the day a decision was made, the work that shipped,
the cluster that was re-litigated. None is indexed by the **territory**, and
none survives its event: an epic closes, an ADR is written once.

A MAP is the missing layer. It is a **dependency graph**, not a taxonomy.

## What a MAP is not

Three prohibitions. Each one is a trap this skill exists because someone fell
into it.

1. **Do not derive the rows from the existing artifacts.** If the territory list is derived by
   clustering the ADRs (or the epics, or the module tree), the map inherits that
   artifact's coverage. ADRs cover only what was *contested*; a module tree
   collapses a 5000-line god-file into one row. The territories come from the
   **system** — what it actually does — and artifacts are then *attached*.
2. **Do not build an exclusive partition.** The instinct is to give every fact exactly
   one home. That instinct destroys the most valuable facts: the ones that hold
   in three places at once are precisely the ones that get rediscovered three
   times. Overlap is the point. Many-to-many is the default, not the exception.
3. **Never decide to relocate a doc without knowing its consumers.** Before proposing that a doc
   move, merge, or shrink, find out who *consumes* it. A table that looks
   misfiled inside a process doc may be there because a runtime step reads it.

## Nodes

Only `.md` files inside the repo become graph nodes. Issues, tickets and source
files cannot — they live as *text inside* a note. Say so in the map rather than
pretending otherwise; the hottest things in a repo are often issues, and the
graph will not show them.

| Node | Authored by this skill? | Role |
|---|---|---|
| **Territory** | yes | An area of what the system *does*. Overlapping, non-exclusive. Holds addressable *parts* (section anchors) so work can be routed to "this part of this territory" |
| **Cross-cutting invariant** | yes | One fact that holds across N territories. **This is the node kind that carries the many-to-many** — without it, the fact gets forced into one territory and lost |
| **Existing artifact** | no — already exist | ADRs, specs, glossaries, process docs. Link *to* them; never edit them. Reverse direction is free (backlinks) |

Edges: **territory → territory** (change-blast: touching A means checking B) ·
**invariant → territory** (N:M) · **territory → artifact** (the governing decision)
· **territory → verified external fact** (what a reference implementation does).

That last edge is easy to miss, and its absence is not neutral. The vertical chain
is not `decision → design → code` but **`prior art → decision → design → code`**:
a decision record's own "named prior art" section says so. A map that stops at the
decision has cut the chain's top off, and the symptom is a territory note that
*paraphrases* what a reference does — a claim with no pin, indistinguishable from
a verified one and quietly wrong the moment upstream moves.

Do not define territory-to-territory edges as *code* dependencies. Call-graph
edges miss the expensive case entirely — two territories with no call between
them that share a storage assumption. Those become an invariant node instead, which is
also how the graph survives Obsidian drawing no edge labels: the *reason* for
the dependency is readable as a node rather than needing a label.

## Reading protocol — bind this first, or the map is write-only

A map that is only *updated* is pure cost. The update obligation lands naturally
(it looks like a docs chore); the **read** obligation does not land unless
something is rewired to require it. Decide both before writing a single note.

**Read before the work, write after it.** If the consuming discipline has phases,
the read binds to an *early* one — before the design is committed — and the write
to a late one. Binding only the late phase is the common failure and it inverts
the artifact's purpose.

**The strongest binding is not a new rule — it is deleting the copy.** Look for
where the consuming discipline already hand-lists what the map now holds: a
"check these siblings too" list in a review step, a set of related files named in
a checklist, an area roster in a process doc. Replace that list with a link to
the map node. Then the map is not *also* consulted; it is the **only** place the
answer exists, and no obligation has to be remembered. Adding a rule competes with
a copy; removing the copy does not.

State, in the binding, what the reader is expected to *do* with each section —
`## Blast radius` is a checklist, `## Governing decisions` answers "why", a blank
one is itself the answer.

## Process

### 1. Measure — before asking anything

Never open the interrogation with a question the repo can answer. Run all four;
each one has flipped a map design in practice.

- **M1 — count the public surface.** Count the public API (`pub fn`, exported symbols) and
  count how many of those promises have a governing record. The ratio is usually
  shocking and it re-orders everything.
- **M2 — records that *mention* vs records that are *about*.** For each candidate territory, grep the
  decision records twice: once over titles, once over bodies. *Mentioned in 19
  records and the subject of none* is the worst state there is — it greps as
  covered.
- **M3 — file-size distribution.** A file holding >30% of a layer is not one territory;
  it is several that were never named. It marks where the map must go finer than
  the code does.
- **M4 — forward-looking prose vs closed issues.** Grep for promises — *"lands in
  #N" / "will land" / "not yet" / "planned" / "open question" / "tracked in #N" /
  "carried over"* — and check whether `#N` closed. Each hit is a live vertical
  hole, usually on a published surface. **Grep the specs and the prose, not only
  the code**, and **judge the sweep by what it cannot see, never by its hit
  count**: a low count means the pattern is clean *or* the pattern is narrow, and
  the number cannot tell you which. Measured — a first pass restricted to
  doc-comments and the phrase *"lands in"* returned exactly one hit, which read as
  reassurance, while two worse instances sat outside it on both axes: in a spec
  file, phrased *"tracked in"*. Whenever a hit turns up, widen the pattern with
  the phrasing that produced it **before** fixing the hit.
  Rank what you find: a **stale prediction** outranks a stale pointer. One of
  those two described a design that was never built, so a reader planning work
  from it would have rebuilt a solved problem — a wrong pointer costs a lookup, a
  wrong prediction costs the work.

- **M5 — the open backlog, and any catalogue of what is *not built yet*.** Read the open issues and
  whatever the repo uses to record deliberate absence — a "hidden state" section, a compliance tail,
  a TODO register. **The code cannot contain this, and it is not a minor supplement.** Measured on
  the pilot: 48 issues cited across 27 finished notes, of which **46 were closed** — the map was a
  map of what had happened. Of 31 open issues it knew 2, and three of the ones it missed recorded
  *the same findings the notes had just made independently*. Separately, 72% of the repo's spec
  document was a catalogue of unimplemented behaviour, referenced by 2 notes out of 27.

  The tell that this input is missing: every `## Known holes` entry reads *"nothing is recorded"*
  and none reads *"this is not built"*. Those are different questions, and for a consumer the second
  is usually the urgent one.

  **Adding this input obliges you to fix its recording format, or it poisons the map.** A tracker
  entry is an *event* — it closes — and the map exists because every other layer is indexed by
  events. So there are two ways to cite one and only the first is safe:

  | citation | example | safe |
  |---|---|---|
  | **evidence** — reasoning that outlives the entry | *"five designs were built, measured and rejected; read it, the failures are the content"* | yes: still true after it closes |
  | **status** — what is true right now | *"#606: dispose cannot stop the loop"* | no: false the moment it lands |

  The test is one question — **would this sentence become false if the issue closed?** If yes,
  invert it: state the observation as the fact and demote the issue to a tracking pointer
  (*"`dispose` cannot reach the loop — it is not on the port. Tracked: #606"*). The first half then
  survives the close, and if the port changes, that is a code change the symbol sweep already sees.
  Measured: reading the backlog for the first time took one map's open-issue citations from 2 to 11
  in a single session, because the input was added and the format was not.

Also read the repo's identity/entry doc, its glossary, and its decision records
— enough to draft, not to conclude.

### 2. Draft the territories from the system

Write a candidate list of what the system *does*, in the maintainer's own
vocabulary. Cross-check the draft against M1–M3: any public promise, any
oversized file region, and any repeatedly-cited invariant must land in some
territory. Anything that lands in three is an *invariant* candidate, not a territory.

Expect the first draft to be wrong about the **axis**, not just the contents.
Re-measure rather than re-reason when it feels off.

**One concept, one note. Never merge two concepts into a note because they feel
related.** If two things have separate names, they get separate notes. What you
lose by merging is not tidiness — it is the ability to *point at one of them*: a
blast edge that says "depends on the serialization format but not on the snapshot
struct" cannot be written once those share a note, so every edge into the merged
note is drawn thicker than the truth, and a checklist that over-reports degrades
into "check everything".

**Instead of merging, add a layer.** A note whose job is to tie several concepts
together is legitimate and useful — it just has to be an **additional** node, not
a replacement:

```
detail note      one per concept. This is where the content lives
aggregate note   ties several together. Optional. Owns no detail of its own,
                 only the relationship — why these belong side by side
```

The pull toward merging is strong and it is self-confirming, so distrust it
specifically: **in a merged state there is always a reason to merge.** Two
concepts sharing a note appear to share a blast radius because nobody has ever
measured theirs separately. Measured — a note covering three things under one
name was split, and the three blast lists turned out to have almost no overlap;
before the split the single list read as evidence they belonged together.

A `&` in a territory name is the tell, and the *absence* of one is the trap: a
merge announced in the name gets reviewed, while a merge hidden under a singular
noun ("cursor" covering position, drawing pen and the reported caret) is never
noticed at all.

**The scope is the whole repository, and "where the commits are" is the wrong way
to prioritise it.** Ordering the backlog by commit frequency is tempting and
measurable, and it systematically misses an entire class: the areas that **never
change and break silently when touched**. Published artifacts, frozen
compatibility shims, generated packages, exclusion lists, release tracks. They
score zero on every activity metric and carry the highest cost of being wrong,
because nothing local fails — the failure appears to a stranger.

Measured: the pilot repo had a tombstone crate publishing under an old package
name, fourteen lines, frozen at a version it must never leave, deliberately
outside the build workspace so no gate touches it. Zero commits since it was
created. A priority order built from commit distribution had it dead last, and it
was one of the two most valuable notes written.

**These are found by reading, not by asking.** Members excluded from the build
workspace, packages published under a name the tree no longer uses, generated or
vendored directories, exclusion lists, release tracks, any path whose only commit
is the one that created it — the tombstone crate above answers to three of those.
The question this step used to carry (*"what is in here that nobody touches?"*)
was asked on the stated ground that no measurement finds them, and the case it
cites disproves it. Ask about what the sweep turned up; never for the list itself.

Infrastructure is a territory like any other. Release tracks, CI gates, supply
chain, published READMEs — the map's definition is "an area of what the system
does", and shipping is something the system does.

### 3. Ask — the scope, and then only what the reading raises

Two kinds of question, and nothing else.

**① What to map.** The scope and the axis: which areas this pass covers, and
whether the territory draft carves the system the way the maintainer carves it.
Asked once, before writing, with the tool that renders a question
(`AskUserQuestion` where the harness has one). Recommend an answer and **give the
reason that would make it wrong** — a recommendation with no falsifier is not one.

It is safe to ask because it is not a claim. Naming and granularity are product
judgement: they can be disagreed with, but they cannot be *false*, so a wrong
answer gets corrected rather than believed. Everything below is a claim about the
system, which is a different thing entirely.

**② Whatever the reading raises, at the moment it raises it.** Reading the code,
the records and the backlog produces questions that already have a subject in hand
— *"these two sites look like they share the scroll-offset assumption; do they?"*
Ask those freely; there is no budget on them, and a wrong answer to one is caught
by the thing it is about.

**Never carry a list of questions to be asked regardless of what was found.** This
step used to hold six, and four had no subject: they fired whether or not the repo
had one. **A question with no subject manufactures its answer** — the maintainer
supplies something plausible, because a plausible answer is what a question asks
for; nothing in the repo contradicts it; and it lands in a note that reads exactly
like a verified fact. Then it rots, and no gate can find it, because there is no
original to compare it against.

The four are named so the removal is not re-litigated:

| what it asked for | why it was not a question |
|---|---|
| where the same bug was fixed more than once | a **lead**, not a fact. Where the reading found the sites, ask about *those*; where it did not, the map does not get the note. An invariant whose discovery history cannot be filled with citations is a claim nobody can check |
| what to check after changing each territory | pure claim, N of them, and the reader cannot tell a remembered edge from a measured one |
| which areas are undecided | already measured — no governing record is a grep, and §4's `**None.**` sentinel *is* that answer |
| the doc-language and link convention | the language is a fact in the repo's identity doc, and the link syntax is not a choice at all (§4: a repo read in Obsidian and on GitHub has exactly one option) |

**What is left is one line: a human answer is a lead, never a record.** It sends
you somewhere to look; what gets written is what you found there, carrying the
citation that lets a reader repeat the check. If the lead resolves to nothing,
nothing is written — an absent note is honest, and an unverifiable one is the
failure this whole layer exists to prevent.

### 4. Write

One note per territory, one per cross-cutting invariant, one hub note as the entry
point, linked from the repo's identity doc (`CLAUDE.md` / `AGENTS.md` / README).

**Verify each note as you finish it, not the batch at the end.** This is slower
per note and much cheaper overall, because every defect found late has already
been copied into the notes written after it. Measured: 27 notes were written and
verified once at the end, and the four defects that pass found were **all one
class** — values another artifact owns, copied where nothing gates them — spread
across notes written hours apart. Checking after the third would have ended the
class there.

The cadence only survives if the check is **seconds, not minutes**, so make it a
script that accepts one file before you need it. What is worth scripting, in the
order it pays off: every symbol named under `## Code` resolves · every link and `#anchor`
resolves · the section set is complete · nothing restates a value another artifact
owns (a record's status, a count, an issue's state).

**Link syntax: plain markdown relative links** (`[text](../adr/0025-x.md)`), not
`[[wikilinks]]`. Obsidian's graph view resolves both; GitHub renders only the
former. A repo read in both places has exactly one option.

**Section names are a per-repo language choice, but they must be *identical*
across every note.** Follow whatever the repo's doc-language rule says — and
surface the rule rather than assuming it, since a map is read by an agent at the
start of every task, which is usually the same rationale that put the glossary in
English. Whichever is chosen, the headings below become exact strings that the
hub's coverage commands grep for; one note spelling a heading differently is a
node that silently drops out of every count.

**Never delete an empty section.** A governing-decisions heading with nothing
under it *is* the finding. A note with three blank sections is doing its job.

**Any list of sites — derive what a tool can see, hand-write only what it cannot,
and label which is which.** The first half of that rule is the easy one and it is
the one that pays off immediately: a list of call sites, affected files or member
nodes goes stale silently, so carry the command that produces it instead of the
answer.

The second half is what stops the rule from eating the map. **Some facts are
invisible to every tool that could check them**, and those are the ones worth the
most, because nothing else will ever recover them. Measured case: an invariant
about buffer indexing held at six sites — four called the helper and were
greppable, while two satisfied it by *arguing in a comment* that the helper was
unnecessary there. No grep for the helper's name can surface those two, and they
are simultaneously the hardest to rediscover and the easiest to misread as a
missing call and "fix" into a redundant one.

So a note that carries both writes them as two labelled halves, and says of the
hand-written half that no automation replaces it. Without the labels the reader
cannot tell a deliberate hand-maintained entry from a stale one — and a confident
"stop hand-maintaining lists" heading over a section that hand-maintains two
entries on purpose is not a contradiction a reader will resolve in your favour:
in the case above a skilled one read it as "replace all of this with the grep",
which would have deleted exactly the irreplaceable half.

#### Territory note

```markdown
# <territory>

## What it is
One paragraph: what this area is responsible for in the system.

## Governing decisions
→ links to decision records. When nothing governs it, write one **fixed
sentinel** (`**None.**`) rather than leaving whitespace or omitting the heading —
a sentinel is greppable, so the hub can *ask* for the list of holes instead of
storing one. Then say what sits adjacent and why it does not govern: "this ADR
decides delivery, not the model" is the distinction that keeps someone from
concluding the area is covered.

**The same sentinel appears under more than one heading, so every query for it
must name its section.** More than one section here can be empty, and "nobody
decided" is a different hole from "nobody checked against a reference" — a bare
`rg '\*\*None\.\*\*'` conflates them and will report an area with four governing
records as ungoverned. Measured: it did, for days, in the hub of the pilot map.

## Design model
The invariants and rules. Blank = code with no design above it. When the section
is populated only by reading the source, say so — that fact is the territory's
status, not a footnote.

## Code
Symbol names, by file. Text, not links — source files are not graph nodes.
**Never line numbers**: a line number is an ungated copy of something the
compiler owns, and it is stale on the next edit. `file.rs — Type::method` is
greppable and survives; `file.rs:1591` is the same mistake as a prose copy of
an API list.

**A territory can have no code, and that is a state rather than an error.** A
design that is recorded and not built takes the same sentinel — write `**None.**`
and then say what does not exist and where a first slice would start. Give the
symbol check a way to stand down for it, or the note cannot name the thing it is
about.

The three sentinels then read as a set, and they are three different failures:
*nobody decided* (no governing record) · *nobody checked* (no reference
comparison) · *nobody built it* (no code). The third is the one a code-first pass
structurally cannot find — there is nothing to read — so it will be missing until
something other than the code is an input. It also has **no blast radius**, so it
appears in no other note's checklist and is reachable only from the hub.

## Reference behaviour
→ links into the repo's verified external-fact store, **anchored to the specific
entry**, one line each saying what it settles for this territory. Blank = this
area has never been compared to a reference.

**Link, never restate.** These facts carry their value in a pin — a `file:line`
at a recorded SHA — and a restatement drops the pin, leaving a prose claim that
reads identically and cannot be checked. That is the one place in a map note
where copying is not merely redundant but *destructive*.

## Cross-cutting invariants
→ links to invariant notes.

## Blast radius
→ links to territories to check after changing this one. Name the *reason* per
link; a bare list degrades into "check everything".

## Known holes / open
```

#### Aggregate note

Optional, and only where several concepts genuinely belong side by side. **It owns no detail** — if
a fact would be equally at home in one of the members, it goes there instead. Introducing this node
kind without a template is how the merged notes got written in the first place.

```markdown
# Aggregate — <the shared name>

**This note owns no detail.** <one line: what kind of relationship this is>

| Concept | Note |
|---|---|
| <one line each — enough to route, not to explain> | [<name>](<file>.md) |

## Why they sit together
The relationship, stated as narrowly as it actually holds. "They are both about X" is not a
relationship; "A reads B's state under one condition, and B knows nothing about A" is.

## <the one thing only this note can say>
```

The last section is the whole point and it differs per aggregate — a shared precondition, a
historical mistake the split fixed, an asymmetry visible only from above. If nothing goes there, the
aggregate is a table of contents and the graph is better off without it.

**Name the members by concept, not by file.** An aggregate whose members are "the things in this
directory" is a folder listing; one whose members are "the three things this word means" is a node.

**Aggregates break reciprocity checks, by design.** They carry no cross-cutting section, so anything
pointing an invariant at an aggregate is pointing at the wrong granularity — the fix is to retarget
at the member that actually holds it, and a reciprocity gate will say so.

#### Hub note

The entry point. It holds the *reading protocol*, the conventions, and the
measured findings — and **no roster**.

A hand-copied index of "which nodes exist **and what governs each**" is the single
most tempting thing to put here and the one thing that must not be: it restates
what the note files already say, nothing gates it, and it goes stale within days.
This is not hypothetical — it is the failure mode that produced the map in the
first place.

**The distinction is links vs columns.** Bare links to the nodes are fine and
should stay: they keep the hub connected in graph view (a hub with no outgoing
links is an orphan), they duplicate only filenames, and a link checker catches
them when they break. The **columns** — what governs each, how many territories,
how many rediscoveries — are the roster. Drop those and carry the **command that
answers the question** instead:

```sh
# scope every sentinel query to its heading — the same sentinel marks several
rg -lU '## Governing decisions\r?\n\r?\n\*\*None\.\*\*' territory/
rg -lU '## Reference behaviour\r?\n\r?\n\*\*None\.\*\*'  territory/
ls territory/ invariant/             # what exists; the folder is the roster
```

**A command in place of a stored answer is only better if it answers the question
it claims to.** The first version of the first query above was unscoped, matched
the sentinel wherever it appeared, and reported a territory carrying four
governing records as having none — a wrong answer delivered with a command's
authority, which is worse than a stale list because nobody re-checks a command.

The hub is the one place where this comes out cleanly, because everything it
would list *is* derivable — the folder is the roster. Elsewhere it does not:
see the labelled-halves rule in §4, and do not carry the hub's phrasing into a
note whose list has entries no tool can see.

What the hub *should* hold, because none of it exists in any node file:

- the two questions the map answers, and what to open for each
- the concrete failure that justifies the layer (name the rediscovery, with issue
  numbers and the count)
- the conventions (empty sections stay; territories overlap; symbols not line
  numbers; link syntax)
- **what the map cannot answer** — the node-kind limits, stated plainly
- **aggregate measurements** from M1–M4 (*"N public promises, one governed"*).
  These are *not* restatement: they exist in no node file, and they are the
  headline finding
- current coverage as an honest scope statement (pilot vs complete), not a list —
  **and the rule that decides what an absent note MEANS**, which is the half a
  scope statement does not supply. A reader arrives holding a change, not a
  survey, and the question is *"there is no note for what I am touching — is that
  a gap or a correct state?"* State the condition under which absence is correct
  (the area is only a plan; its roster is the tracker) and **what makes a note
  owed** (a concrete trigger — "a territory appears when the first slice lands"),
  so an absent note is not read as a backlog item by default. Measured across the
  two maps built from this skill: both filled the scope slot, only one wrote the
  trigger, and the one without it left every reader to re-derive the judgement.

  **Say so even when the honest answer is "we do not know yet."** A hub that omits
  this reads as though absence had been considered, which is worse than a hub that
  says it has not been.
- **the build stamp** — the `grill-map` revision that wrote this map, as a commit
  SHA of the skills repository, on one line:

  ```markdown
  <!-- grill-map build stamp: 46099d8 -->
  ```

  It looks like the stored fact this section spends its length forbidding and is
  the opposite of one. **A roster is forbidden because it is derivable** — the
  folder *is* the roster, so a copy of it can only rot. Nothing in a consuming
  repository derives which revision of the skill wrote its map, so without this
  line the answer does not exist anywhere, which is the same test the two
  questions, the concrete failure and the M1–M4 measurements already pass.

  What reads it is a question this skill does not answer: a consumer can resolve
  `~/.claude/skills/grill-map` to a checkout and ask `git log <stamp>..HEAD` what
  has changed since — which is what `thegraph` builds do — but nothing ships that
  reader for a map. Write the stamp regardless. It costs one line and it is the
  input; a reader with no input has nothing to be built against.

  **A behind stamp is a question, not a defect.** The revision moves for a
  reworded rule as readily as for a new slot, so it never on its own means the
  map is wrong.

#### Cross-cutting invariant note

```markdown
# <invariant>

## The fact
Stated once, in the form that makes it checkable.

## Why it is cross-cutting
The shared assumption (storage layout, coordinate space, lifecycle) that makes it
hold in more than one place. Say explicitly whether the sites call each other —
when they do not, that is *why* no territory-to-territory edge could have carried
this, which is the node kind's whole justification.

## Territories it holds in
→ territory links, naming the site in each.

## What a violation looks like
The symptom, so the next occurrence is recognised instead of re-derived. If it
only reproduces under a condition, say the condition — a conditional repro is
usually why it was found more than once rather than fixed once.

## Discovery history
Where it was found, one line each, with issue numbers and a count. **This section
is the argument for the node's existence**; a candidate that cannot fill it is
probably a design-model line inside one territory, not an invariant.

## Where it will recur
The test a future author can run — "if a function does X, it is subject to this".
Without this the note explains the past and prevents nothing.
```

### 5. Verify — the completion test

Not "does it look right". Pick a fact this repo **rediscovered at least twice** —
M2 surfaces these, and so does any invariant note whose discovery history could be
filled with citations. Then ask:

> **Had this map existed then, would the second discovery have been prevented?**

Walk it literally: open the hub, land on the territory the first fix touched,
and see whether the second site is reachable in one hop. If it is not, the map
is decorative — usually because the shared fact was buried in a territory note
instead of promoted to an invariant node. Fix that and re-run the test.

#### A young repo has no such history — predict forward instead

That test needs a rediscovery, and a new repo has none. Do not skip verification
on that basis: a map with no acceptance test is the taste document this skill
exists to avoid. Run the same measurement against the future:

> Before starting a change, write down — **from the map alone** — the territories
> you expect to touch. Afterwards, compare with what you actually touched.
> A **miss is a missing blast edge**; an extra is over-connection.

**Score it by recall, not precision.** The blast list is a *checklist*: opening a
territory and finding nothing to do there is a correct outcome, while a territory
you never opened is the failure the map exists to prevent.

**Two preconditions, and both were learned by violating them.** Without these the
test measures something other than the map and reports the map's fault for it:

- **The change must alter behaviour.** A pure move or rename has doc impact by
  *symbol mention*, not by behavioural coupling — the notes that need editing are
  the ones naming the symbols, which the blast radius neither knows nor should.
  Measured: a module-extraction slice required an edit to a territory whose blast
  list correctly does not mention the moved-from territory, and reading that as a
  missing edge was wrong. For this shape use the **symbol sweep** in §Update mode.
- **The change must land inside the mapped area.** A change entirely in an
  unmapped layer cannot be predicted at all. That is an absent node, not a wrong
  edge, and it is recorded as a coverage gap.

**What it found on its first qualifying run**, offered as the shape of a real
result: a bug fix entering at one territory turned out to touch a symbol governed
by an invariant note — and that territory did not list the invariant, although the
invariant listed the territory. A one-way edge, invisible from the entry point.
Its general form is mechanical, so it belongs in the gate rather than in this
test — see reciprocity under **The one gate worth writing**.

## Maintenance

A map with no gate becomes the artifact it replaced. Bind it to whatever
per-change discipline the repo already has (a docs-surface sweep step, a PR
checklist). Two obligations, and **the second is the one that makes the map
preventive rather than archival**:

1. **Coverage** — is the territory this change touched in the map, and is its
   blast-radius list still right?
2. **Promotion** — *is the fact this fix revealed also true outside this
   territory?* If yes, the fix does not land until an invariant note exists for it.

Obligation 2 exists because of how these facts are actually found: the *first*
site to hit one is where it is discovered, and at that moment no node for it
exists. A map that only records invariants after the third rediscovery is the
same post-hoc archive as the helper function someone eventually extracts — and a
helper prevents nothing, because the next author writing a *new* site never
looks for it. Ask obligation 2 at the first fix, when the answer is cheapest and
the evidence is in front of you.

State the promotion test concretely in the binding, in the repo's own terms:
*"does this hold at any site that shares <the storage assumption>?"* — a
question the author can answer by grep, not by judgement.

Coverage is a *report*, not a constraint — a territory with no governing record
is a valid entry, and the count of such entries is the number worth watching.

### The one gate worth writing: do the links resolve

A map is a link graph, so the check that earns its keep is whether the edges
still land — and it has to cover **`#section-anchors`, not just files**. The two
fail differently and only one is loud. A missing file 404s on the host and
underlines in an editor; a missing anchor **silently** falls back to the top of
the target document, so a link that used to land on one verified row starts
pointing at a whole file and the reader never learns they were misrouted. Anchors
are also the volatile half: headings that embed issue numbers or verification
dates get rewritten by routine maintenance, breaking links in files nobody
touched.

Two failure modes to design against, both of which showed up while writing that
gate for the first time:

- **Verify the checker in every direction, not just the failing one.** One split
  headings on `\n` instead of `/\r?\n/`, matched **zero** headings on a CRLF
  checkout, and reported all eleven valid anchor links as broken — output
  indistinguishable from a genuine defect, after which eleven correct links get
  "fixed". A gate is not verified until it has been shown to **pass** on
  known-good input, **fail** on each defect kind, and **ignore** what it should
  ignore.
- **A tool that checks documentation must skip code spans and fenced blocks.**
  Documentation about links contains link-shaped text — the same gate reported a
  `` `[x](../SOMEFILE.md)` `` quoted inside a doc *about* relative links as a real
  find. Blank those regions out before extracting (replace with spaces so
  offsets, and therefore line numbers, survive).

False positives are the failure mode to design against here specifically, not a
nuisance. A gate people learn to ignore is not a gate — and for one whose entire
purpose is catching a defect that is otherwise silent, being ignored returns that
defect to the state it was in before the gate existed.

**Expect the first run to be mostly wrong, and treat that as normal rather than as
bad luck.** All four checkers written during the pilot reported ~90% false
positives on their first run — a schema applied to the wrong note kind, bare
sibling filenames resolved against the repo root, a Rust-shaped pattern meeting
TypeScript, alongside the two above.

The cause is structural, not carelessness: **the documents are written to be read
by people** — abbreviated paths, quoted counter-examples, per-kind formats — and a
checker assumes mechanical regularity. That gap *is* the false-positive rate. So
never act on a first output; run the passing direction in the same session, and
when a real finding does survive, prefer fixing the *document* to loosening the
check — a name under `## Code` should be one you can grep, and that rule is worth
more than the one exception that provoked it.

**And check what the gate's idea of "everything" actually is.** A gate takes a
scope — a root list, a workspace, a glob — and reports success over *that*, not
over the repository. When the two drift apart it passes having inspected nothing,
which is the one failure mode indistinguishable from a clean run. The pilot repo
had this twice over: three crates excluded from its build workspace meant
`fmt --all` visited zero files in one of them and exited 0 for thirteen slices,
and the link gate written to fix a documentation problem takes a **hand-written**
list of roots, so a new docs directory is invisible to it until someone
remembers. Write the scope down next to the gate, and re-derive it against `ls`
rather than against intent.

**Add reciprocity to the same gate — it is three lines of the same parse and it
catches a class links alone cannot.** Every territory an invariant note claims
must claim it back under its own cross-cutting section. This is not symmetry for
its own sake: the reading protocol sends a reader to their territory and tells
them to follow that section as a checklist, so an invariant the territory omits is
invisible at the exact moment it is needed. A vault's backlink panel does not
cover it — that is a different surface, absent on the web host, and not the
section the reader was told to read. On its first run it found one missing edge —
the one §5's forward test turned up, not a second confirmation.

## Update mode — what decays, and the sweep that finds it

A folder holding only `grill-the-graph`'s hub stub, or notes written by hand
outside this format, is a first run: build it, and fold the hand-written notes in
as leads.

Re-running this skill from scratch on an existing map is almost always wrong. A
map does not rot uniformly, and the parts that rot are **mechanically
checkable**, so an update is a *sweep*, not a re-interview.

**Measured on a real refactor** (a 336-line extraction pulling a module's
buffer-walk primitives into their own file, against a map naming 36 symbols
across 8 notes):

| Layer of the map | Survived |
|---|---|
| Symbol names in `## Code` | **36 / 36** |
| Design-model prose, invariants, blast edges | **unchanged** — the refactor moved code, it did not change rules |
| **File attribution** | **3 wrong** — the moved symbols |

So the decay was 8%, all of it *addresses*, none of it *claims*. Two rules fall
out and both are load-bearing:

- **The sweep is a symbol-existence check.** Extract the symbols named under
  `## Code`, locate each in the tree, and classify: same file (fine), different
  file (fix the address), **not found** (this one is not an address problem — a
  symbol that no longer exists means the design model above it may also be gone,
  so re-read that note's `## Design model` before editing the address).
- **This is the return on banning line numbers.** In the same refactor the
  containing file lost a third of its lines; every line-number reference below
  the extraction point would have been wrong — roughly 85% instead of 8%, and
  wrong *silently*, since a stale line number still points at real code.

Run the sweep when a commit is refactor-shaped (files split, symbols moved,
modules extracted). It costs seconds, so run it on any doubt rather than
budgeting it.

**Re-grill only when a territory's *answers* changed** — a new area appeared, a
blast edge is now wrong, a governing record landed where there was a blank. That
is a conversation; the sweep above is not.

### The check no gate can do: read the same fact in two notes

Every mechanical check verifies a note against the *code*. Nothing verifies a note
against **another note**, and once a map is large enough for a fact to appear
twice, that is where the remaining defects live. Do this periodically, by hand:
list the facts that appear in more than one note — shared constants, enumerations,
named rules — and read each set together.

**The pattern that survives is one owner and pointers.** One note carries the
enumeration; the others say *"I am one of them"* and link. That is what stops N
divergent lists, and it is worth enforcing on sight, because the failure it
prevents is invisible from inside any single note.

**Two lists with the same length beside each other is the smell.** Measured: a
note paired *"three kinds of event that move this coordinate"* with *three
functions*, and the correspondence was false — one function handled a case the
three kinds did not name, and one kind's handler was not among the three. The
counts matched, so nobody looked. Every symbol resolved and every link worked, so
every gate passed; the note even contradicted itself four paragraphs later and
that passed too.

When you find one, ask what the hidden entry *was*, because it is usually the
sharpest fact in the territory. Here it was a scroll that moves no content and
evicts nothing, yet changes every absolute index below a margin — the exact
counter-case to the invariant stated two lines above it.

**And check the reverse direction while you are there.** A refactor that gives a
shared primitive its own home often *restates* an invariant at the new site (a
module doc, a comment). That is the map's fact acquiring an Nth copy — read the
new statement, fold anything sharper into the invariant note, and treat the
recurrence as evidence the fact still has no single home rather than as
redundancy to leave alone.

## Scope

Writes map notes and the hub only. Never edits decision records, specs, or
source. If an existing artifact looks wrong, say so and stop — prohibition 3
applies to the map's own author first.
