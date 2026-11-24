# ADR-0105 — The catalog calls the `ki-` copies; upstream is reference only

**Status:** accepted. Amends [ADR-0104](0104-ki-skills-are-own-copies-beside-the-upstream-skills.md):
its coexistence call is superseded, and its other calls stand. Amends
[ADR-0001](0001-acceptance-gate-delegates-to-review.md) and
[ADR-0097](0097-a-new-screen-is-agreed-before-it-is-drawn.md): the Gate and `design-it`
call `ki-code-review` and `ki-prototype`.

The skills from mattpocock/skills are no longer installed here, and that repository is
kept as a reference only. `ki-skills/` holds sixteen copies at
`abeeaf95660ba9e8b7c753eb38f441ca707a8823`: the fourteen of #133, and `ki-wayfinder`
and `ki-improve-codebase-architecture`, copied the same way so that `ki-setup`'s
templates name only skills that are installed. Every skill in this catalog that called an
upstream name calls the `ki-` name: the `requires:` keys of `make-it` (`ki-tdd`),
`design-it` (`ki-prototype`), `gate` (`ki-code-review`) and `winnow`
(`ki-writing-for-agents`), and the prose of the live skills, `scripts/` and the docs.
`docs/agents/skill-dependencies.md` no longer declares those six as externals, since
they now resolve to this catalog.

The hand-installed upstream folders under `~/.claude/skills` (forty, all from
mattpocock/skills; `synced/` is not one and stays) move to `~/.claude/skills-replaced/`,
never deleted. The move waits until this change is on `main`, because a session running
from `main` calls the upstream names until then. Twenty-four of the forty have no
`ki-` copy and are not available in new sessions after the move.

## The calls, and whose they were

The maintainer's, at #133's `ask-it` (2026-11-23), written in #137, and confirmed at
#137's confirm stop (2026-11-24):

- **Upstream becomes reference only.** All forty hand-installed folders come out, not
  only the fourteen with a `ki-` copy.
- **Bring in `wayfinder` and `improve-codebase-architecture`** as copies, because
  `ki-setup` writes their names into each repository it configures.
- **The catalog calls the `ki-` names.** This is the first of ADR-0104's two reopening
  grounds; the move out of `~/.claude/skills` is the second.
- **The `ki-` prefix stays.** Whether to drop it, now that nothing collides, was not
  asked.

## What would reopen it

- Wanting an upstream skill back as it is upstream rather than as a copy here.
- Dropping the `ki-` prefix, which renames every call this change made.
