# read-it/evals — regression cases for `/thegraph`'s reading step

A test plugin for `claude plugin eval`. Each case is a closed issue with a known
outcome. The repository is rebuilt at the commit before work started, the run
sends `/thegraph`, and an Opus judge grades the confirm stop's reply. Every case
also runs with no plugin loaded. Why it exists and what it was decided on:
[ADR-0087](../../docs/adr/0087-thegraph-reading-step-has-a-regression-suite.md).

## Run

From this directory, on the machine with `/Volumes/T7` mounted:

```sh
claude plugin eval . --judge-model claude-opus-5-5 --scaffold --trust-plugin -j 4 \
  --allow-tools 'Bash(git:*)'
```

Add `--case <glob>` and `--runs 1` for a single cheap run, and `--keep-temp` to
keep the traces. A full run costs about $10. Inside a run `git`, `gh` and the home
directory are unreachable on this Mac; ADR-0087 says what that does to a score.

## Layout

- `skills/<name>/SKILL.md` is a symlink to the catalog's file, not to its
  directory.
- `cases/_fixture.sh` is sourced by each case's `fixture.sh`.
- `cases/<case>/` holds `issue.md` (the issue body as filed), `prompt.md` (the
  model, limits and `expected_outcome`), and `graders/`: `verdict.md` grades the
  reply, and `fired.md` checks that `read-it` ran.

## Adding a case

Take the body as filed, before any correction comment. Use the commit just before
the run, and check that the fixture leaves nothing after it reachable
(`git rev-list --all`). Write `expected_outcome` before the first run, and grade
what a run without the skill might plausibly do differently, not its words
(ADR-0074).

**The skill text under test must not describe a case.** A change to `read-it`
once carried its rationale as a sentence describing flutter-table-37's own
failure. All three with-arm runs then cited that sentence and passed. With the
sentence removed, they failed. A case is measured by how a skill behaves, so
the reason for a rule goes in the commit message and the issue, never in the
skill.
