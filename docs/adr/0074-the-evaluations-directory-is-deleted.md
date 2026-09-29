# ADR-0074 — The evaluations directory is deleted, and its measured failures are kept here

**Status:** accepted.

`evaluations/` is deleted. It held one file: a README describing an instrument
with nothing left to run.

## How it emptied

Not by this decision. Both sets of evaluations that ever existed were deleted
before it, for the reason the directory's own README had already written down —
**an evaluation does not outlive the thing it is about**:

- three `thegraph` evals queried this repository's compiled build and went with
  it ([ADR-0065](0065-this-repos-thegraph-build-is-retired.md));
- three `grill-the-graph` evals tested a delegation refusal, a pending artifact
  manifest and a tree-rule induction, none of which the rewritten skill has.

What was left was the method with no subject, and a *"where results go"* section
pointing at a record that [ADR-0073](0073-the-measurement-record-is-deleted.md)
deleted.

## Why the findings are here rather than nowhere

The README's *"what is known not to work"* section was the expensive part. Each
line cost a run that failed in a way nobody predicted, and every one of them
would have to be re-bought by whoever next tries to evaluate a skill in this
repository. They are kept, condensed, because a directory is a bad home for a
finding and a decision record is the right one.

**About the instrument**

- **A subagent cannot reach Opus.** Three attempts, one a verbatim retry, all
  terminated with an API safeguards error on prompts that ran normally on two
  other tiers. The third tier needs a human-driven session.
- **A subagent invoking a skill is not a person invoking it.** Closer than
  handing over file paths, and still not the real path.
- **One run is not a rate.** Nothing was ever run enough times to claim a
  frequency.

**About isolation, which is where most of them are**

- **A baseline run beside the skill it is a baseline for is void.** Every
  baseline found the skill: three cited a fixture by name as the pattern they
  were applying, one read an eval's own `.json` with `expected_behavior` in it.
  Run baselines from outside the repository with the inputs copied out.
- **A description leaks the vocabulary into the baseline.** A model-invocable
  skill's description sits in every subagent's tool listing, invoked or not, so a
  baseline in that session reproduces the method's words having read nothing.
  Run every baseline with the flag up, then flip it and run the skill arms.
- **A flag flipped in the same turn does not reach the subagent.** Four skill-arm
  cells reported the invocation refused while the file on disk already said
  otherwise. Flip, let a turn pass, then launch — and require every skill arm to
  **state whether the invocation succeeded**, since two ran the task anyway and
  produced a baseline wearing the skill arm's label.
- **An eval may not be about `evaluations/`.** A rewrite whose subject was that
  directory had every cell read it, and one read all six `.json` files.
- **Reaching a user-invoked skill and holding a run read-only are mutually
  exclusive.** The flag flip leaves the tree dirty; a run taking its read-only
  constraint seriously reverts it and withdraws the precondition from every run
  still in flight. One did exactly that, with two unfinished. Use a worktree.

**About the criteria themselves**

- **Invoke the skill; never list its files in the prompt.** Naming `SKILL.md` and
  its companions tells the model what to read, which is the thing under test for
  a skill that discloses progressively. A pilot that handed the files over saw
  both tiers pass; invoking properly saw one tier never reach the document
  holding the rule it needed.
- **Judge habits, not vocabulary.** A criterion satisfied by naming a node or an
  invariant separates the arms while measuring nothing — the baseline cannot
  satisfy it by construction and the skill arm satisfies it by quoting. Point
  each criterion at something a run without the skill might plausibly **do**
  differently.
- **`baseline_expectation` is written before the run.** A criterion nobody
  predicted a baseline against tends to be one the baseline also passes, and that
  is discovered too late.

## What is lost

The eval file shape — four keys from Anthropic's guidance plus that fifth one —
and the two-arm procedure. Both are re-derivable from the guidance and from this
record. What is not re-derivable is the list above, which is why it is the part
that moved.
