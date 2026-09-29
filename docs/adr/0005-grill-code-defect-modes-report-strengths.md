# `grill-code`'s defect modes report a capped list of Strengths, not findings only

`grill-code`'s four defect modes (security, common-component extraction,
refactoring, performance) originally emitted **only** findings — scored problems,
ranked P0–P3. A scan that exclusively hunts problems has a confirmation bias: with
"find the defect" as the only lens, a borderline-but-fine spot gets inflated into a
Low finding, because the scan has no way to *conclude* a spot is clean — only to
flag it or silently drop it. The report then reads as if everything is a problem,
which both misleads the reader and erodes trust in the genuine high-severity
findings.

So each defect-mode report now closes with a short **Strengths** section: at most
the top 2–3 spots where the mode's own risk *could* have gone wrong and is instead
handled well (e.g. for security, an injection surface closed by consistent
parameterisation). A Strength is the *negative space* of a finding — naming a clean
case is the act of judging it clean, which is the calibration that stops a
borderline spot from being inflated. Strengths carry no Severity/Effort/Priority;
they are not scored, only listed. The Scan step in `SKILL.md` gained a "calibrate as
you go" instruction (real risk vs. handled-well), and the Report step appends the
capped Strengths after the ranked findings.

This applies to the **defect modes only**. `learning` does not fault code (it
explains it, per [ADR-0003](0003-grill-code-learning-mode-uses-its-own-value-axis.md)),
so it has nothing to commend — adding Strengths there would be incoherent.

We chose this over the alternatives:

- **Findings only, plus a discipline note to "not over-flag."** Rejected: a scan
  with no clean-verdict output has nowhere to *record* the judgement that a spot is
  fine, so the bias persists. The act of writing the Strength is what does the
  calibrating; a bare instruction doesn't.
- **An overall grade or summary ("looks solid overall").** Rejected outright — the
  skill bans grades/summaries on purpose (vibe scores are noise). Strengths are
  kept specific, located, and lens-bound precisely so they don't smuggle the banned
  grade back in: each names *where*, *what risk*, and *why it's covered*, the same
  evidentiary bar as a finding.
- **Uncapped / always-on praise.** Rejected: an inventory of everything not broken
  drowns signal exactly as a pile of P3 nits does. Strengths are capped at 2–3 and
  the section is omitted entirely when nothing earns it — manufactured praise is
  treated as a false positive.
- **Opt-in only (report Strengths when asked).** Rejected: the calibration value
  comes from doing it every run; making it opt-in means the default report keeps the
  problems-everywhere bias the change exists to fix.

## Consequences

- Defect reports are no longer purely a problem list. `REFERENCE.md` gains a
  **Strengths** section (the bar, per-mode signals, the cap) and a **Strength
  format**; `SKILL.md`'s Scan/Score/Report steps reference them. This is more to
  read, but it is what makes a clean spot reportable as clean instead of as a weak
  finding.
- The "no overall grade/summary" rule still holds and is now stated more sharply:
  Strengths are specific lens-bound items, not a vibe score. The two rules coexist
  because a Strength must clear a finding-grade evidentiary bar.
- The cap (top 2–3, omit-if-none) is governed by the same noise-control discipline
  as findings, so the addition cannot bloat a report.
- This is a defect-mode-only feature, reinforcing the defect-vs-learning split that
  ADR-0003 established: outputs that presuppose "something could be wrong here"
  belong to the defect modes, not to `learning`.
