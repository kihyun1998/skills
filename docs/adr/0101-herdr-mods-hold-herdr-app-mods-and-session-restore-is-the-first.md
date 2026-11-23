# ADR-0101 — Herdr-app mods live in `herdr-mods/`, and `session-restore` is the first

**Status:** accepted. Implements #60; amended for #65, #69, #81, #99, #103, #104, #109,
#110 and #111 and three times without an issue, and folded for #126 on 2026-11-23 into
this short record of its first decision. The record before the fold is in git:
`git log -p -- docs/adr/0101-herdr-mods-hold-herdr-app-mods-and-session-restore-is-the-first.md`.
Each amendment still in force has its decision on its issue, and each superseded one names
the commit that replaced it (the table below); the measurements, and the amendments that had
no issue, are in [docs/research/session-restore.md](../research/session-restore.md).

The live rule is in [herdr-mods/README.md](../../herdr-mods/README.md) and the mods' code;
this record says what was decided, on what, and what would reopen it.

## What is decided

- **Herdr-app mods are a kind of their own, in `herdr-mods/`** (#60, Q1). A Herdr-app mod
  is JavaScript the Herdr app loads from `~/.config/herdr-app/mods/`. It is not a skill,
  and not a Claude Code mod in `mods/`, which the install script turns into
  `.claude-plugin/marketplace.json`.
- **They have their own install script** (#60, Q4 and Q7). `scripts/install-herdr-mods.sh`
  links each mod folder into the app's home, with a junction on Windows as
  `install-skills.sh` does, and never switches layouts.
- **Two parts that share code are one mod** (answered while #60 was built): one folder
  per mod, since a mod cannot import from another's.
- **`session-restore` is the first** (#60). It saves which Claude session each terminal
  holds and, after a reboot or a core restart, reopens them in place. What it is today is in
  [herdr-mods/README.md](../../herdr-mods/README.md); how it got there is in the amendments.

## What it was decided on

The maintainer's, on 2026-11-17, in #60: the body, the grilling (Q1–Q10,
[its decision comment](https://github.com/kihyun1998/skills/issues/60#issuecomment-6933790682)) and two answers given while it was built. The maintainer
was shown:

- **For a Herdr mod, not a skill:** a skill needs a Claude session to run, and a Claude
  started from inside Claude saves no transcript (measured in #60).
- **For a folder apart from `mods/`:** the install script turns every mod in `mods/`
  into `.claude-plugin/marketplace.json`, so `mods/` stays Claude Code mods only.
- **For one folder per mod:** Herdr refuses an import from outside a mod's folder, even
  through a junction (measured on 2026-11-17, in [the research document](../research/session-restore.md)).

## The amendments

Each changed `session-restore`, not the folder. They are small decisions about one mod, not
records under #79's three conditions in [docs/agents/domain.md](../agents/domain.md) (#121). One still
in force lives in its issue's decision comment, with what was derived and what it did not cover;
a superseded one's row names the commit that replaced it, and its text stays in git.

| Amendment | Date | Commits | Decision |
|---|---|---|---|
| #65: a kept chip replaces the tab bar and layout clones | 2026-11-17 | `182a136`, `24a14db`, `5562389`, `6574a19` | [#65](https://github.com/kihyun1998/skills/issues/65) |
| #69: an open checks which sessions run | 2026-11-18 | `2ed18de` | [#69](https://github.com/kihyun1998/skills/issues/69#issuecomment-6966129495) |
| #81: the install script opens the chip when `main` shows without it | 2026-11-18 | `a821cfa` | in [#65](https://github.com/kihyun1998/skills/issues/65)'s, where it was a note |
| #99: every action shows that it is under way, and its error | 2026-11-20 | `c748c10` | [#99](https://github.com/kihyun1998/skills/issues/99) |
| Auto save can be turned off, settings take typed numbers | 2026-11-20 | `528ade2`, `f9056c3` | superseded by `f1a357f`; [its text](../research/session-restore.md#2026-11-20-auto-save-can-be-turned-off-settings-take-typed-numbers-528ade2-f9056c3) |
| #103: a save's id is never given twice | 2026-11-20 | `dbfe7ad` | superseded by `f1a357f` |
| #104: an overlapping or failed action leaves the panel's state right | 2026-11-20 | `dc0e190` | [#104](https://github.com/kihyun1998/skills/issues/104) |
| #104's follow-up: results that land out of order, a history of at most 50, the delete footer | 2026-11-20 | `3afa955` | superseded by `f1a357f` |
| #109: a history file that cannot be read is not written over, a save file is copied first | 2026-11-20 | `0f4dae6`, `a6d410a` | [#109](https://github.com/kihyun1998/skills/issues/109) |
| #111: no "No limit", so the history stays under `readTextFile`'s 1 MiB | 2026-11-20 | `9905042` | superseded by `f1a357f` |
| #110: a settings press writes only its field, one at a time | 2026-11-20 | `f53b8c4`, `7edfcd8` | superseded by `f1a357f` |
| The history is gone | 2026-11-23 | `0c018f0` | superseded by `f1a357f`; [its text](../research/session-restore.md#2026-11-23-the-history-is-gone-0c018f0) |
| One file, written only by Save; no auto save, no restore list; the panel unfolds below a chip in the top half | 2026-11-23 | `f1a357f`, `707f766` | [research](../research/session-restore.md#2026-11-23-one-file-written-only-by-save-no-auto-save-no-restore-list-f1a357f-707f766) |

#65, #99, #104 and #109 are in force in part: what of each went with the history and the
Settings tab on 2026-11-23 is named in its decision comment.

## What would reopen it

These read the grounds above the other way round.

- A Claude started from inside Claude saving its transcript, or a skill that runs without a
  Claude session, which removes the ground for a Herdr mod over a skill.
- `mods/` no longer turning each of its mods into the marketplace, or Herdr loading its mods
  from a Claude Code plugin, which removes the ground for a folder of their own.
