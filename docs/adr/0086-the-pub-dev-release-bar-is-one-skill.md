# ADR-0086 — the pub.dev release bar is one skill, and nothing records where it applies

**Status:** accepted.

`pub-ready` holds the checks the maintainer wants before any Dart or Flutter
package goes to pub.dev: pubspec, README and CHANGELOG read against the package
and against what pub.dev already has, the CI steps and the gates CI does not
reach run bare, the dry-run at 0 warnings on a clean tree, and the publish
command handed over rather than run. A package's own guidance adds to it and,
where the two differ, wins.

`check-it` runs it when a change touches a publishable package's `pubspec.yaml`,
`README.md` or `CHANGELOG.md`, and a request to prepare a release reaches it
directly. **Publishable is read off disk** — a `pubspec.yaml` with no
`publish_to: none` — so the build gets no line for it: a fact a directory
listing answers fails the build's second condition, the same reason the map's
presence is not written there.

`grill-the-graph`, in a repository of the maintainer's own, finds the copies of
the bar that predate the skill and offers to replace each with a pointer,
keeping every line only that package has, in the same approval as the rest of
the run.

## The call, and whose it was

The maintainer's, on 2026-10-26: the bar was being restated to an agent before
every release of every package. They chose one skill over a release section in
each build, a trigger on a release request and in `check-it` over one on every
change, and cleanup offered on the next `grill-the-graph` run over a sweep of
every repository now.

## What it was decided on

- **The bar had already been copied, and the copies had diverged.** Measured on
  2026-10-26 across the maintainer's checkouts: `ffi_url_launcher` and
  `flutter_checkbox` held it in `CLAUDE.md`, `flutter_folderview` in
  `docs/agents/release.md`, `flutter_password_input` in a map note, and
  `just_tooltip` in a section of its build; `flutter_syntax_highlight` and
  `flutter_table_plus` listed the dry-run among their commands. The core
  agreed; each copy had lines
  the others lacked, and most packages had none.
- **A build line would have been a copy.** The proposal put to the maintainer
  included one line per build naming the skill. It was dropped while writing:
  `check-it` can read the pubspec, and the line could only say what the pubspec
  already says.
- **pub.dev's own rules are read, not restated.** The skill names `pana` and the
  dart.dev pubspec page as where field rules come from; a copied limit would be
  the next stale copy.
