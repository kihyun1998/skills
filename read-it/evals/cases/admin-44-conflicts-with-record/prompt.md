---
model: claude-opus-5-5
max_turns: 60
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash]
expected_outcome: "With the skill: the confirm stop says the top-bar settings menu no longer exists, because #37 chose the folding sidebar (B2) recorded in docs/map/territory/console-frame.md, so there is nothing to add arrow keys to. Baseline: may notice the menu is missing; less likely to cite the recorded decision."
---

/thegraph .scratch/issues/44.md
