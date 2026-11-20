# A project's verify skill, in (1)

Read when the repository has a `.claude/skills/` folder: this is how `check-it`
finds a verify skill there, puts its check on (1)'s list, runs it and reads it.

A **verify skill** is defined in `GLOSSARY.md`: the project-local skill
`create-formal-verification-skill` writes, under the repository's
`.claude/skills/`, committed or not. Nothing here builds one or calls that skill
(#78).

**The signal is mechanical**: the files the diff touches (`git diff HEAD
--name-only --no-renames`, which names both paths of a move, and every
untracked file) against the files each verify skill names as covered: the code
its check describes, not every file the skill mentions (its model, its scripts
and the files it lists as not covered are not covered files). Reading which
files a skill covers is this session's; the match is the script's, run in the
repository with each covered file as written in the skill:
`node <check-it>/scripts/check-it.mjs verify --covered <file> [--covered
<file> …]`, `<check-it>` being this skill's folder. It prints each file in both, or `none`, and stops with an error on a covered
path that is not a file in the tree, such as a folder or a function name, so a
form it cannot match is never read as `none`. A file in both
puts that skill's check on (1)'s list. Nobody is asked: it is a check, not a
review, so the decision model does not pick it and nobody removes it (ADR-0102,
amended for #105). A skill that covers only some functions of a file
still counts the file: whether the change reaches a covered function is the
verify skill's own first step, and the check runs either way. The candidates are
found by reading each `.claude/skills/*/SKILL.md`: one that names the files it
covers and the commit it was confirmed at (its sync commit) is a verify skill,
wherever in it it writes them, and one without both is not.

**Running it.** It runs with the rest of (1), before the reviews and the
benchmark (10), so a check such as TLC, which can take every core, never shares
the machine with a benchmark that wants it quiet. It runs again with (1) after
the fixes the person picks. It runs in this session. Follow the verify skill's steps for whether
the change touches the verified code and for running its command, its tool
state sent to a set place and deleted after as [`clean-it`'s rules](../clean-it/RULES.md)
say, run bare as
(1) runs a check. Save the output at the path `check-it.mjs name verify` prints
(*Save each report*). A check that cannot run here, such as one whose tool is not installed,
is reported as not run, with why, and never as a pass.

**Where the check runs on a model rather than on the code, a code change cannot
turn it red by itself.** So where the verify skill's own test says the change
touches the verified code (a mapped function, or a new step of the kind its
model makes an action) and the model no longer describes the new code, bring the
model in line with the new code, as the first step of the skill's section for an
intended change says, **in a copy in its own folder in the run folder**, and run the check
there once, with its own temporary folder, so its logs do not replace the
repository run's. The copy and the check's tool state go at the end of this
check, as [`clean-it`'s rules](../clean-it/RULES.md) say. Only that first step: the copy is not changed again until it
passes, and the repository's model, the skill and its sync commit are left as they are,
since nothing here fixes anything. The repository run is the baseline *Whose is
it* compares against, where no commit after the sync commit touched the covered
files.

**Reading the result.** This session reads the run's own output, a failed run's
counterexample included, and tells a counterexample as a short sequence of steps
in the code's words. It runs nothing else to read it, even where an older verify
skill names a tool for that. The result says, as the verify skill's steps tell a
real bug from a modelling error:

- **Whether the model needed bringing in line.** Where it did, that is drift,
  and it goes to a person with the functions and the model change the copy
  needed, whatever the copy's run gave. Where the covered files also changed in
  commits after the sync commit (`git log --oneline <sync commit>..HEAD --
  <covered files>` lists any), the drift may be older than this change, and the
  result names `/maintain-formal-verification-skill`, which a person invokes.
- **What the run gave**, on the repository's model where it still describes the
  code, or on the copy:
  - **pass**;
  - **a bug**: a property fails, and every step of the counterexample can happen
    in the new code. One this change introduced goes back to `make-it`; one the
    tree without it also fails on goes to a person (*Going back, and
    stopping*). A finding the skill already records is an expected failure in
    its check;
  - **a recorded finding now passes**: the change fixed it. It goes to a person
    with the skill's steps for moving that property, not back as a defect;
  - **a modelling error**: a step of the counterexample cannot happen in the
    code. It goes to a person as drift, with that step and the code it maps to.
