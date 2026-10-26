# ADR-0086 — the pub.dev release bar is one skill, and each repo chooses it at setup

**Status:** accepted.

`pub-ready` holds the checks the maintainer wants before a Dart or Flutter
package goes to pub.dev: pubspec, README and CHANGELOG read against the package
and against what pub.dev already has, the CI steps and the gates CI does not
reach run bare, the dry-run at 0 warnings on a clean tree, and the publish
command handed over rather than run. A package's own guidance adds to it and,
where the two differ, wins.

**Each repo chooses it once, at setup.** In a repository of the maintainer's own
holding a publishable package, `grill-the-graph` asks whether `pub-ready` is its
release bar, recommending it when the package is open source — public on GitHub
with a `LICENSE` at the root. The answer goes in the build as a *Release* line,
`pub-ready` or `None.` On `pub-ready` it offers, in the same approval, to
replace each older copy of the bar with a pointer, keeping every line only that
package has.

**It runs when a release is being prepared**, and reads that line first: it runs
where the line names it, stops where it says `None.`, and asks where there is no
line yet. No ordinary change runs it.

## The call, and whose it was

The maintainer's, on 2026-10-26: the bar was being restated to an agent before
every release of every package. They chose one skill held in this catalog,
recommended by `grill-the-graph` when it judges a repo to be a Flutter
open-source package, triggered by a release request, and cleanup offered on the
next `grill-the-graph` run over a sweep of every repository now.

## What it was decided on

- **The bar had already been copied, and the copies had diverged.** Measured on
  2026-10-26 across the maintainer's checkouts: `ffi_url_launcher` and
  `flutter_checkbox` held it in `CLAUDE.md`, `flutter_folderview` in
  `docs/agents/release.md`, `flutter_password_input` in a map note, and
  `just_tooltip` in a section of its build; `flutter_syntax_highlight` and
  `flutter_table_plus` listed the dry-run among their commands. The core agreed;
  each copy had lines the others lacked, and most packages had none.
- **The line records a choice, not the pubspec.** Whether a package publishes is
  on disk, and a line saying only that would fail the build's second condition.
  Whether `pub-ready` is how it is released is the maintainer's answer: a
  package can be publishable and released another way. `None.` is kept for the
  same reason it is under References — it records that the question was put.
- **Two placements were tried and rejected the same day.** The first version
  gave `check-it` a row running this whenever a change touched `pubspec.yaml`,
  `README.md` or `CHANGELOG.md`; packages such as `flutter_checkbox` add a
  CHANGELOG entry with every behaviour change, so it ran the release bar on
  ordinary work. The second dropped the build line and left the skill to fire
  in any Dart repo on a release request, which put no choice in the
  maintainer's hands at setup. The maintainer rejected both: setup recommends
  it, the maintainer accepts it, and a release runs it.
- **pub.dev's own rules are read, not restated.** The skill names `pana` and the
  dart.dev pubspec page as where field rules come from; a copied limit would be
  the next stale copy.
