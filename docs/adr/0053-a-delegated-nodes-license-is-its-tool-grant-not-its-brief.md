# A delegated node's license is its tool grant, not its brief

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).**
> Nothing is delegated by a build, and `DELEGATION.md` is deleted with the rest of
> the machinery. **The rule is unchanged wherever an agent is written** — a license
> is the tool grant and not the claim — and nothing in this repo writes one.

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).
> The enforcement described here is gone from this repository.**
> `scripts/thegraph/agent_grant_check.py` and the four generated agents it read
> were deleted with this repo's `thegraph` build. **The rule is unchanged and
> lives where it always did** — `grill-the-graph` derives a generated agent's
> tool grant from its brief and grants nothing that can change state — so the
> next build, here or anywhere, enforces it again.

## The gap

`thegraph`'s invariant ① licenses delegation on one property:

> Only nodes that **read without adjudicating** may be delegated: the
> completeness lens, the surface sweep, reference fetching.

Nothing made that true. The property was asserted in prose and the capability was
granted in frontmatter, two lines apart in the same file, and neither looked at
the other.

Measured across the two builds on hand:

```
generated agents                          8   (4 here, 4 in flutter_table_plus)
granted Bash                              8
briefs that ask the agent to run anything 1   <- and nobody had noticed
```

The last number was **0** when this record was first written, and the adversarial
pass corrected it: `thegraph-reference.md` carries a source class that is a
gzipped archive, and `Read` cannot decompress. So one of the eight grants was
load-bearing all along, undeclared, indistinguishable from the seven that were
not. That is the same defect from the other side -- an unexamined grant hides a
real need exactly as well as it hides a spurious one.

`grill-the-graph` — the skill that writes these agents — said **nothing at all**
about tool grants, which is why every one of them got a shell reflexively.

## What it cost

`/thegraph 128` on `kihyun1998/flutter_table_plus` ran the two `verify` lenses in
parallel. The gap lens applied four mutations to `lib/` and restored them. Its
brief did not ask for that; its brief said, in as many words, **"Read-only. You
return findings — not edits, and not a plan."** It had `Bash` and used it.

The refuting lens was reading the same tree. It reported two red baseline runs it
could not reproduce, recognised the signature —

> That failure signature is **byte-identical to the one I get by applying your
> mutation M1**. I could not reproduce it again.

— and graded the pass `UNADJUDICATED`, telling the maintainer to distrust the
whole mutation matrix before landing. **That was correct from inside its own
evidence, and it was wrong.** A clean serial tree gave 407/407 three times.

The second lens is bought at real cost for exactly one purpose: to be believed
when it dissents. A shared mutable tree makes some disagreements artifacts of
scheduling, and nothing downstream can tell those from real ones.

## The decision

**Read-only is the default for every delegated node, and a write-capable grant
must be declared.**

A delegated node carries no tool that can write. Where a build genuinely needs
one — a reference class that is a sibling's *history* rather than its source —
the brief declares what it runs on its own line, and that declaration is what
licenses the tool. A node that can write is one whose report a later run has to
take on trust, so the declaration is the price of it.

`scripts/thegraph/agent_grant_check.py` asserts it, and joins the hook. It reads
two lines of frontmatter and executes nothing.

## Why the first version of the check was wrong

It keyed on the description **claiming** read-only and flagged the grant that
contradicted it. Against this repo it was perfect: 4/4.

Run against `flutter_table_plus`, which it had not been written for, it passed
two agents granted `Bash` — because their descriptions never used the phrase.
One of them reads:

> *"Sweeps every surface … proposes edits rather than making them."*

Same claim, different words, no violation reported. **A rule whose question can
be sidestepped by rephrasing is not decidable**, which is
[0052](0052-the-build-side-of-the-split-is-a-generalisation-not-an-enumeration.md)'s
finding wearing another costume, four days of reasoning later and in a check this
repo wrote itself.

Inverting the default removes the phrasing from the question entirely. Everything
in `.claude/agents` is a delegated node by construction, so the check asks *"is a
tool granted that is not on the read-only allowlist, and does the brief declare
it by name?"* — two facts, no reading of intent. Re-run against the same corpus:
**4/4 in both repos**, including the two that had escaped.

## Why this is an invariant and not a `verify` property

The issue that surfaced it ([#19](https://github.com/kihyun1998/kihyun-skills/issues/19))
left it open — *"whether the rule generalises past `verify` to any delegated node
permitted to write, in which case it is an invariant rather than a node
property."*

The count answers it. **All four** generated agents were granted a shell, not
just the two lenses. Exactly one turned out to need it, and it is the `reference`
fetcher rather than either lens -- so the question the rule has to ask is asked of
every delegated node, not of `verify`. It is a property of delegation, and it
belongs to invariant ①.

## Why the fix is not isolation

[#19](https://github.com/kihyun1998/kihyun-skills/issues/19) proposed a `git
worktree` per mutating pass. That legitimises the behaviour every layer of the
design forbids, and leaves invariant ①'s license resting on a property still
nothing enforces. The maintainer's call was **no** — the lens does not mutate —
and the fix follows from it: enforce the license, do not schedule around its
absence.

**And it is not isolation *or* an exception.** The refuting pass named a third
option this record had not considered: hoist the one non-reading act to the main
thread. Applied to the gzipped source class, that removes the only `**Runs:**`
declaration in the build. The opt-out stays in the rule — a repo will need it —
but this repo does not, and an exception nobody exercises is stronger than one
kept warm for a case the invariant already covers.

One residual is recorded rather than fixed: two delegated agents that merely
**run tests** in a shared tree still collide on build outputs. It does not arise
here — nothing delegated runs anything — and it becomes live the day a
`**Runs:**` declaration is written. The declaration is where that gets asked.

## Consequences

- **All four** generated agents lose `Bash`, including the one that needed it.
  `thegraph-reference.md` reads a gzipped source class, and the unpack is
  **hoisted to the main thread**, which hands the fetcher an extracted path.
  Invariant ① already said non-reading work belongs there; carving an exception
  would have put the act somewhere the invariant had a home for.
- The hook goes to **twelve** commands. `agent_grant_check.py` is the only one
  recorded **live as well as `--selftest`** — the others guard a rule against a
  corpus that changes when someone edits it, this one guards a capability a
  regenerated agent can acquire with no rule touched.
- `grill-the-graph` derives grants from briefs and generates the check alongside
  the agents.
- **Four agents in `flutter_table_plus` are still ungated.** They lift at that
  repo's next `/grill-the-graph` run; this record is what the run will read.

## What the adversarial pass changed, after the decision was taken

The `verify` pass was mandatory here -- the diff touches `scripts/hooks/pre-commit`,
a sacred path -- and it ran against this record and the check together. Six of its
findings landed, and two of them were structural:

**The first `WRITE_CAPABLE` was a denylist of writing tools**, which is
[0052](0052-the-build-side-of-the-split-is-a-generalisation-not-an-enumeration.md)'s
defect committed in the record that cites 0052 to condemn it. Measured against the
40 agent files installed on this machine: it named four attested tools and six that
appear nowhere, while missing `KillShell`, `MultiEdit`, `SlashCommand` and every
`mcp__*`. Worse, it was defeated by **spelling** -- eight real grant forms passed,
including `["Read", "Bash"]`, which is what the platform's own agent-creator emits.
Replaced with an **allowlist of readers**: anything not provably read-only is
write-capable, including tools that do not exist yet. An allowlist fails loudly
(a new reading tool is a false positive somebody fixes in one line); a denylist
fails silently, which is what this file exists to stop.

⚠️ **And the replacement's own first docstring repeated the error it was fixing**,
claiming every pinned spelling was *"attested in the 40 agent files installed on
this machine"*. Five of eleven are not: scoped `Bash(...)`, `MultiEdit`,
`SlashCommand`, `mcp__*` and the wrong-case form appear nowhere. Pinning them is
still right — the allowlist is meant to cover what does not exist here yet — but
the *sentence* was a false measurement, in a record whose complaint two paragraphs
earlier is a list naming things that appear nowhere. The docstring now separates
attested forms from anticipated ones.

**The `**Runs:**` opt-out was a claim nobody verified.** Any non-empty sentence
discharged it -- *"**Runs:** nothing much"* licensed unrestricted `Bash`. It now
has to name each tool it licenses, and the catalog carries the form rather than
the generated artifact being its only documentation.

Both are the same error: **a rule stated at one level, and its check written at a
level that cannot see the question.** That is precisely what this record is about,
committed twice inside the change that fixes it. Recorded rather than quietly
corrected, because the second occurrence in one commit is the evidence that the
pass is worth its cost.

## [Amended the same week] The corollary: a brief may only name what the grant can reach

This record fixed the grant and left the **brief** unexamined, and that half
failed twice within a day of shipping — once in each direction.

`thegraph-reference` was told to unpack a gzipped source class after losing its
shell. Fixed by hoisting the unpack to the main thread, which is where invariant
① already puts work that is not reading.

Then a `verify` lens was invoked during the run on
[#20](https://github.com/kihyun1998/kihyun-skills/issues/20) with a brief saying
*"read the issue with `gh issue view`"* — and its grant, correctly, has no shell.
`spine` had already read that issue on the main thread; the brief should have
carried the text. **The grant was right and the brief was wrong**, which is the
harder direction: nothing checks it. `agent_grant_check.py` reads
`.claude/agents` and can see a grant wider than a brief; a brief wider than a
grant is written at invocation time, by the caller, against a static artifact,
and no artifact exists to compare it to.

So what stands in for a check is the rule, now in invariant ①, plus the delegated
node's obligation to **say when it could not reach something its brief named**.
That obligation is what surfaced this one — the lens opened its report with the
limit and downgraded every finding that rested on it, so nothing unverified
arrived dressed as verified.

## Relation to the trail

[0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) is the same
argument one level down: a copy that names its authority and is checked warns; a
copy that carries only a claim does not. *"Read-only"* in a description is that
copy, written three times — catalog, method, brief — and checked nowhere.

[0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md) is why
the check shipped in the same change as the rule rather than after it.
