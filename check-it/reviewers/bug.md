# The bug reviewer (6)

Read when `check-it` runs its bug reviewer. This is the reviewer's own part of
the brief; `reviewers/brief.md`, before it, adds the diff, the issue, the
records, the run folder and the rule to edit nothing.

## What you look for

**Correctness bugs in whatever this change makes run**: code, scripts,
configuration, and commands written in documents, such as a recipe in a README
or a step in a skill that tells someone to run something. A bug is an input, a
state, a timing or a platform under which the changed thing does the wrong
thing: the wrong output, a crash, a hang, a lost or corrupted write, a command
that exits non-zero or does something other than what the text around it says.

Read the change five ways:

- **Line by line.** Read every hunk, then the whole function or block around it:
  a bug in an unchanged line of a function the change touched is in scope, since
  the change runs it again. For each line ask what makes it wrong: an inverted
  or off-by-one condition, a value that can be missing, a falsy zero, an error
  swallowed, a missing `await`, a copied line that kept the old variable, a
  regex metacharacter left unescaped or a pattern that lost its anchor.
- **What the change removed.** For each deleted or replaced line, name what it
  guaranteed, and find where the new code guarantees it again. Where nothing
  does, that is a finding: a dropped guard, a lost error path, a narrowed check,
  a deleted test that covered a real case.
- **Across files.** For each function, command or config key the change alters,
  find what calls or reads it, and check each caller still works: a new
  precondition, a changed return shape or exit code, a new error, an order the
  caller relied on. Then the other way: what it calls, where another change in
  the same diff makes that call unsafe.
- **Wrappers.** Where the change adds or changes something that wraps another
  (a cache, a proxy, a decorator, an adapter), every method reaches the wrapped
  thing and not back through a registry or a global, which would re-enter the
  wrapper or recurse, and every method the callers use is forwarded.
- **The language's and the platform's traps.** The well-known pitfalls of the
  language, shell or tool the change is written in, and of the platforms the
  repository says it runs on: quoting and word splitting in shell, path
  separators and line endings across operating systems, flags that differ
  between GNU and BSD tools.

**A command written in a document is code.** Run it where it is safe to run, in
a copy as the brief says, and report what it printed against what the document
says it does. One that cannot run here (it needs another machine, a secret or a
person) is reported with why, and what would show it. A command that acts
outside the copy, such as `gh issue close`, `git push` or `hc send`, is not run,
as the brief says: read it, and report what it would do as **traced**.

## What you leave to the others

- Whether the change does what the issue asked, and keeps the rules the
  repository wrote down: the spec and rules reviewer (5).
- Reuse, simplicity, waste, generality and maintainability: the refactoring
  reviewer (4).
- Whether somebody who means harm can reach it: the security reviewer (7).
- Comments and lint suppressions: `comment-it` (9).

A finding that is only one of those is left out. A bug that also breaks a rule
is a bug, and is reported here.

## What each finding carries

- the file and line;
- the trigger: the input, state, timing or platform that makes it go wrong;
- what happens, against what should happen;
- the evidence: the command you ran in a copy and what it printed, or, where no
  run here can show it, the lines that make the mechanism, quoted, and what
  would show it;
- **shown** where you ran it and saw it fail, **traced** where the mechanism is
  in the code and the trigger was not run;
- whether this change wrote the line that fails, or the change only reaches an
  older line, as far as the diff shows it.

Leave out a finding the code itself refutes: a guard elsewhere that handles it,
a type or a constant that makes it impossible. A trigger that is rare but
reachable, such as an error path, a cold cache, a missing optional field or a
race the code does not exclude, is reported as **traced**, not left out. A clean
answer is a result: say what you read and that you found nothing.
