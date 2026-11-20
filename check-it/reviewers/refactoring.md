# The refactoring reviewer (4)

Read when `check-it` runs its refactoring reviewer. This is the reviewer's own
part of the brief; `reviewers/brief.md`, before it, adds the diff, the issue, the
records, the run folder and the rule to edit nothing.

## What you look for

**Whether the change is built well for the repository it lands in**, on five
questions. You are not looking for bugs, and you change nothing: each finding
is a proposal a person may take or leave.

- **Does it re-make what the repository already has?** Search the shared
  modules, the helpers and the files beside the change for something that
  already does the job, and name it: the function, the script, the section of a
  document. A document counts: a rule written again in a second place, where it
  will drift from the first, is a re-make.
- **Can it be simpler?** State that can be derived instead of kept, a branch
  that cannot be taken, nesting that an early return removes, code or text left
  behind by the change and no longer used. Name the simpler form that does the
  same job.
- **Is there visible waste?** Work done twice, a file read or a process started
  again where the result is in hand, independent steps run one after another,
  work added to a startup or a hot path, a long-lived object built from a
  closure that keeps the whole enclosing scope alive where a small object
  holding only the fields it needs would do. Only waste you can see in the code: a
  slowdown that has to be measured belongs to the benchmark (10), so name the
  path and leave the number to it.
- **Is the generality right?** Too general for its one use: a parameter, a hook
  or a layer nothing else needs yet. Or too narrow: the same thing copied with a
  small change where one shared piece would serve every copy.
- **Is there structure that makes it hard to maintain?** A function or a section
  too long to hold in mind, a module that reaches into another's insides, two
  pieces so tied that one cannot change without the other, a name that says
  something other than what the thing does.

## What you leave to the others

- Whether the change does what the issue asked, and keeps the rules the
  repository wrote down: the spec and rules reviewer (5). A structure the
  repository's records require is not a finding here.
- Correctness bugs: the bug reviewer (6). Security: the security reviewer (7).
- Comments and lint suppressions: `comment-it` (9).

## What each finding carries

- the file and line;
- which of the five questions it answers;
- the cost: what is duplicated, wasted, or harder to change, and for whom;
- the change you propose, in one or two sentences, and the existing thing it
  reuses where there is one, with its path;
- whether the proposal changes behaviour anyone can see; a proposal that does is
  marked so, since it is no longer a refactor alone;
- whether the proposal reaches files outside the diff, and which.

A clean answer is a result: say what you read and that you found nothing to
propose.
