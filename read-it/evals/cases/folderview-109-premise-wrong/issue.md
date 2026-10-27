# test(example): tooltips in the Room paint inside the window at 1:1

## Parent

#98

## What to build

Tooltips stay correct when the maintainer checks them in the Room. In the framed modes, `PreviewStage` gives the stage its own `Overlay`. 0.3.0's notes say the Room adds none of its own. So a label tooltip or a row card opened in the Room paints in whatever `Overlay` is above it.

Read which one that is from the 0.3.0 source (raw, pub cache). Pin the behaviour with tests, and record it in the example map note. This is the one place 0.3.0 touches this package's own surfaces.

## Acceptance criteria

- [ ] Which `Overlay` a tooltip in the Room paints into is read from the 0.3.0 source, and written in the example map note with the symbol names
- [ ] Through the shell harness: a label tooltip opened in the Room paints inside the window, at 1:1 (not scaled)
- [ ] The same for a row-card tooltip (`rowTooltipBuilder`)
- [ ] Each new test is seen failing against a mutation, recorded in the PR body
- [ ] Any defect found in the template is reported upstream, not worked around here

## Blocked by

- #108

