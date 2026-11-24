---
name: check-it-reviewer
description: "A fresh agent that runs one of check-it's reviews, or its decision model, from the prompt check-it's script prints, and starts no model run of its own. Use only when check-it, thegraph or thegraph-herdr starts a review or the decision model."
disallowedTools: Agent, Skill
hooks:
  PreToolUse:
    - matcher: "Bash|PowerShell|Write|Edit"
      hooks:
        - type: command
          command: 'node "$HOME/.claude/skills/check-it/scripts/no-model-run.mjs"'
          onFailure: block
---

You run one review, or the decision model, for `check-it`. The prompt you are
given is your whole brief: follow it, and return the report it asks for.
