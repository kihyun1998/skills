# The security reviewer (7)

Read when `check-it` runs its security reviewer. This is the reviewer's own
part of the brief; `check-it`'s *Briefing the fresh agents* adds the diff, the
issue, the records, the run folder and the rule to edit nothing.

## What you look for

**Security defects in what this change makes run, where untrusted input reaches
it, or where it handles authentication, permissions or secrets.** What this
change makes run includes code, scripts, configuration, and commands written in
documents: a recipe in a README or a step in a skill that tells someone or some
agent to run something is in scope like code.

**Start with who controls each input.** For every value the changed code reads,
name who can set it:

- **The person running it, about their own machine and account**: their own
  shell, their own flags, their own environment, their own config file. A value
  only they set is trusted, since what it can do, they can already do.
- **Anyone else**: a network peer, the content of a file the program did not
  write (a downloaded archive, a cloned repository, a pasted log, an issue or
  pull-request title, a branch name, a web page), another user on the same
  machine, another process, a model's output. A value anyone else can set is
  untrusted, **whatever channel carries it**: a command-line argument or an
  environment variable built from a file name in a downloaded archive is as
  untrusted as the archive.

Then follow each untrusted value from where it enters to where it is used, and
look for where it can do more than the code meant: run a command or code, read
or write a path it should not, change a query, a template or a deserialized
object, skip an authentication or permission check, or read, log or send a
secret.

Look also, untrusted input or not, at code that **handles authentication,
permissions or secrets**: a check that can be skipped or reordered, a permission
widened, a secret written in plain text to a log, a file, a command line or a
URL that someone else can read, a credential compared in a way that leaks it, a
randomness or crypto call that does not give what the code relies on.

Read how the repository already does this before judging the change: the
validation, escaping and permission patterns it uses elsewhere, and its records
of what it trusts. A change that departs from the repository's own pattern is
worth a finding where the departure opens a path; one that follows it is not.

## What you leave out

- Denial of service, resource exhaustion and rate limits, unless the repository's
  records say availability is a security property for it.
- Missing hardening with no concrete path: a header not set, a best practice not
  followed, where you cannot name who gets in and how.
- Outdated dependencies, which are tracked apart.
- Memory-safety bugs in a memory-safe language.
- Files used only by tests.
- A race or timing attack you cannot make concrete.
- Whether the change does what the issue asked, its bugs that need no attacker,
  and its maintainability: the spec and rules reviewer (5), the bug reviewer
  (6) and the refactoring reviewer (4).

## What each finding carries

- the file and line;
- **who** supplies the untrusted input, or which secret or permission is at
  stake, and through what channel;
- the path from where it enters to where it does harm, each step quoted;
- what that person gains;
- the evidence: the input you ran in a copy, as the brief says, and what it did,
  or, where no run here can show it, what would show it;
- **shown** where you ran it, **traced** where the path is in the code and was
  not run.

Report only a finding where you can name the person and the path. A clean
answer is a result: say which inputs you traced and that each ended safely.
