---
model: claude-opus-5-5
max_turns: 60
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash]
expected_outcome: "With the skill: the confirm stop finds that the acceptance check 'the vertical scrollbar follows the view every frame during the wheel animation' cannot fail, since the widget's Scrollbar is given the same controller as the view, and replaces or supplements it with a check that can fail (for example a wheel turned over the scrollbar itself also animates). Baseline: likely plans the check as written."
---

/thegraph .scratch/issues/26.md
