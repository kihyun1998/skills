# Upstream

This folder started as a verbatim copy of `pstack/skills/create-formal-verification-skill` from
https://github.com/cursor/plugins at commit
`e1cc03121a0e71129a4fb730d7c5528a0a3e43c8` (2026-11-16 22:18 -0800),
copied on 2026-11-20. Every file except this one and `LICENSE` was byte-identical to
that commit when copied, and each file changed since is listed below; `LICENSE` is `pstack/LICENSE` from the same commit (MIT, Lauren Tan).

It is the starting point for this repository's own version
(kihyun1998/skills#78). Once a file here is changed, say what changed and why below,
so the copy can still be compared with upstream.

To see what upstream changed since:

```sh
git clone --filter=blob:none --no-checkout https://github.com/cursor/plugins.git pstack
git -C pstack log --oneline e1cc031..origin/main -- pstack/skills/create-formal-verification-skill
```

## Changes from upstream

- `SKILL.md` (kihyun1998/skills#100): the agent reads every TLA+ result with
  `statechart` itself, while it builds the check and when it proves it, and the
  generated skill's agent does the same, instead of asking the user to run it. In
  the #78 trial the generated skill asked the person. `statechart` is named as
  this catalog's skill, not as pstack's, and `requires: [statechart]` declares
  the call, as this repository's `CLAUDE.md` asks.
- `SKILL.md` (kihyun1998/skills#101): a new section, *Find what no property
  covers*, breaks each guard in the target code and records which property
  catches it against the run on the unchanged code, in a guard table that goes
  into the generated skill's coverage record; a guard nothing catches gets a
  property or is named `uncovered` there and in the hand-off, after the step
  finds out why nothing caught it (the branch never runs in the check, another
  guard stops the same case, or a harm no property states). Upstream asks only
  whether each property can fail on some broken variant. In the #78 trial,
  removing the `first_at.is_some()` early return in justssh `Tokens::launched`
  was caught by none of the 6 invariants that pass on the unchanged model; the
  other 2 already fail there, on findings.
