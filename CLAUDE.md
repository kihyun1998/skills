# CLAUDE.md

Guidance for AI agents working in this repository.

## Repository

This repo is a personal collection of Claude Code skills. Each top-level
directory containing a `SKILL.md` is one skill; `scripts/install-skills.ps1`
and `scripts/install-skills.sh` link them into `~/.claude/skills`. `mods/` holds
Claude Code mods (hooks plugins), which are not skills and are not installed by
those scripts. See `README.md` for details.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in this repo's GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses five canonical roles, and **`docs/agents/triage-labels.md` is the
only copy of the strings**. Restating them here made this file wrong the day one
diverged: the maintainer's evaluation act in this repo is `/grilling`, so the
`needs-triage` role is labelled `needs-grill`.

### Skill dependencies

Two things are checked, and they are not the same question.

- **What a skill invokes** is declared by that skill, in a `requires:` key in its
  own `SKILL.md` frontmatter. The platform ignores the key; only the gate reads
  it.
- **Every skill name written in prose** must resolve — to this catalog, to
  `retired/` where the sentence acknowledges the retirement, or to a declared
  external. Read in every live skill's markdown **and in `scripts/`**: an error
  message naming a skill is an instruction, not a record. A retired skill's
  markdown is not read — it is frozen and installed nowhere, so a name in it is a
  record too.

The gap between them is deliberate: a **boundary reference** names a skill to say
that something is *its* job, not this one's. It must resolve and must not be
declared, or `--resolve` demands an install for a skill nothing calls.

Externals live in `docs/agents/skill-dependencies.md` with the namespace they
live in (`user` under `~/.claude/skills`, or `platform` bundled with no file on
disk) and an identity phrase that survives an upstream rename.

### Authoring a skill

`docs/skill-authoring.md` holds this repo's **position** against Anthropic's
skill-authoring best practices — the deliberate divergences with their reasons,
and which gate enforces which part of the guidance. It deliberately does **not**
restate the guidance: read that raw (append `.md` to the doc URL and `curl` it,
never a summarizing fetch). It carries the invocation rule — model-invoked only
when the model or another skill must reach it — the Description shape — a
what-clause and a Use-when clause — and the numbers that still bind — how this
catalog compares to three others, and four things measured and disproved — and
nothing else.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Environment notes

`docs/environment/` records global Claude Code setup that lives outside any repo
(`~/.claude/settings.json` and friends), with the measurements behind each choice.
Currently: `usage-band.md`.
