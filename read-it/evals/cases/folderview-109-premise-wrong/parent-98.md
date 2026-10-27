# chore(example): move the shell to flutter_example_template ^0.3.0

## Parent

#74

## Problem Statement

The example's shell is on `flutter_example_template` 0.2.0, while the sibling `flutter_table_plus` example is on 0.3.0. Under `^0.2.0` the example cannot resolve 0.3.0: a caret on a 0.x version stops at the next minor. So the maintainer cannot use what 0.3.0 adds.

Every stage mode in 0.2.0 shrinks a named viewport to fit. The desktop viewport draws at 0.589× in a 1440 × 900 window. A `FolderView` there is never seen or touched at real pixels. That matters most now: 0.12.0's wheel motion is meant to be felt before release, and row height, scrollbar size and hover all look different when scaled down. The two examples also behave differently in the shell they share.

## Solution

Move the example to `flutter_example_template` `^0.3.0`, as `flutter_table_plus` did. The viewport bar then offers **Room**: the stage region at its own size, at 1:1, with no scaling. The maintainer can pick it on any destination, including Every setting → Smooth wheel, and use the `FolderView` at real pixels. The shell still opens on the desktop viewport. Nothing else in the example changes.

## User Stories

1. As the maintainer, I want a Room mode in the viewport bar, so that I can use a `FolderView` at real pixels instead of a scaled-down preview.
2. As the maintainer, I want to feel the wheel motion in Every setting → Smooth wheel at 1:1, so that I judge the motion I actually ship and not a 0.589× copy of it.
3. As the maintainer, I want rows, icons and scrollbars at their real size in the Room, so that I can judge row height, hit targets and hover the way a consumer's user will meet them.
4. As the maintainer, I want the Room offered on every destination (Every setting, recipes, scenarios), so that no page is stuck in a scaled preview.
5. As the maintainer, I want the shell to keep opening on the desktop viewport, so that the first impression does not change.
6. As the maintainer, I want the Device Wall and the three named viewports to behave as before, so that responsive checks still work.
7. As the maintainer, I want a stage's own body told the viewport it is drawn in, so that any future `MediaQuery` branch in a stage takes the arm the viewport calls for.
8. As the maintainer, I want the stage toolbar to scroll sideways in a narrow window instead of overflowing, so that the Room segment does not break small windows.
9. As the maintainer, I want the label and row-card tooltips to still paint correctly in the Room, so that tooltip checks can be done at 1:1 too.
10. As the maintainer, I want the 100k-child scenario to remain usable in the Room, so that the large-tree performance check is not lost.
11. As the maintainer, I want both examples on the same template version, so that one mental model of the shell covers both repositories.
12. As the maintainer, I want the coverage guard, the recipe seam and the settings-render test to stay green across the bump, so that I know nothing regressed.
13. As a contributor, I want the example map note to describe 0.3.0, including the Room's overlay situation, so that the next change reads the shell as it is.
14. As a contributor, I want #74's anchor to name the current shell version, so that the umbrella spec is not stale.
15. As a consumer reading the example, I want nothing in `package:flutter_folderview` to change, so that the bump is invisible to the library.

## Implementation Decisions

- **Dependency.** The example's `flutter_example_template` constraint goes from `^0.2.0` to `^0.3.0`, and the example lock is refreshed. 0.3.0 is additive: no public API was removed or renamed.
- **The Room needs no code here.** `ShellPage` in 0.3.0 offers it on every destination by itself (`ViewportBar.roomId`, labelled "Room · the stage at 1:1"). This change adds no example code to enable it.
- **Builder context.** The example reads `MediaQuery` nowhere in `example/lib`, so 0.3.0's builder-context fix has nothing here to act on. Re-check this at work time; it was true on 2026-09-23 and 2026-10-17.
- **Overlay in the Room.** In the framed modes, `PreviewStage` gives the stage its own `Overlay`. 0.3.0's notes say the Room adds no overlay of its own. A tooltip in the Room therefore paints in whichever `Overlay` is above it. Read this from the 0.3.0 source and record it in the example map note; it is the one behaviour change that touches this package's surfaces (label tooltip, row card).
- **No feature changes beyond the shell.** Light/dark stays pinned to light (#90). `window_manager` stays (#91). No chrome font (see Out of Scope).
- **Docs.** The example map note's Reference behaviour moves from 0.2.0 to 0.3.0 and gains the Room. #74's body is updated to name `^0.3.0`.

## Testing Decisions

- **One seam: the example shell harness** (`pumpShell`, `openDestination`, `openFeature`, `renderedFolderView`) over the real `ShellPage`. Do not reach into `PreviewRoom` or `FolderViewContent`.
- A good test asserts what the maintainer sees: after choosing the Room in the viewport bar, the rendered `FolderView` is laid out at the stage region's own size with no scaling transform between it and the window. Do not assert which template widget is used.
- Cases:
  - The Room is offered on Every setting and on a recipe destination.
  - In the Room, the `FolderView`'s global rect matches its laid-out size: scale 1. In the desktop viewport it is smaller than its laid-out size, as the control.
  - A label tooltip opened in the Room paints inside the window and at 1:1, so the overlay situation above is pinned by a test, not just prose.
  - The existing suite passes unchanged: coverage guard, recipe seam, settings render, interaction, data/view mode, smooth wheel.
- **Prior art:** the probes recorded in the example map note (a label tooltip in a preview frame, measured through the real `ShellPage` and its viewport bar) and `flutter_table_plus`'s example tests after its own 0.3.0 bump. Each new test is seen failing against a mutation, for example forcing the desktop viewport where the Room was chosen. Record the mutation in the PR body.

## Out of Scope

- **The Pretendard chrome font** that the `flutter_table_plus` example uses. It brings four font assets, a subset script and a glyph-coverage test, and it is a styling choice, not a template version gap.
- **Light/dark presets and theme injection:** #90.
- **Retiring the legacy panel and deciding on `window_manager`:** #91.
- **Restructuring the example toward `flutter_table_plus`'s playground / recipe-with-knobs model.** This example's Every setting + coverage guard design is #74's, and it diverges on purpose.
- **Any change to `package:flutter_folderview`.**

## Further Notes

- Measured on 2026-10-17 with `example/pubspec.yaml` set to `^0.3.0` in the working tree (not committed): `pub get` moved 0.2.0 → 0.3.0, `flutter analyze` reported no issues, and `flutter test` passed 63, 0 failed. The 2026-09-23 measurement in this issue's first version gave 56 / 0 on the smaller suite of the time.
- The working tree also holds macOS runner files (`Podfile`, `Podfile.lock`, Xcode project and scheme) and an `analysis_options.yaml` exclude block, all written by Flutter tooling during a local run. The maintainer has said they may be committed; they can ride along with this change as a separate commit.
- Do this before publishing 0.12.0 if the maintainer wants to check the wheel motion at 1:1.

