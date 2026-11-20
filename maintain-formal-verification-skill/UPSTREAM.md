# Upstream

This folder is a verbatim copy of `pstack/skills/maintain-formal-verification-skill` from
https://github.com/cursor/plugins at commit
`e1cc03121a0e71129a4fb730d7c5528a0a3e43c8` (2026-11-16 22:18 -0800),
copied on 2026-11-20. Every file except this one and `LICENSE` is byte-identical to
that commit; `LICENSE` is `pstack/LICENSE` from the same commit (MIT, Lauren Tan).

It is the starting point for this repository's own version
(kihyun1998/skills#78). Once a file here is changed, say what changed and why below,
so the copy can still be compared with upstream.

To see what upstream changed since:

```sh
git clone --filter=blob:none --no-checkout https://github.com/cursor/plugins.git pstack
git -C pstack log --oneline e1cc031..origin/main -- pstack/skills/maintain-formal-verification-skill
```

## Changes from upstream

- `SKILL.md`, *Pass*: every run of a check deletes the tool's own state after
  it, and step 6 brings a command that leaves it behind in line (no issue; the maintainer's grilling of 2026-11-20): points at
  this catalog's `clean-it/RULES.md`, the one copy of the cleanup rules
  ([ADR-0103](../docs/adr/0103-what-a-step-makes-it-deletes.md)). Upstream says
  nothing about deleting what a run makes; agents' leftovers filled the drive.
- `SKILL.md`, *Pass* and *Report* (kihyun1998/skills#107): the verify skill's
  guard table, which `create-formal-verification-skill` writes since #101, is
  kept in step: step 3 lists the guards the range added, changed, moved or
  removed, step 5 runs the variant of each added or changed guard only, and
  step 6 rewrites, moves or deletes their rows. Upstream has no guard table, so
  the table went stale on the first change to covered code.
