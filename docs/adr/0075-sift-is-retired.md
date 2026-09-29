# ADR-0075 — `sift` is retired, and `decant` is the one comment pass

**Status:** accepted.

> **Amended.** `retired/sift/` was later deleted outright, fixtures and all,
> before the repository went public: its fixtures quoted a private work
> repository's source. The skill is gone from the tree; this record is what
> remains of it.

`sift` moves to [`retired/`](../../retired/) and is no longer installed, by the
mechanism [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)
established — the folder move *is* the uninstall.

## The call, and whose it was

The maintainer's, made while `decant` was being cut down for length: *"개선하자
sift 없앨거임."* A product judgement, like
[0058](0058-grill-code-is-retired.md), [0059](0059-to-deck-is-retired.md) and
[0070](0070-promote-is-retired.md). Reversing it costs one `git mv`.

## What made it a small call

Two skills read the same material — comment paragraphs — under opposite policies.
`sift` kept three kinds in place and asked its keep-questions first; `decant`
keeps one and asks its drop-question last. Each spent lines explaining the other,
and `decant`'s own record ([ADR-0076](0076-a-comment-says-what-the-code-is.md))
already recorded that a single ordering cannot serve both. With the maintainer on
the one-bin policy, `sift` was the policy not in use.

## What does not carry over

Recorded so a reversal knows what it would get back, not because any of it is
owed to `decant`:

- **The L1/L2/L3 guard layers** for a measured constant, and the promotion list
  they produced. Under one bin the value moves to the note rather than staying to
  be promoted.
- **Strandings** — a paragraph whose subject is not what follows it.
- **The hazard-marker measurement** (recall 9.5%, precision 60% on a ~900-file
  repository) and the twenty fixtures, already withdrawn as a baseline.
- **The two-occurrence bar.** [ADR-0070](0070-promote-is-retired.md) left it
  stated in `sift` for the `SYSTEM` disposition, which must not become a decision
  record on one paragraph. `decant` proposes no records — `DECIDED` is a link to
  one that exists — so the bar has **no live holder**. It stays readable in
  `CONTEXT.md`'s retired **Trigger** entry.

## What changed with it

- `sweep` named `sift` as the pass for a header grown past being read; it names
  `decant`, whose description now carries that trigger.
- `plat` named `sift` as the owner of comment paragraphs; it names `decant`.
- `README.md`, `retired/README.md` and `CONTEXT.md` mark it retired.
