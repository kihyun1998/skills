# Acceptance Gate delegates its review engine to the `code-review` skill

> **Amended 2026-08-30.** The skill this record delegates to was called `review`
> when this was written. Upstream renamed it to `code-review` (99% identical
> content) and promoted it out of `in-progress`; the two-axis interface this
> decision rests on — caller supplies the fixed point and the spec, skill returns
> a Standards report and a Spec report from parallel sub-agents — is unchanged,
> so the decision stands and only the name moved. References below are updated
> in place. The filename keeps the old word because links point at it.
>
> **The Consequences below predicted the failure and named the wrong cause.** They
> anticipated someone installing the Gate without installing `review`. What
> actually happened is that the dependency was installed the whole time under a
> different name, and `/gate` stopped at its own hard-dependency check for an
> unknown period. Nothing detected it: the gate that checks this repo's catalog
> verifies markdown links and skill/directory agreement, and a skill *named* in
> another skill's prose is neither.
>
> **Amended again 2026-08-31: the last sentence above is now false, and the first
> Consequence is now only half true.** `scripts/check-skills.py` checks exactly
> that — every skill named in another skill's prose must resolve, and
> `code-review` is a declared external in `docs/agents/skill-dependencies.md` with
> the upstream it came from and an identity a rename does not change. Its
> `--resolve` layer reads `~/.claude/skills` from the pre-commit hook and is the
> only layer that can see an upstream rename; see
> [ADR-0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md).
> The dependency is still not visible from the Gate's own `SKILL.md` frontmatter —
> that is Layer 0 of the spec and waits on a platform probe — but it is no longer
> invisible to this repo. Two facts measured while fixing it and worth keeping
> here: `review` is **still installed** beside `code-review`, so a name-only check
> would have reported green throughout the outage; and the repo's own
> `CONTEXT.md` already carried *"Avoid: review agent (collides with the
> `code-review` skill)"* the whole time.

The Acceptance Gate does not analyse diffs itself. It drives the `code-review`
skill — feeding it the fixed point and the spec so `code-review` does not prompt —
and consumes `code-review`'s Standards and Spec reports as its input. The Gate adds
only the verdict and the routing/execution layer on top. We chose this over
giving the Gate its own review engine (duplicated logic) or adding an
AFK-specific third axis (more scope): delegation keeps the analysis in one
place, so when `code-review` improves, the Gate improves with it.

## Consequences

- The Acceptance Gate hard-depends on the `code-review` skill being installed.
  Installing the Gate alone — without `code-review` in `~/.claude/skills` — breaks
  it. This dependency is not visible from the Gate's own `SKILL.md`.
- The Gate's verdict accuracy is bounded by `code-review`'s reporting discipline.
  The Rework-vs-Respec split keys off whether `code-review`'s Spec sub-agent cited a
  spec line; if `code-review` omits a citation, the Gate can misroute. The spec
  handles this with an explicit fallback (treat malformed `code-review` output as
  Escalate).
