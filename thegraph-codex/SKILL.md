---
name: thegraph-codex
description: "Carry a tracked code change from understanding through proportionate verification. Use when explicitly invoked for a feature, bug fix, or refactor that needs a disciplined end-to-end pass."
---

# thegraph-codex

Take a change to a verified, reviewable result while preserving Codex's autonomy.
Use this as an explicit workflow: it is deliberately not a mandatory wrapper for
ordinary edits.

## Establish the work

1. Read the applicable `AGENTS.md` files and every document they explicitly
   designate. Treat the request or referenced issue as the intended outcome.
2. Inspect the affected implementation, tests, callers, and existing decisions.
   When an outside API, standard, or fact bears on the implementation, consult
   its primary source before relying on it.
3. State the working interpretation: the outcome, constraints, affected
   surfaces, and the smallest sensible route to a result. Keep it brief and
   proceed when the repository and request settle the work.

## Decide at the right boundary

Derive implementation details from the code, tests, repository guidance, and
verified sources. Ask the user only when the answer changes product intent,
public behaviour, scope, naming or structure preference, or an external action
that has not been authorized.

Keep mechanisms where the complete state and invariant can be enforced. Keep
consumer-specific policy outside that mechanism. If a local workaround appears
to mask a deeper defect, identify the boundary and present the evidence before
choosing a direction.

## Implement and prove

Make the smallest complete change. Keep the edit focused on the established
outcome and preserve unrelated working-tree changes.

- When writing or changing a behavioural test, name the assertion that observes
  the change and run a minimal counterfactual: disable or plausibly alter the
  relevant behaviour and confirm that assertion fails. Restore the intended
  implementation before continuing.
- For prose, configuration, or mechanical changes with no executable behaviour,
  use direct inspection and the applicable repository checks instead.
- Use specialized security review when the change affects authentication,
  authorization, secrets, untrusted input, permissions, network boundaries, or
  when the user requests it. Select an available Codex-native review tool; this
  skill has no hard dependency on a particular platform skill.

## Verify proportionately

Run the narrowest relevant formatter, type check, test, build, or other
repository gate first. Broaden verification when the change's surface or a
failure warrants it. Review the final diff for unintended edits and update
documentation or public API descriptions that the changed behaviour makes stale.

Do not create or change issues, pull requests, tracker entries, releases, or
other external records unless the user requested that action. Collect any
follow-up observations for the final report instead.

## Report

Finish with:

- the outcome and changed surfaces;
- verification actually run and its result;
- decisions that required user direction, if any; and
- relevant risks, follow-ups, or checks deliberately not run.

Report only observations supported by command output, inspected files, or
primary sources.
