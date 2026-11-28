# AGENTS.md

Guidance for AI agents working in this repository.

## Repository

This repo is a personal collection of Claude Code skills. Each top-level
directory containing a `SKILL.md` is one skill; `scripts/install-skills.sh`
links them into `~/.claude/skills` and, for Codex, `~/.agents/skills`, and each skill's `agents/*.md` into
`~/.claude/agents`. `mods/` holds
Claude Code mods (hooks plugins), which are not skills; `mods/README.md` holds
their layout, the install script and the check (`node scripts/check-mods.mjs`),
and `mods/ENGINE-NOTES.md` what the engine does that its types do not show —
read it before writing or changing a mod.
`herdr-mods/` holds Herdr-app mods, which run in the Herdr window and are
neither skills nor Claude Code mods; `herdr-mods/README.md` holds their layout
and `scripts/install-herdr-mods.sh`, and ADR-0101 why they are a kind of their own.
`ki-skills/` holds this repo's own copies of upstream mattpocock/skills skills, one
folder each, named `ki-<name>`; `scripts/install-skills.sh` links them as it links a
top-level skill, `ki-skills/UPSTREAM.md` holds the upstream commit and every change
from it, and ADR-0105 why the catalog calls them and no upstream skill is installed.
`.claude-plugin/marketplace.json` is generated from `mods/` by the install
script — never edit it by hand. See `README.md` for details.

## Comments

A comment is one of: a license header; behaviour forced by an outside
dependency, platform, vendor or protocol we cannot reshape (Rust's `SAFETY:`
on `unsafe` is one); a tool directive; a doc comment on a public API; an issue
or RFC link for a constraint the code cannot express. Nothing else: a surprise
in our own code is fixed, not explained.

A decision that is hard to reverse, surprising without context and the result of a
real trade-off goes to `docs/adr/`, short (`docs/agents/domain.md`); any other
decision and its reason live in the issue's decision comment and the commit
message, and history goes to the commit message.

## Refactoring standard

The refactoring standard is `docs/agents/refactoring.md`; `check-it`'s
refactoring reviewer reads it.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in this repo's GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses five canonical roles, and **`docs/agents/triage-labels.md` is the
only copy of the strings**. Restating them here made this file wrong the day one
diverged: the maintainer's evaluation act in this repo is `/ki-grilling`, so the
`needs-triage` role is labelled `needs-grill`.

### Skill dependencies

Two conventions, and they are not the same question. The writer keeps both;
nothing checks them ([ADR-0066](docs/adr/0066-there-are-no-gates.md)).

- **What a skill invokes** is declared by that skill, in a `requires:` key in its
  own `SKILL.md` frontmatter. The platform ignores the key.
- **Every skill name written in prose** resolves — to this catalog, to
  `retired/` where the sentence acknowledges the retirement, or to a declared
  external. That holds in every live skill's markdown **and in `scripts/`**: an
  error message naming a skill is an instruction, not a record. A retired
  skill's markdown is frozen and installed nowhere, so a name in it is a record.
  So is a name in a vendored skill's credit for where its text came from
  (`ki-skills/ki-pr` crediting `show-me`).

The gap between them is deliberate: a **boundary reference** names a skill to say
that something is *its* job, not this one's. It resolves, and it is not declared
in `requires:`, since nothing calls it.

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

### Replaying a skill in a target repository

A replay that proves a skill here against a target repository leaves what it
finds there as evidence on this repository's issue; it files nothing and commits
nothing in the target repository. A finding there is for a run inside that
repository to raise.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Environment notes

`docs/environment/` records global Claude Code setup that lives outside any repo
(`~/.claude/settings.json` and friends), with the measurements behind each choice.
Currently: `usage-band.md`, `windows.md` (what a script or check run on this
Windows machine has to allow for), and `CLAUDE.md`, the user-level instructions
`scripts/install-skills.sh` links into `~/.claude` and `$CODEX_HOME`, with where
each line came from in `user-instructions.md`.
