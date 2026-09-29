# A skill declares what it invokes, and prose still has to resolve, because naming a skill and needing one are different acts

[ADR-0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md)
left the mechanism layer empty on purpose: the checker inferred dependencies by
reading English, and every cost it paid — the phrasing list, the floors, the
noise filtering, 4-of-23 — was the price of a declaration that did not exist.
ADR-0049 said the fix waited on a probe, because the platform documentation is a
**summarized** source class and could never confirm what an unknown frontmatter
key does.

## The probe ran, and it did not need a restart

`claude plugin details` runs the loader with no model call, and a fresh `claude`
process re-reads skills — which *is* the restart. An isolated throwaway plugin
with four skills settled it:

| skill | frontmatter | always-on token cost |
|---|---|---|
| `ctrl-plain` | `name`, `description` | ~60 |
| `test-unknown-key` | plus `requires:` and `zzz-definitely-not-a-real-key: banana` | **~60** |
| `ctrl-broken-yaml` | unquoted colon in the description | **< 20** |
| `ctrl-no-description` | `name` only | **< 20** |

All four appear in the inventory, so presence proves nothing on its own. The
**cost** discriminates: always-on tokens are what a skill contributes to the
listing, and the two broken skills contribute nothing while the unknown-key skill
contributes exactly what the control does.

**Unknown frontmatter keys are ignored, not rejected.** The control that made the
answer usable was `ctrl-broken-yaml` — without something the command demonstrably
rejects, "it loaded" is consistent with the command validating nothing.

## The decision

**A skill declares what it invokes in `requires:`.** Five do: `brief`, `gate`,
`grill-code`, `grill-the-graph`, and `thegraph` — the last naming all ten sibling
methods it runs.

**The prose scan stays, and is not demoted to a fallback.** The first plan was
that a declaration would remove the phrasing heuristic. Measuring the
declarations showed why it cannot, in one case:

> *"don't do … a rearchitecture (that's `improve-codebase-architecture`)"*
> — `grill-code/SKILL.md:192`

That names a skill **in order to say it is somebody else's job**. `grill-code`
never invokes it and works fine without it installed. Declaring it would be false,
and `--resolve` would then block commits on a machine missing a skill nothing
calls.

So there are three acts, not two:

| Act | Must resolve | In `requires:` | `--resolve` checks install |
|---|---|---|---|
| **invocation** — *"the method is `redden`'s"* | yes | yes | yes |
| **boundary** — *"that's `improve-codebase-architecture`'s job"* | yes | **no** | no |
| **lineage** — *"inherited from the retired `to-external-issue`"* | to `retired/`, acknowledged | no | no |

A declaration answers *what do I call*. A reference answers *does this name still
mean anything*. Only the second catches the failure that started this — `/gate`
naming `review` after upstream renamed it — because a rename breaks all three acts
equally and only one of them is declarable.

**`--resolve` says who breaks.** Each external now reports the skills that
declared it, and the ones nobody declared say so:

```
- artifact-design: platform-bundled, not checkable from disk  (required by /brief)
v code-review: installed                                      (required by /gate)
v improve-codebase-architecture: installed   (named in prose; no skill declares it)
```

That third line is the boundary case made visible instead of guessed at.

## What this does not do

It does not make `requires:` complete-by-construction. Nothing forces a skill
that gains a dependency to declare it, and nothing can: prose cannot distinguish
*"I call this"* from *"this is not my job"*, which is the whole reason the
declaration exists. The failure that omission produces is small — an undeclared
invocation still has to resolve, so a stale name is still caught; what is lost is
the precision of `--resolve`'s report.

It does not remove the phrasing floors. A scan that silently stops matching would
make the resolution check green and blind, and that risk is unchanged.

## Consequences

- **Three new checks, three new mutations** — a declared name that does not
  exist, a declared name under `retired/` (the move to `retired/` is the
  uninstall, so nothing can invoke it), and `requires:` written as a bare string
  instead of a list. Nineteen proofs now, up from six before this cluster began.
- **`requires:` is inert at runtime and costs nothing.** Measured above, not
  assumed. If a future Claude Code validates frontmatter strictly this breaks, so
  nothing depends on the key being *read* by anything but the gate.
- **ADR-0049's "not in this PR" is discharged**, and the reason it was deferred
  turned out to be wrong in one specific way worth recording: the probe was
  called impossible in-session because it needed a restart. A new process is a
  restart. The constraint was accepted without being tested, which is the thing
  `firsthand` exists to stop.
