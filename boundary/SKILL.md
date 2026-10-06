---
name: boundary
description: "Decide which layer a capability belongs to, and refuse to compensate in the wrong one. Use when deciding where a mechanism lives, when a consumer reports a bug, or when local code is about to be written to work around something deeper."
---

Put the capability in the layer that can be right, and refuse to patch it in one that cannot.

## Goal

A capability has **one** correct layer. Getting it wrong is not a matter of taste:
put a mechanism too shallow and a layer that physically cannot see the whole state
is made responsible for it; put policy too deep and the core takes on vocabulary
that belongs to whoever consumes it. Both duplicate one piece of knowledge across
two layers, which is a divergence seed — the copies will disagree, and nothing
will notice.

**"Consumer" means whatever sits across the boundary from the core** — not
necessarily a separate repository. It may be a published package's dependent, or
an in-repo layer reaching the core only through a declared seam.

## Workflow

1. **Name the seam and both sides of it.** Which layer holds the state, which one
   reaches it, and through what. Until that is stated, "upstream" and "downstream"
   are opinions.

2. **Ask whose invariant broke — before asking which layer is upstream.** This
   ordering is the whole skill. When a consumer brings a "bug", the first question
   is not *where do I fix this* but *what was promised and by whom*. If the
   behaviour they are unhappy with is a contract the core **deliberately** holds,
   the root layer is **theirs** — they built on something that was never valid.
   Treating that report as a defect deletes a contract instead of a workaround,
   and a deleted contract takes every other consumer's assumption with it.

3. **Split the capability.**
   - **Mechanism** belongs in the **deepest layer that can be correct** — when it
     is the hard parsing or domain step, or when it is only *right* with the whole
     state in hand. A layer that sees a fraction of the state physically cannot do
     it correctly, however convenient it would be there.
   - **Policy** — the queries, patterns, palettes, thresholds, announcement rules,
     resolution order — is **injected by the consumer**, so the core stays
     agnostic about which one it is serving.
   - **What a consumer owns by definition stays there.** That is not a workaround
     you tolerate, it is the boundary working.

4. **Check the leak in both directions**, because the boundary is a membrane, not
   a wall. Raising a floor in the core — a minimum toolchain, a newly required
   capability — carries that floor straight *down* to everyone through the
   compatible range. And changing a contract can silently falsify the **rationale**
   a consumer already wrote for its own code, so a contract change obliges you to
   go reclaim it.

5. **If the defect is deeper, stop — do not compensate here.** A local workaround
   hides the real bug, removes the pressure to fix it, violates the boundary, and
   duplicates the knowledge in two layers. **The urge to write code on this side
   to make the test pass is the signal**, and it arrives before the reasoning does.
   Fix it at the root, or leave the gap visible and tracked and make the test
   assert the *real* behaviour honestly. Never feed it fake input to go green.

6. **Report your local guard upstream even when you fixed it correctly here.**
   Two consumers reaching the same workaround is evidence the core's default is a
   trap — people did not fail to find the right option, they hit the bug and routed
   around it. But **nobody can see "two consumers" from inside one**, so the report
   is the only way that evidence ever accumulates. Judging where to fix and
   reporting what you hit are separate duties, and doing the first well does not
   discharge the second.

## Rules

- **Role before fix.** Decide what the behaviour *is* — contract, defect, or the
  consumer's own job — before deciding where it gets changed. Every expensive
  mistake here is that order reversed.
- **One capability, one layer.** If the answer is "a bit in both", the split
  between mechanism and policy has not been made yet.
- **Convenience is not correctness.** "It is easier to do it here" is the argument
  that puts a mechanism in a layer that cannot see enough to be right.
- **Never write a workaround for a defect that belongs deeper.** Not to unblock,
  not temporarily, not with a comment promising to remove it.
- **A contract is not a defect**, however unhappy its consumer is — and a defect
  is not a contract, however long it has been shipping.
- **Report even when you were right.** The local guard being correct is exactly
  the case where nobody upstream ever hears about it.
- **This is a judgement, and it is not delegable.** Splitting the reading between
  two readers means each sees one side of a seam, which is the one thing that
  cannot be judged from one side.

## Verification

Before finishing:

1. Both sides of the seam are named, and the split says which side holds state.
2. Every piece of the capability landed in exactly one layer — nothing is "mostly"
   in one.
3. The whose-invariant-broke question was asked and answered **before** any
   placement was proposed, and the answer is written down, not just reached.
4. Anything left in a shallower layer is there because the consumer owns it by
   definition — not because moving it was hard.
5. Anything the core raised or changed that reaches across the seam is named, with
   what it obliges on the other side.
6. If a local guard survived, it was reported upstream, and the report says the
   local fix was correct — otherwise it reads as a bug report and gets closed as
   one.
