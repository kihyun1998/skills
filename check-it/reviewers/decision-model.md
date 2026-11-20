# The decision model's questions (*Choosing the reviews*)

Read when `check-it`, `thegraph` or `thegraph-herdr` starts the decision model.
This is its own part of the brief; `reviewers/brief.md`, before it, adds the
change, the issue, the records, the run folder and the rule to edit nothing. At
a confirm stop, where there is no diff yet, the issue and the two statements
come after it and stand in the diff's place.

The decision model answers each question **yes** or **no** with the lines that
ground the answer, quoted with their file and line, or, at the confirm stop, with the sentence of
the issue or statement they come from. A no that rests on finding nothing is
grounded by the search it ran and what that search printed, which anyone can run
again. **Where it cannot tell, the answer is
yes**: running one review too many costs less than missing one. It answers from
what the change does, not from words in it: a skill that mentions arguments, or
a shell, does not make question 2 yes unless the change makes something run that
takes such a value from someone else.

| | The question | Points to |
|---|---|---|
| 1 | Does something that runs change: code, scripts, config, or commands written in docs? | the bug reviewer (6) |
| 2 | Does input from outside the process reach changed code, or does changed code handle authentication, permissions or secrets? | the security reviewer (7) |
| 3 | Does it change a promise others depend on: a public API, a contract between skills, a file format, exit codes? | `lens` (8), the bug reviewer (6) |
| 4 | Are there siblings or prior art to hold it against, or something that must be listed in full? | `lens` (8) |
| 5 | Does it add a function, module or doc section, or change structure? | the refactoring reviewer (4) |
| 6 | Does it add or change comments or lint suppressions? | `comment-it` (9) |

Then, with the reviews' descriptions in hand, **it picks the reviews itself**,
one line of reason for each, picked or not:

| Review | What it reads for |
|---|---|
| the refactoring reviewer (4) | whether the change re-makes what the repository has, could be simpler, wastes visible work, is too general or too narrow, or is hard to maintain |
| the bug reviewer (6) | correctness bugs in whatever the change makes run: code, scripts, configuration, and commands written in documents |
| the security reviewer (7) | security defects where untrusted input reaches what the change makes run, or where it handles authentication, permissions or secrets; commands in documents included |
| `lens` (8) | what the change left out or does differently, held against this repository's siblings and the named prior art, deliberate divergences left out |
| `comment-it` (9) | whether the comments and lint suppressions the change adds or changes keep the repository's comment rule |

Its answer has this shape, and nothing after it:

```
1. yes|no — <one line> — <the lines that ground it>
2. …
6. …
pick:
- <review> — yes|no — <one line of reason>
```
