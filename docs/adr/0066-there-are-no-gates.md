# ADR-0066 — There are no gates

**Status:** accepted.

`scripts/check-skills.py` (1,149 lines) and `scripts/hooks/pre-commit` (78) are
deleted. This repo now validates nothing mechanically.

## What was there

| | lines |
|---|---:|
| real code | 657 |
| comments and docstrings | 331 |
| blank | 162 |

Of the 657 lines of code, **225 were the seven checks** and **236 were the
selftest** — the machinery that proved each check could go red, plus its 27
mutations. The apparatus that watched the checks was larger than the checks.

The seven: `contents` (55), `references` (51), `requires` (31), `spelling` (29),
`externals` (23), `person` (22), `hook` (14).

## Why they went

**Every one of them asserted that two copies of a fact still agreed.** That is
the whole class. `references` checked a skill name written in prose against the
catalog that also holds it; `contents` checked a heading list against the
headings; `requires` checked a frontmatter roster against the directories;
`hook` checked the hook's command list against a copy inside the checker.

A fact with one home does not need a check. The two commits before this one
removed two such duplications outright — `Decider` and `Delegable` left the
node-type table because each node's own header already held them, and
`check_restatement` went because its subject was that same duplication. Neither
needed replacing.

**The measured yield was low.** `check_restatement` — 158 lines and three
mutations — caught exactly one copy in its life, and the fix was two lines.

**And the comparison is unflattering.** `mattpocock/skills` carries 37 skills
and 171 cross-skill name mentions with **zero** lines of validation.
`obra/superpowers` and `caveman` ship tests only for their actual runtime code.
`ponytail` is the one that does a comparable job, in **76 lines**, and it can
because its copies are byte-identical or generated — `check-rule-copies.js`
compares whole files for equality and parses neither side.

Ours could not do that, because our duplications are **paraphrases**: the same
fact stated three times in three wordings. Byte equality is impossible on a
paraphrase and prose cannot be generated from prose, so the only instrument left
was a parser — and a parser of the schema is one more statement of the schema.

## What this costs

Nothing now notices: a skill name in prose that resolves to nothing; a `##
Contents` block that has fallen behind its headings; a `requires:` entry naming
a skill that does not exist; `behaviour` and `behavior` in one document; a
`description` in the second person; an incomplete external declaration.

`--resolve` goes with them, and it was the only layer that could see an
**upstream rename** — a skill installed in `~/.claude/skills` renamed by its
author, which no file in this repo records. That failure killed the Acceptance
Gate once (ADR-0048's subject). It is now unwatched again, and it is the one
loss here that a smaller repo does not automatically avoid.

## The rule that replaces them

**Do not write the same thing twice.** Where a second copy is unavoidable, make
it one a machine can compare without understanding it — byte-identical, or
generated. A check that has to parse the documents it is checking is a copy of
those documents, and it drifts the way they do.

ADR-0048 said the opposite: a rule written in three places still did not fire,
so mechanise it. That reasoning was sound for the rule it was about and wrong as
a general policy, because the answer to a rule written in three places is to
write it in one.

## Prior art

- `DietrichGebert/ponytail` — `scripts/check-rule-copies.js`, 76 lines, byte
  equality plus a short canary list, with its own limit written into the file:
  *"canary, not full equality."*
- `mattpocock/skills` — 37 skills, no validation.
- `obra/superpowers` — pressure tests against agent *behaviour*, never against
  agreement between documents.
