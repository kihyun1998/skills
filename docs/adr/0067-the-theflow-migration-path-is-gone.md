# ADR-0067 — The `theflow` migration path is gone

**Status:** accepted.

`grill-the-graph` had two first-build paths: compile a repo's existing
`docs/agents/theflow.md` bindings, or derive from the repository. The first is
deleted. A build now derives from the repository, always.

## What went

| | lines |
|---|---:|
| `### 1. Compile` — the path table, the spent-bindings rules, the 15-row bindings→node mapping | 63 → 15 |
| `### 6` — the `<details>` block on what to tell a maintainer holding spent bindings | 20 → 0 |
| the exception paragraph in *The target schema lives in thegraph* | 2 → 0 |
| `fixtures/already-built.md` — its subject was graph-beats-bindings precedence | rewritten as update-beats-first-build |
| 24 further mentions across the other fixtures, `CONTEXT.md` and the description | reworded to name the repository |

`grill-the-graph/SKILL.md`: 551 → 466.

## Why

`theflow` and `grill-the-flow` were retired by ADR-0027 and moved to `retired/`.
What stayed was the path that read their output, kept because onboarded
repositories might still hold a bindings doc. Nothing in this repository has one,
and no consuming repository was found to.

That makes it a **dead branch**, which is a different defect from the duplication
this repo has been removing: not a fact with two homes, but a condition that will
not become true again. It cost 85 lines in the skill and a vocabulary — Bindings —
that `CONTEXT.md` carried two *Avoid* entries to keep people out of.

The maintainer's call, and the reasoning is theirs: a migration path is cheap to
write back on request and expensive to carry unread. If a repository turns up
still holding `docs/agents/theflow.md`, the instruction to compile it is a
paragraph, not a rediscovery — the bindings→node mapping is recoverable from
`retired/theflow/SKILL.md`, which is why that skill stays in `retired/` rather
than being deleted.

## What this does not change

`retired/theflow/` and `retired/grill-the-flow/` stay where they are. A retired
skill is a record; this ADR removes the *live* path that read one of them.
