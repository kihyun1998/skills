---
name: plat
disable-model-invocation: true
description: "Decide which directory owns what by reading what named peer repositories actually did. /plat."
---

Read what the neighbours actually did, then decide which directory owns what — and write the rule down before moving anything.

## Goal

Two ways a tree goes wrong, and from inside the repo they look identical: fine.

**Invented.** A layout derived from first principles alone re-pays for mistakes a
dozen mature projects in the same category already made and fixed. Nothing
reports this. The tree is internally consistent and simply costs more than it
had to, forever.

**Copied.** A peer's tree imported wholesale carries decisions that were about
*their* boundary — their layer count, their publishing story, their consumers. It
fits until the first change that touches the difference, and by then the imports
are written.

Both are cured by the same move: read the real trees, and force **every**
difference to be classified. The classification is the deliverable — a tree
nobody can defend difference by difference is not a rule, it is the shape the
repo happened to grow.

**Why it is worth a pass at all:** layout is where a seam is *physically*
expressed. A file written to the wrong directory breaks the seam while producing
no error, no failing test, and no warning, and everything the rule would have
told you arrives later as rework — the imports, the module wiring, the history.

## Workflow

1. **Name the category, then propose the peer set with evidence — and stop until
   a human confirms it.** For each candidate: what it is, why it is the same
   category, and how widely it is used. **A builder that picks its own peers has
   invented the authority it then defers to**, so the confirmed set is the input,
   not your shortlist. Write nothing about the tree rule before the set is
   confirmed. Where the maintainer names peers outright, that set wins and the
   proposal step is skipped.

   **A monorepo is not disqualified — look one level in.** Its root tree answers
   a different question than a single package's, and stopping there discards the
   strongest prior art there is: each package *inside* it is an ordinary peer,
   and a first-party one is the best available. Name the package, not the
   repository.

2. **Read each peer's real tree, never a write-up about one.** A layout described
   on a documentation site, in a blog post, or in a starter template is
   **summarized** and can never confirm anything; the repository's actual tree
   can. State the depth you read to and how you read it. Record what each
   directory *contains*, not just its name.

3. **Establish our own side, and say which input won.** A layout rule already
   declared in `CLAUDE.md`, `GLOSSARY.md`, or a decision record **outranks** what
   the tree merely happens to look like — otherwise the pass ratifies the drift
   it was bought to catch. Where the tree contradicts itself — the same kind of
   file living in two places, nothing declaring which is the rule — a tree cannot
   say which half is drift, so that one is **asked, never induced**.

   **"Outranks" settles a contradiction, not a difference in resolution.** Before
   deciding which input won, **count the files that violate the declaration**:

   - **Some violate it** — a real conflict. The declaration wins and the
     violators are the drift.
   - **None violate it, and the measured rule is stricter** — not a conflict at
     all. The declaration is a lossier statement of a rule the code already
     keeps, and reporting it as *the* rule buries the sharper one. **Propose the
     sharpening**, naming what the declaration says and what measurement shows.
   - **No declaration** — the clean sort is the rule, per the paragraph below.

   Measured on one package: a module map lumped three directories into one row
   and marked the row `mixed`. Checked against the barrel, each directory was
   pure — **15 exported, 4 internal, 0 mixed**. Obeying *"outranks"* mechanically
   would have reported three mixed directories and buried a 19/19 invariant that
   nothing else in the repo stated.

   **Test a suspected split by content before calling it one.** Two directories
   holding the same *kind* of file by name routinely hold two different *roles*,
   and the rule is undeclared rather than absent — so read what the files do and
   count. Where the sort comes out clean, the rule you just measured **is** the
   rule: write it down, do not send it to the maintainer as an open question.
   Measured on one package's suite, a flat-versus-nested test tree that read as
   drift sorted 34/34 against 10/10 on whether the file drives the public widget
   or the module alone — the project's own boundary rule, expressed in the tree
   and never stated. Judging that by filename would have proposed a restructure
   that destroyed a working rule. **A split is a claim about roles, and a claim
   about roles is checked by opening the files.**

   **No tree yet?** There is nothing to induce, and this is the case a compile
   over an existing repo cannot reach. Derive the rule from what the project *is*
   — what it publishes, where its boundary runs, how many layers it has — plus
   the confirmed peers, and mark it **provisional**: no diff exists yet to match
   it against, so it is unenforced until the first change lands.

4. **Compare on role, not on name.** For each peer and for us, answer the same
   questions: where the public surface lives, where the seam is physically
   expressed, where tests sit relative to source, where examples and consumers
   sit, and what is generated versus authored. **A different name for the same
   role is not a difference. The same name for two different roles is the
   difference that bites**, and it is invisible to a comparison of directory
   listings.

5. **Classify every difference into exactly one of three.** **Adopt** — their way
   is better here, and the reason names *our* boundary rather than their
   popularity. **Deliberate divergence** — we differ on purpose, with what
   decided it. **Unclassified** — nobody has decided, and this bucket is the
   output. A difference sitting in it is drift wearing a rule's clothes; leave it
   visible rather than resolving it by majority.

6. **Emit two artifacts and stop.** The **tree rule** as concrete paths, and the
   **divergence list** with a reason each. Adopted rows are stated as concrete
   moves — this path becomes that path — so the restructure that follows has a
   list rather than an intention. Move no file, edit no import.

## Rules

- **Concrete paths, never a layer name.** A directory nobody named is a directory
  nobody owns, and a rule stated as a layer cannot be matched against a diff.
  *"Use judgement"* is the default, not a rule.
- **The peer set is confirmed by a human.** Proposing candidates is this skill's
  job; choosing them is not.
- **The real tree, or it does not count.** Prose about a layout is a summary, and
  a summary cannot confirm.
- **Name the peers, store nothing.** A stored copy of somebody else's tree is a
  derivable fact that rots. The rule is kept, the peers are kept by name, their
  contents are read again when acted on.
- **Majority is evidence, not authority.** Four peers doing the same thing is a
  strong prior and still loses to this project's own measured reason. Where the
  two genuinely disagree and no reason settles it, that is the maintainer's call,
  not a vote.
- **Move nothing.** Restructuring is its own change, filed as one. A move made
  without the rule written down drifts straight back, which is why the rule is
  the deliverable and the move is the follow-up.
- **The tree is the whole subject.** Comment paragraphs belong to `decant` and the
  surfaces that describe behaviour belong to `sweep`; borrowing either here
  duplicates a judgement that already has a home.
- **An unclassified difference is reported, not omitted.** Later, a difference
  nobody mentioned and a difference nobody found read exactly the same.

## Where the output goes

The two artifacts are already slots a `thegraph` build supplies: the **tree
rule** is what `place` reads to route a change and what `gate` matches the diff
against, and the **deliberate-divergence list** is what the restatement test is
checked against. Nothing invokes this skill; a person runs it. Run
standalone, the same two artifacts are the report.

## Verification

Before finishing:

1. The peer set was confirmed by a human, and no candidate the skill chose alone
   is in it.
2. Every peer's actual tree was read, at a stated depth — not a description of
   one.
3. Where a declared rule and the induced tree disagreed, which one won is written
   down. Every suspected split was sorted by **content** and the count reported;
   only one that survives that sort was asked rather than resolved. A declaration
   **no file violates** was reported as a sharpening, never as the rule.
4. Every difference lands in exactly one of adopt / deliberate divergence /
   unclassified. None was dropped for being small.
5. Every adopted difference has a reason naming this project's boundary, not the
   peers' popularity.
6. The tree rule is concrete paths, and each one could be matched against a diff
   by a script that knows nothing about the project.
7. No file moved and no import changed. If a restructure is warranted, it left as
   a list of moves for a separate change.
8. A rule derived with no tree to induce from is marked provisional.
