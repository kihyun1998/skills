# `grill-code`'s learning mode scores on its own Value axis, not the defect priority matrix

`grill-code`'s four original modes all hunt defects and share one scoring shape:
**Severity × Effort → Priority (P0–P3)**. The `learning` mode is the first
non-defect mode — it explains AI-written code (function, behavior, structure,
coupling, intent) so a human can catch up on what the code does, rather than
faulting it. Because nothing is being fixed, "how much does it hurt if left
unfixed" (Severity) and "cost to fix" (Effort) have no meaning for a learning
item. So `learning` does not use the shared matrix. Each **Lesson** is scored on
a single **Value** axis — Core / Notable / Nice-to-know (how central it is to
understanding the scope) — and the Score and Report steps in `SKILL.md` branch on
defect-vs-learning. This is the same tension that deferred `learning` past v1
([REFERENCE → Mode extensibility](../../retired/grill-code/REFERENCE.md)); we resolved it
by giving the mode its own axis rather than dropping it.

We chose this over the alternatives:

- **Force `learning` into the P0–P3 matrix** by inventing a second axis (e.g.
  "learning difficulty") to stand in for Effort. Rejected: the axis is contrived,
  "P0 Lesson" reads as a defect priority when nothing is wrong, and it would
  mis-signal urgency where the mode only ranks comprehension value.
- **Leave `learning` out** (the v1 deferral). Rejected: the need is real and
  current — AI now writes much of the code and the human falls behind on how it
  behaves; a comprehension mode is exactly the gap.
- **Ship `learning` as a separate skill.** Rejected: it reuses grill-code's
  machinery wholesale — mode pick, scope settling, the report-only constraint,
  the noise-control rules — so it belongs as a mode, not a fork.

## Consequences

- `grill-code` no longer has one uniform scoring shape. `REFERENCE.md`'s "scoring
  shape" section and `SKILL.md`'s Score/Report steps now branch on
  defect-vs-learning. That is slightly more to read than a single rubric, but it
  is honest — a forced-uniform matrix would have lied about what `learning` ranks.
- This sets the extensibility precedent, recorded in REFERENCE's "Mode
  extensibility" note: a future non-defect mode (e.g. test readability,
  documentation) defines its own axis in its section and adds the same
  Score/Report branch, instead of contorting into Severity/Effort.
- `learning` often explains *intent* it cannot verify — the author may have been
  an AI, so the "why" is a reconstruction. The mode carries an `Inferred:`
  discipline (mark reconstructed rationale rather than stating it as fact) so it
  does not teach guesses as settled truth. The mode's accuracy is therefore
  bounded by that discipline, the way security's accuracy is bounded by its
  reachability caveat.
