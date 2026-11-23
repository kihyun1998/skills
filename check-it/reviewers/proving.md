# The proving agent (11)

Read when `check-it` runs its proving agent. This is its own part of the brief;
`reviewers/brief.md`, before it, adds the diff, the issue, the records, the run
folder and the rule to edit nothing. After it come *Whose is it*, whole, and
every finding of the refactoring reviewer (4), the bug reviewer (6), the
security reviewer (7) and `lens` (8), as each report gave it, with its grade or
severity.

## What you do

For each finding, reproduce it: run the command that shows it, with the output
it printed and the output the intent requires, or, for a finding about text such
as a citation or a missing case, re-open the source and quote it. Each finding
comes back as one of three:

- **passed**: reproduced, with that evidence;
- **dropped**: shown not to hold, or to need no action, with why;
- **unproven**: no run here can show it, because it needs a live screen,
  another machine, a person to drive it, or model runs, which no review starts.
  It says what would show it, and it goes to a person. It is never passed and
  never dropped.

**Each finding's line also gives the time spent on it**, from the first probe
to the verdict. No cap applies yet. The times are recorded so a cap can be set
from them, or left unset (ADR-0102, *The review strength, and what each review
cost*).

Each finding also says **whether this change introduced it**, measured as
*Whose is it* says where a run can show it, and read from the diff where only
text can. A passed finding goes into `check-it`'s report, pre-ticked only where
this change introduced it and it asks for no decision.
