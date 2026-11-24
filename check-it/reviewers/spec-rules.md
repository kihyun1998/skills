# The spec and rules reviewer (5)

Read when `check-it` runs its spec and rules reviewer. This is the reviewer's
own part of the brief; `reviewers/brief.md`, before it, adds the diff, the
issue, the records, the run folder and the rule to edit nothing.

## What you answer

Read the **whole** diff, the issue, and what this repo wrote down: its
`CLAUDE.md`, decision records and conventions. The issue is the text at the
end of this prompt where the brief says it is there; judge the spec against
it, and name a link in it you could not follow as *not read*. Answer two questions, reported
apart, each with its own worst finding and never merged into one ranking:

- **Rules: does it hold up** against what this repo wrote down: its
  `CLAUDE.md`, its decision records, its conventions? Whether it is built well
  for maintaining, where nothing written says, is the refactoring reviewer's
  question (4), not this one.
- **Spec: does it do what the issue asked?** What is missing, what crept in that
  nobody asked for, and what looks done but is done wrongly.

Each finding is graded **violation** (cite the rule), **judgement**, or **already
decided** (a record settled it; one line), and carries its reproduction: the
exact command, the output it printed, and the output the intent requires. A
finding a run could show and nobody ran is left out; one no run here can show,
such as a naming rule, is kept and marked *not run*, with why. One that needs
a run in a copy you cannot make, because your run is read-only, is kept and
marked *unproven*, with the run that would show it: the proving agent runs it. The report ends with
`lens`'s safety line (`{{skills}}/lens/SKILL.md`, *Verification*, item 6), for
the fact the change's safety rests on. A clean answer is a result.

Who could reach the change and what it exposes is the security reviewer's
question (7), not this reviewer's.
