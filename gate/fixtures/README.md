# gate — golden scenario fixtures

These fixtures are the regression baseline for the verdict decision tree in
`../REFERENCE.md`. They are **plain data files**, not executable tests — the
gate is a skill, so it is verified by re-deriving each fixture's verdict by
hand against the decision tree.

## How to verify the skill

For each fixture below:

1. Read the fixture. It contains a sample `code-review` output (a Standards report
   and a Spec report) plus, for the circuit-breaker case, the prior verdict
   comments on the issue.
2. Apply the decision tree in `../REFERENCE.md` to that input.
3. Confirm the verdict you derive matches the **Expected verdict** the fixture
   states.

If any fixture's derived verdict drifts from its stated expected verdict after
a change to `SKILL.md` or `REFERENCE.md`, the change broke the decision tree.

## Fixtures

| Fixture                          | Expected verdict | Exercises                                              |
|-----------------------------------|------------------|--------------------------------------------------------|
| `pass.md`                         | Pass             | 0 hard violations, 0 missing requirements; nits only   |
| `rework.md`                       | Rework           | Mechanical, locally-fixable findings with spec citations |
| `respec.md`                       | Respec           | A Spec finding `code-review` could not cite a spec line for |
| `escalate.md`                     | Escalate         | A finding needing architectural judgement / trade-off  |
| `circuit-breaker.md`              | Escalate         | Mechanical findings, but N prior Rework verdicts        |

Coverage: one fixture per verdict, plus the circuit-breaker override. Each
fixture states its expected verdict explicitly and names the decision-tree
rule that produces it.
