# kihyun-skills

A personal collection of Claude Code skills. Each skill is one self-contained
unit of agent capability; this repo is their single source of truth.

## Language

**Skill**:
A self-contained unit of agent capability — a folder containing a `SKILL.md`,
symlinked into `~/.claude/skills` to become active.

**Description**:
The frontmatter field the model reads to decide whether to reach for a skill on
its own. Two parts and nothing else: one clause saying what the skill does, and
a **Use-when clause** saying when to reach for it. Why the skill works the way it
does belongs in the body. A user-invoked skill's description is never read for
selection, so it is written for the person browsing slash commands instead.

**Use-when clause**:
The part of a **Description** that says when the skill applies — the sentence
that begins *"Use when"* or *"Use before"*.
_Avoid_: Trigger (a retired term for a countable condition, below)

**Declared dependency**:
What a skill says it invokes, in a `requires:` key in its own `SKILL.md`
frontmatter. The authoritative answer to *"what does this skill call"*, because
the author is the only one who knows. The platform ignores the key — measured
against `claude plugin details`, a skill carrying an invented frontmatter key
loads and lists at the same token cost as one without, while broken frontmatter
loses its description from the listing — so it costs nothing at runtime and is
read only by the gate.
_Avoid_: import, manifest (this is five lines, not packaging)

**Dependency reference**:
Prose naming a skill — *"the `X` skill"*, *"the method is `X`'s"*, *"invokes
`X`"*. It must resolve, to this catalog or to a **Declared external**. Found by a
small set of phrasings rather than by every backticked token, because seven names
in this repo are simultaneously skills and `thegraph` nodes — and because a
phrasing matches a *claim of reference* rather than a word, so `git`, `grep` and
`head` never fire while a name that resolves to nothing still does.

Scanned in every live skill's markdown **and in this repo's own scripts and
hooks** — not in `retired/`, whose frozen prose instructs no one. A script's error message naming a skill is an
**instruction** a reader follows now, not a record of what was once true, so a
dead name there is simply wrong — measured: `check_map.py` told the reader to run
the retired `checkup` skill, and nothing could see it.

**It is not the same question as a Declared dependency, and neither replaces the
other.** A reference asks whether a *name* resolves, which is what catches a name
going stale. A declaration asks what is actually invoked. The gap between them is
the **boundary reference** — *"don't do a rearchitecture (that's
`improve-codebase-architecture`)"* — which names a skill in order to say it is
somebody else's job. It must resolve; it must **not** be declared, or `--resolve`
demands an install for something nothing calls.
_Avoid_: dependency (unqualified — say which of the two)

**Lineage reference**:
One skill's prose naming where it came from — *"inherited from `X`"*, *"successor
to `X`"*, *"reuses `X`"*. The target is often **retired**, which is correct and
not a defect; what a live document must do is *say* so in the same paragraph, or
the pointer reads as current. Kept apart from a **Dependency reference** because
the two fail differently: one demands the target exist, the other demands it be
labelled dead.
_Avoid_: dependency (the distinction is the point), citation

**Declared external**:
A skill this repo's prose depends on that is not in this catalog, written down in
`docs/agents/skill-dependencies.md` with its **namespace** (`user` — installed
under `~/.claude/skills`; `platform` — bundled with Claude Code, invocable, no
file on disk), the upstream it came from, and an **identity** phrase a rename
does not change. *"Not in this catalog"* is not an error and never was; an
*undeclared* name is.
_Avoid_: dependency manifest (this is one list of three rows, not packaging)

**AFK agent**:
An autonomous agent that picks up an issue labelled `ready-for-agent` and
implements it with no human present.
_Avoid_: bot, worker

**Acceptance Gate**:
A skill that reviews an AFK agent's finished output, issues a verdict with a
recommended next action, and — once the user approves — executes that action
on the issue tracker.
_Avoid_: review agent (collides with the `code-review` skill)

**Verdict**:
The Acceptance Gate's judgement of an AFK agent's output — one of **Pass**
(work accepted), **Rework** (the AFK agent missed something fixable),
**Respec** (the issue itself was underspecified), or **Escalate** (the work
needs a human).

### grill-code

> **Retired vocabulary** ([ADR-0058](docs/adr/0058-grill-code-is-retired.md)).
> The skill moved to `retired/` and is no longer installed. The terms below are
> kept because its three decision records still use them.

**Mode** (grill-code):
A selectable scan type that decides what `grill-code` hunts for. Four **defect**
modes — **security**, **common-component extraction**, **refactoring**,
**performance** — plus one non-defect **learning** mode that explains AI-written
code rather than faulting it. The user picks exactly one per session; the choice
changes both what the scan looks for and how its results are evaluated and scored
— each mode carries its own criteria.
_Avoid_: lens, type, filter

**Finding** (grill-code):
A single candidate issue a scan surfaces, before it is scored.
_Avoid_: issue, problem, hit

**Severity / Effort / Priority** (grill-code):
The scoring shape every defect mode shares. **Severity** (Critical / High /
Medium / Low) is how much the finding hurts if left unfixed; **Effort** (S / M /
L) is the cost to fix it; **Priority** is the rank derived from the two. The
non-defect **learning** mode does not use this shape — it scores each **Lesson**
on a single **Value** axis (Core / Notable / Nice-to-know) instead. The
*shape* is identical across the defect modes; the *criteria* for each rung are defined per
mode (security severity ≠ refactoring severity).

### thegraph / grill-the-graph

> **Former step names.** The four steps were `sounding`, `hew`, `plumb` and
> `docket` until they were renamed to [`read-it`](read-it/), [`make-it`](make-it/),
> [`check-it`](check-it/) and [`ask-it`](ask-it/). Nothing about them changed but
> the name — the old ones survive in decision-record bodies written before the
> rename, and this line is the only place that maps them.

> **Retired vocabulary** (ADR-0071). `thegraph` no longer has nodes, edges,
> decider labels or run state: the method is four skills in order plus the signals
> that interrupt it, and each skill holds its own conditions. The terms below are
> kept because a dozen decision records still use them and a reader of those needs
> them defined.
>
> **Node** — one unit of work in the graph, declaring what it read, what it wrote,
> who decided its exit, and whether it could be delegated. A repo's **Build** fixed
> which of them existed, so a project that published nothing had no downstream node
> rather than a step to remember to skip.
> **Edge** — the route from one node to the next, carrying a **guard**; one
> pointing backwards also carried a **bound**.
> **Decider label** — which of **code**, **AI** or **human** resolved a condition.
> The `code` ones were what a build extracted as scripts.
> **State** — what passed between nodes: an append-only local cache flushed to the
> issue at each node's exit. It existed because delegated nodes could not see the
> main thread's context.
> **Provenance** — the mark on an issue-contract entry saying whether a person
> decided it, it was read out of a spec, or its origin was unknown. Retired with
> `tickets`, its only producer (ADR-0069), and dropped from the contract itself in
> the rewrite.
> **Generated artifact** — a subagent or script a build compiled from its graph
> document. Nothing generates any (ADR-0070's commit and the rewrite around it);
> [`salvage`](salvage/) removes the ones older builds left behind.

**Catalog** (thegraph):
The `thegraph/` skill itself — the order its four steps run in, the signals that
interrupt that order, and the habits that hold throughout. **One file.** It calls
skills and holds no method of its own; everything it once carried as node
contracts, a state model and a build contract now lives in the skill that does
the work. Installed by symlinking the directory, so every repository reads the
*same* file rather than a copy. Its counterpart is the **Build**, which is per
repository.
_Avoid_: the skill, thegraph (ambiguous — the skill, the method, or the file)

**Build** (grill-the-graph):
One repo's answer to what a person already knows and no file in it states —
in practice the outside sources the project is built against, each marked what it
informs, how it is reached and whether it binds. Short enough to read whole.
**It grows by being appended to** when a run needs something nobody wrote down;
there is no rebuild and no stamp.
_Avoid_: bindings (the input format of the retired `theflow`, gone since
ADR-0067), config, compiled graph (there is no graph)

**Contributor mode** (grill-the-graph):
Setting a repository up for `thegraph` when its conventions are not the
maintainer's: the repository that receives the PRs is someone else's, and its own
guidance and merged PRs govern how code and comments are written. Setup commits
nothing there. The other case — the maintainer's own repository — has no name; it
is the default.
_Avoid_: fork mode (a fork is how the change travels, not what decides the mode),
read-only mode

**Issue contract** (thegraph):
What one **issue** is expected to supply before work starts, as against what a
**Build** supplies about the repository. The split is the scope of the answer: the
build answers what is true of this repo until someone changes their mind, the
contract answers what is true of this change until it merges. Six slots, read by
[`read-it`](read-it/) at the start and reported when it stops for confirmation.
**A ticket answering none of them is the ordinary case, not a defect** — the
method ran that way before the list existed. An answer is a starting point rather
than an authority: it saves looking the value up and settles nothing, and a later
step finding the code disagreeing follows the code.
_Avoid_: Build (the repo-scoped one), Brief (what `check-it` hands to `lens`),
spec (the upstream document a contract is transcribed *from*)

**Grade** (lens):
The disposition attached to each finding — `CONFIRMED`, `UNADJUDICATED`, `INERT`,
or `DELIBERATE`. A grade **routes** a finding; it does not discharge it. Owned by
`lens`; [`check-it`](check-it/) decides where each grade goes next, not what
the grades are.
_Avoid_: Verdict (the Acceptance Gate's term)

**Brief** (thegraph):
The three things [`check-it`](check-it/) assembles and hands to `lens` — this repo's
siblings, the reference implementations, and **what this project diverges from on
purpose**, read from the decision records where each divergence's own record
lives. None of the three is where `lens` would look, which is why assembling it
belongs to the caller while reading it belongs to the method. A fourth used to sit
here, a tie-breaker for what wins when prior art and this project disagree; it was
one sentence for a whole repository, which is either a truism or wrong case by
case, and it now lives as a habit with the records governing any clash they have
already settled.
_Avoid_: Build (the repo-scoped one)

**Anchor** (spine):
The issue holding a cluster's suspected shared root. Its body is a **hypothesis**,
not a finding — falsifying it is the more valuable of the two outcomes. Its roster
is the tracker's subtree, never a list in the body.
_Avoid_: Spine (the skill's own name — the anchor is
the *issue*, the spine is what a run knows about the cluster), Root (the claim the
anchor makes, which the anchor is not), **Map** (see below — an upstream skill
calls a parent issue with child tickets "the map", which is this thing under a
word this repo has already spent)

**MAP** (grill-map):
A repo's linked note graph, answering *"if I touch this, what else moves?"*
(horizontal) and *"what decision is this derived from?"* (vertical). A
**document**, never a tracker artifact. `grill-map` authors one; `thegraph`'s
[`read-it`](read-it/) **reads** one where the repo keeps one — which is the
only relation between the two, and why a repo that keeps no MAP has no `map`
read rather than a step to skip.
_Avoid_: index (a MAP is a dependency graph, not a list of docs), taxonomy
(territories overlap many-to-many on purpose), **Anchor** (that is an *issue*;
`read-it` draws exactly this line — *"the anchor is the issue
half of the context; a territory map holds the half a ticket structurally cannot
carry"*)

**Out** (byartifact):
One of the four dispositions a search returns — already owned, conflicts with,
shares a root, or nothing. **The conflict out cannot be found by a query**, so an
empty search has ruled out the first, not all four.
_Avoid_: Grade (a lens's term), Verdict (the
Acceptance Gate's)

**Column** (envelope):
One of the seven cells every candidate carries before it may be presented. A
fallback wording is an answer; a blank is not.
_Avoid_: Slot (retired `thegraph` vocabulary — a column is a presentation field)

**Trigger** (retired — `promote`):
One of five observable conditions counted across a cluster. **One is bad luck;
two or more is a rule nobody wrote down.** The skill that counted them is
[retired](retired/promote/) (ADR-0070) and the `triggers` state slot went with
it. The bar survived in `sift` for the `SYSTEM` disposition, and `sift` is
retired and deleted too (ADR-0075), so nothing live states it.
_Avoid_: Guard (an edge condition in thegraph), Signal (informal usage
elsewhere — a trigger is countable, a signal is noticed)

**Corpus** (lens):
One body of material a pass reads end to end — this codebase's siblings, or the
named prior art. **Never split between readers**: two readers on halves buy
coverage while calling it independence. A second reader takes the same corpora
with an opposing stance.
_Avoid_: Reference (one *kind* of corpus, and also the name of the step that
fetches it), Source class (the build's term for what `reference` fetches)

**Candidate** (thegraph):
Anything headed for the maintainer's batch — a deferral, a lens's residue, a
follow-up, an unreproduced observation. Never filed unasked, and presented with
every column of the envelope filled.
_Avoid_: Finding (grill-code's term for a pre-scoring scan hit; here a finding is
what a lens returns and a candidate is what reaches a human), Gap
(unexported-archives' file-based notion).

### redden

**Bar** (redden):
One of the three mechanical checks the test-trust gate runs on an assertion —
discriminating power, right reason, mutate-the-predicate. Each is *run*, never
reasoned about.
_Avoid_: this word as a threshold. thegraph's **two-trigger bar** and
**anti-cascade bar** are counts something must exceed; a redden Bar is an
experiment you perform. Qualify whenever both are in play. Also avoid **Gate**
for a single Bar — the gate is all three plus the classification.

**Named mutation** (redden):
The specific change made in order to *fail* an assertion: the fix turned off, the
guard removed, the predicate swapped for a plausible differently-wrong one. Named
before it is run, because "something went red" is not evidence that the right
thing did.
_Avoid_: Mutation testing (the tooling category — redden names one mutation per
assertion by hand and runs it; it does not sweep a mutant space)

**Pattern** (redden):
One of the five explanations for a mutation that should have reddened an
assertion and did not — shared wrong model, surface ablation, vacuous window,
proxy condition, self-drawn fixture. Each names its own repair.
_Avoid_: Anti-pattern (a thing to stop doing; a redden Pattern is a diagnosis of
why a proof is blind), Finding (a lens's term in thegraph), Trap (thegraph's
`check-it`'s term for a project's own tautological check, which nothing lists —
name each one in the decision record it belongs to as you meet it)

### plat

**Peer** (plat):
A named, human-confirmed repository in the same category, read as prior art for
how a tree is laid out. The skill proposes candidates with evidence; the
maintainer confirms the set, because a builder that picks its own peers has
invented the authority it then defers to. Named and kept by name — never stored,
since a copy of somebody else's tree is a derivable fact that rots.
_Avoid_: this word for a **wire peer** — the other side of a protocol, as in a
round-trip proof. Both senses are live in this repo; qualify whenever both are
in play.

**Tree rule** (plat / thegraph):
Which directory holds which files, stated as **concrete paths** and keyed on one
property a script can check against a diff. Ownership — which module a file
belongs to — is one such property; **visibility** (does the barrel export it) and
**element-tree dependence** (does the test drive the public widget) are others of
equal standing, and a repo may keep several axes at once, each yielding its own
check. A build value: `place` routes a change by it and `gate` matches the
produced diff against it, which is why a rule stated as a layer name is not one —
it cannot be matched against a diff, and a directory nobody named is a directory
nobody owns.
_Avoid_: Layout (the thing the rule describes, not the rule), Structure (the
routing habit's word for the *kind* of decision this is), "which directory owns
what" as the definition — it is one axis, and the first real run found two rules
it cannot express

**Difference** (plat):
One respect in which this project's tree and the confirmed **Peer**s' differ,
judged by **role rather than name** — a different name for the same role is not
one, and the same name for two roles is the one that bites. Each lands in exactly
one of three: **adopt**, **deliberate divergence**, or **unclassified**. The
role-not-name test binds **our own tree too**, not only the comparison: a split
suspected from filenames is confirmed by opening the files and counting.
_Avoid_: Finding (a lens's term in thegraph), Divergence unqualified (the
deliberate-divergence list is one of the three buckets, not the set)

**Unclassified** (plat):
The bucket for a **Difference** nobody has decided — drift wearing a rule's
clothes. It is the pass's output rather than its residue, and it is left visible
rather than settled by majority, because majority is evidence and the
tie-breaker is what has authority.
_Avoid_: Open question (implies it is waiting on information; this is waiting on
a decision), Gap

## Relationships

- An **AFK agent** produces work in response to one **issue**; the
  **Acceptance Gate** judges that work against the same issue.
- Each **Verdict** maps to a triage outcome: Pass → issue closed; Rework →
  `ready-for-agent` re-applied; Respec → `needs-info`; Escalate →
  `ready-for-human`.
- The **Acceptance Gate** is distinct from the **`code-review` skill**: `code-review`
  only produces a two-axis report; the Acceptance Gate adds the verdict, the
  next action, and — on approval — its execution.
- **A Dependency or Lineage reference resolves against three places**: this
  catalog, `retired/`, and the **Declared external** rows in
  `docs/agents/skill-dependencies.md`. Nothing checks this — `check-skills.py`
  did, and [ADR-0066](docs/adr/0066-there-are-no-gates.md) deleted it, taking
  with it the only layer that could see an **upstream** rename by reading
  `~/.claude/skills`. That is what silently killed the Acceptance Gate when
  `review` became `code-review`, and it is unwatched again. Name resolution
  alone is not enough in
  either direction — `review` is *still installed* beside its successor, so the
  name resolves while the dependency is dead, and `artifact-design` is
  platform-bundled with no file on disk, so the name resolves nowhere while the
  dependency works. That is why a Declared external carries a **namespace** and
  an **identity**, not just a name.
- **`thegraph` reads two things at the start of a change** — the **Issue
  contract** for this change, the **Build** for this repository — and both are
  read by [`read-it`](read-it/) rather than by `thegraph` itself.
  `grill-the-graph` writes the second. **The first has no producer in this
  catalog**: `tickets` filled it and is retired
  ([ADR-0069](docs/adr/0069-tickets-is-retired.md)), so a contract is written by
  hand or by an upstream slicer, or not at all — and a ticket answering none of it
  was always the ordinary case, never a gap. Neither producer could ever be part
  of the method itself: one spec fans out to N tickets and N runs, and a method
  that authored its own acceptance would be restating its own words (ADR-0045).
- **An answer in the contract is a starting point, never an authority.** It saves
  looking a value up and settles nothing; a later step that finds the code
  disagreeing follows the code. The one exception is a call somebody watched the
  maintainer make, which is theirs to reverse and is carried forward as theirs.
  The provenance marks that encoded this are retired with their only producer
  (ADR-0069), and the asymmetry they existed for survives as the rule: **a settled
  call re-opened is loud; a call wrongly treated as settled is silent.**
- **`grill-map`** authors a **MAP**; [`read-it`](read-it/) reads one where the
  repo keeps one. The same setup/execution split as the two below, with one
  difference worth stating: `grill-map` is **standalone** — a MAP is worth having
  on its own, and the read is worth nothing without one.
- **An upstream wayfinding skill calls a parent issue holding child tickets "the
  map".** In this vocabulary that is an **Anchor**, not a **MAP** — one is an
  issue, the other a document, and the collision is with a word `thegraph`
  already spends elsewhere. Read it as an Anchor when it arrives: its children
  are the roster `spine` queries, and its *"Decisions so far"* index is contract
  material — the one place the two vocabularies actually have to meet. That
  material had a reader in `tickets` until
  [ADR-0069](docs/adr/0069-tickets-is-retired.md); the meeting point is still
  there, with nothing standing at it.
- **`grill-the-graph`** produces a **Build**; **`thegraph`** executes changes
  against it. The builder reads the executor's schema at runtime rather than
  copying it.
- **`thegraph`** succeeds **`theflow`**, retired and no longer installed
  (ADR-0027), along with `grill-the-flow`. The migration path that read their
  output — `docs/agents/theflow.md` as a build input — went too
  ([ADR-0067](docs/adr/0067-the-theflow-migration-path-is-gone.md)): a build now
  derives from the repository, and a repo still holding that file gets the path
  written back on request.
- **`thegraph` calls skills and holds no method of its own.** Its four steps each
  invoke the siblings that own the work, and run the method inline while saying so
  where one is not installed (ADR-0042):

  | Step | What it calls |
  |---|---|
  | [`read-it`](read-it/) | `spine`, `firsthand` |
  | [`make-it`](make-it/) | `tdd`, `redden` |
  | [`check-it`](check-it/) | `bare`, `lens`, `sweep`, [`assay`](assay/), [`silt`](silt/), `security-review` |
  | [`ask-it`](ask-it/) | `envelope`, `byartifact` |

  The seam is the same every time: **a method governs work of its kind anywhere;
  what only means something inside one change stays with the step.** What each
  step keeps is what no sibling answers — `read-it` the restatement and the
  route, `make-it` the signals that only appear while writing, `check-it` **whose a red
  or a defect is**, `ask-it` the grouping by disposition.
- **`plat` is nobody's sibling any more.** The peer comparison passes the same
  seam test — *"compare a repo's layout against named peers and decide what to
  adopt"* governs work of its kind anywhere — and it used to fill two slots for
  `grill-the-graph`. Neither slot exists: a build holds the folder-structure
  reference and nothing else about layout, and `make-it` reads the tree, any declared
  rule and that reference together when a file needs a home. **Nothing invokes
  `plat`; a person runs it when the tree itself is the question** (ADR-0040 stands
  as the reason it is a separate skill).
- **A release's obligations are discovered by the proof, not by a later step**
  (ADR-0032). Linking the build into a real consumer already broke the tests that
  pinned the old bug, and that break *is* the list — so `ask-it` composes a
  **Candidate** dated by the release rather than performing a migration after it.
  Writing it while the evidence is in front of you is the point: the obligation is
  dated by the release, the knowledge is not, and after the merge the one person
  who could say whether a workaround was bug-avoidance has stopped looking.
- An extraction can also **surface a build value**, and the same move can later
  take it away. `boundary` asks which layer can be correct and cannot know what the
  layers are, so the project's **seams** had to be named as something somebody
  supplies — they were in the build's schema while being absent from the
  invariant/build split, which is how a value stays answerable while reading as
  unowned. An extraction that leaves a question with no named answerer is not
  finished. The seams are now read from `CLAUDE.md`, which is the only place a
  repository states its own identity, and a build that asked for them was asking a
  question its answerer could draft.
- **Every step and every sibling is model-invoked while `thegraph` is
  user-invoked**, and that is forced rather than chosen: a user-invoked skill can
  reach a model-invoked one but never another user-invoked one. It also matches
  what each is for — a check that fires when a test is written beats one fired
  when somebody already suspects it.

## Example dialogue

> **Dev:** "The AFK agent finished issue #12 — do I just run the `code-review`
> skill on the branch?"
> **Maintainer:** "`code-review` tells you *what's wrong*, but it stops at a
> report. The **Acceptance Gate** reads that, decides pass or rework, and — if
> you approve — bounces the issue back to the AFK agent with fix notes or
> escalates it to `ready-for-human`."

## Flagged ambiguities

- "review agent" was used to mean both the existing **`code-review` skill** and the
  new **Acceptance Gate** — resolved: these are distinct. `code-review` reports;
  the Acceptance Gate judges and acts.
