# Upstream

The sixteen skill folders here started as verbatim copies of folders under
`skills/` in https://github.com/mattpocock/skills at commit
`abeeaf95660ba9e8b7c753eb38f441ca707a8823` (2026-11-19 13:34 +0000), copied on 2026-11-23 (kihyun1998/skills#133); `ki-wayfinder/` and
`ki-improve-codebase-architecture/` from the same commit on 2026-11-24 (kihyun1998/skills#137).
`LICENSE` is that commit's `LICENSE` (MIT, Matt Pocock).

| Here | Upstream |
|---|---|
| `ki-tdd/` | `skills/engineering/tdd/` |
| `ki-pr/` | `skills/engineering/pr/` |
| `ki-to-spec/` | `skills/engineering/to-spec/` |
| `ki-grilling/` | `skills/productivity/grilling/` |
| `ki-domain-modeling/` | `skills/engineering/domain-modeling/` |
| `ki-prototype/` | `skills/engineering/prototype/` |
| `ki-research/` | `skills/engineering/research/` |
| `ki-writing-for-agents/` | `skills/productivity/writing-for-agents/` |
| `ki-code-review/` | `skills/engineering/code-review/` |
| `ki-triage/` | `skills/engineering/triage/` |
| `ki-grill-with-docs/` | `skills/engineering/grill-with-docs/` |
| `ki-to-tickets/` | `skills/engineering/to-tickets/` |
| `ki-codebase-design/` | `skills/engineering/codebase-design/` |
| `ki-setup/` | `skills/engineering/setup-matt-pocock-skills/` |
| `ki-wayfinder/` | `skills/engineering/wayfinder/` |
| `ki-improve-codebase-architecture/` | `skills/engineering/improve-codebase-architecture/` |

They are this repository's own copies, and the skills this catalog calls; the upstream
skills are no longer installed, and mattpocock/skills is kept as a reference only
([ADR-0105](../docs/adr/0105-the-catalog-calls-the-ki-copies-and-upstream-is-reference-only.md),
which amends [ADR-0104](../docs/adr/0104-ki-skills-are-own-copies-beside-the-upstream-skills.md)).
Once a file here is changed for any other reason, say what changed and why below,
so the copy can still be compared with upstream.

To see what upstream changed since:

```sh
git clone --filter=blob:none --no-checkout https://github.com/mattpocock/skills.git matt
git -C matt log --oneline abeeaf9..origin/main -- skills/engineering/tdd skills/engineering/pr skills/engineering/to-spec skills/productivity/grilling skills/engineering/domain-modeling skills/engineering/prototype skills/engineering/research skills/productivity/writing-for-agents skills/engineering/code-review skills/engineering/triage skills/engineering/grill-with-docs skills/engineering/to-tickets skills/engineering/codebase-design skills/engineering/setup-matt-pocock-skills skills/engineering/wayfinder skills/engineering/improve-codebase-architecture
```

## Changes from upstream

Every file not listed is byte-identical to the commit above. The listed ones differ
only where a copied skill names itself or another of the sixteen, so the set calls
itself and not the upstream skills: the `name:` line, and each such name as a
slash command, in backticks, or as the name given to the Skill tool, is the
`ki-` name (`setup-matt-pocock-skills` is `ki-setup`). Prose, titles and
`agents/openai.yaml` display names are as upstream.

- `ki-tdd/SKILL.md`
- `ki-pr/CREDITS.md`
- `ki-pr/SKILL.md`
- `ki-to-spec/SKILL.md`
- `ki-grilling/SKILL.md`
- `ki-domain-modeling/SKILL.md`
- `ki-prototype/SKILL.md`
- `ki-research/SKILL.md`
- `ki-writing-for-agents/SKILL-MECHANICS.md`
- `ki-writing-for-agents/SKILL.md`
- `ki-code-review/SKILL.md`
- `ki-triage/SKILL.md`
- `ki-grill-with-docs/SKILL.md`
- `ki-to-tickets/SKILL.md`
- `ki-codebase-design/SKILL.md`
- `ki-setup/SKILL.md`
- `ki-setup/domain.md`
- `ki-setup/issue-tracker-github.md`
- `ki-setup/issue-tracker-gitlab.md`
- `ki-setup/issue-tracker-local.md`
- `ki-wayfinder/SKILL.md`
- `ki-improve-codebase-architecture/SKILL.md`
- `ki-improve-codebase-architecture/HTML-REPORT.md`

Left as upstream, on purpose:

- `research`, `prototype` and `grilling` in `ki-setup/issue-tracker-*.md` and
  `ki-wayfinder/SKILL.md`, and `wayfinder:` in labels such as `wayfinder:map`: ticket
  labels, not skill names.
- `/triage` in `ki-triage/AGENT-BRIEF.md`: an example of a good brief about an
  imagined command, not a call to the skill.
- No `requires:` key, though `ki-tdd`, `ki-triage`, `ki-grill-with-docs` and others
  invoke one another: upstream has none, and the copies change only names.
