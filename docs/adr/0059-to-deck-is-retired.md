# `to-deck` is retired

## The call, and whose it was

The maintainer's, made on use, immediately after
[ADR-0058](0058-grill-code-is-retired.md) and for the same reason: it is not
going to be used any more. It moves to [`retired/`](../../retired/) by the
mechanism [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)
established.

**A product judgement, not a derivation.** Nothing measured `to-deck` as
defective and nothing superseded it. Reversing it costs one `git mv` back.

## What it did, recorded because nothing else records it

`to-deck` turned a study PDF — a workbook or textbook — into a flashcard deck in
`just-learn`'s Import Format, through a Korean interactive session. It read the
numbered questions a workbook already prints, kept them in their original order
under `origin: "workbook"`, and generated additional questions from the same
material's definitions and concepts under `origin: "extra"`.

Its one real design decision is worth keeping legible, because it is the sort of
thing a reader would otherwise have to re-derive from a retired file: **`answer`
holds exactly what the prompt asks and nothing more, with context and citation in
`explanation`.** `just-learn`'s short-answer mode grades `answer` by exact match,
so anything padded into it breaks grading. The bar was *scope*, not length — a
prompt asking for a purpose legitimately has a clause-length answer.

It carried a `REFERENCE.md` for the schema, `scripts/validate.mjs` to check a
deck, and one worked example.

## What retirement settles, beyond the skill

**The `/grill-me` collision is gone.** `to-deck` advertised `/grill-me` as its
own alias — it offered a one-at-a-time grilling mode — while a third-party
`grill-me` installed under `~/.claude/skills` is a plan-interrogation skill
entirely unrelated to flashcards. Two skills claimed one slash command, and
typing it reached the other one. Retirement leaves a single owner rather than
requiring anyone to adjudicate the clash.

**A fixture was re-anchored rather than left green.** `tree_rule_check.py` used
`to-deck/scripts/validate.mjs` as its worked example of *"skill-local script"*.
The check classifies paths by pattern and does not require them to exist, so it
would have stayed green while asserting about a path that had gone. It now names
`img-to-pdf/scripts/img2pdf.sh`, the remaining skill-local script. This is the
same defect [ADR-0057](0057-the-catalog-points-somewhere.md) records for
`check-skills.py`'s `redden` fixture, caught earlier this time because the
retirement went looking for it.

## `learn-pdf/` goes with it

`learn-pdf/` at the repository root held eleven `.deck.json` decks and their
source PDFs — `to-deck` output, 182 MB, all git-tracked. It had no `SKILL.md`, so
`check-skills.py` could not see it and `tree_rule_check.py` reported it as
`unclassified`. The maintainer deleted it, and the deletion is committed here
because the tool that produced it is retired in the same act.

**What the deletion does and does not do, stated because the two are easy to
confuse.** The working tree is clean of it and `git checkout <commit> --
learn-pdf` brings it back. The repository is **not smaller**: the blobs are in
history, `.git` stays its current size, and only rewriting every commit would
change that — which breaks every existing clone and is not what happened here.

The `tree_rule_check.py` rule and comments still name `learn-pdf/` as a known
unclassified path. They are left as they are: the rule describes what the tree
looked like when the classification was decided, and re-deciding it belongs to a
`plat` pass over the tree rather than to this retirement.
