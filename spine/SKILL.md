---
name: spine
description: "Read the cluster before the ticket. An issue is written at filing time and read at work time, and by then the context that made it obvious has decayed — so a fix reasoned from the ticket alone re-decides what a sibling already settled, which is exactly how closing one issue produces the next. Read the anchor and the siblings under it: the suspected shared root, what each sibling established, what is explicitly still open. The anchor's root is a hypothesis to test, not a fact — falsifying it is the more valuable of the two outcomes and is worth recording. An issue produced by working an earlier one gets its parent read first. Use before starting work on any tracked issue, or when a neighbour's reasoning is being re-derived."
---

Read the neighbourhood before the ticket, because the ticket is not what was filed.

## Goal

An issue is written at **filing** time and read at **work** time. In between, the
context that made it obvious decays — the reasoning that produced it, the
alternatives already rejected, what a neighbour settled last week. What survives is
a description of a defect, which is the one part that never explains the shape of
the work around it.

So a fix reasoned from the ticket alone re-decides what a sibling already settled.
**That is exactly how closing one issue produces the next one**, and it looks like
diligence while it happens.

## Workflow

1. **Find the anchor.** The issue that holds the cluster's suspected shared root —
   usually a parent, an epic, or the oldest sibling. If the tracker has a
   parent/child relation, the cluster **is** the subtree; do not look for a list.

2. **Read the siblings under it, for three things**: the suspected shared **root**,
   what each sibling **established** (including what it rejected), and what is
   **explicitly still open**. The rejected alternatives are the expensive half —
   they only pay off when read by someone about to re-propose one.

3. **Treat the anchor's root as a hypothesis, not a fact.** It was written as a
   guess on purpose. Testing it is the work; **falsifying it is the more valuable
   of the two outcomes**, and it is a result worth recording rather than a
   detour that wasted the morning.

4. **When the issue in your hand was produced by working an earlier one, read the
   parent before the issue's own body.** Whether it is a sibling in the routing
   sense was settled when it was filed; what you are after is the decayed context,
   and the parent's trail is the one place you are certain to find it.

5. **Anchor on the last human touch when briefing anyone.** Their last message,
   judgement, or commit is the line: everything after it is the delta, everything
   before it is assumed known and stays out. Brief from **live state** — the
   tracker, the commits, the files — never from conversation memory, because
   memory is the thing that drifted.

6. **Report in outcome voice, not journey voice.** *"The scoring rule was
   replaced"* beats *"I ran three analysis passes"*. And gloss any term coined
   since their last touch, inline, at first use — a correct summary in vocabulary
   invented while they were away is not a briefing.

7. **No anchor, and you find yourself re-deriving a neighbour's reasoning?** That
   *is* the sibling signal. It becomes a candidate to raise, not an issue you open
   on your own.

## Rules

- **The cluster is read before the ticket, not after.** Reading it afterwards
  turns everything it would have told you into rework.
- **The roster is the tracker's, never a list in a body.** A second copy of who is
  in the cluster only creates somewhere for it to disagree with itself. If the
  tracker has no parent/child relation, say so — the fallback is prose and it
  needs reconciling at every write.
- **A falsified root is recorded, not quietly dropped.** The next person will
  otherwise re-form the same hypothesis from the same evidence.
- **State-grounded.** Every claim traces to an issue, a commit, or a file someone
  can open. No "as we discussed".
- **Read-only on the tracker.** This reflex reads and reports; opening an issue is
  a separate, deliberate act with its own gate.
- **Silence the settled.** A closed decision or a healthy sibling gets one line or
  none. A briefing that buries the open question is a log.

## Verification

Before finishing:

1. The anchor was identified, or its absence stated — and if absent, whether the
   re-deriving signal fired.
2. Every sibling read is reported with what it established **and** what it
   rejected, not just its title.
3. The root is explicitly marked confirmed or falsified. Neither is a non-answer;
   leaving it unstated is.
4. Nothing in the report needs pre-decay memory or an unglossed coined term to
   parse.
5. Anything that would have been a new issue is carried as a candidate instead.
