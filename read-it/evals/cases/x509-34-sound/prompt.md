---
model: claude-opus-5-5
max_turns: 60
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Bash]
expected_outcome: "Both arms: restate the change to a bare library directive and propose doing it, without claiming the premise is false."
---

/thegraph .scratch/issues/34.md
