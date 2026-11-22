# Release

Read only in your own repository, and only where it holds a publishable Dart
package — a `pubspec.yaml` with no `publish_to: none`. The build then has a
third section, `## Release`, with one line under the heading: `pub-ready`, or
`None.`

**Whether a package publishes is on disk; whether `pub-ready` is its release bar
is not.** A package can be publishable and released some other way, or not yet
released at all, so the line records the maintainer's choice and clears
condition 2 of *What earns a place in it* in [SKILL.md](SKILL.md). [`pub-ready`](../pub-ready/SKILL.md) reads it (condition 3): it runs
where the line names it and stops where the line says `None.` `None.` records
that the question was put, as it does under References, so an update does not
ask it again.

Where the answer is `pub-ready`, the copies of the release bar written before it
are sorted in the same approval. Read each place a release rule lives —
`CLAUDE.md`, `docs/agents/release.md`, a map note on releasing, another section
of `docs/agents/thegraph.md` — and sort every line:

| The line | Goes |
|---|---|
| says what `pub-ready` says — the dry-run bar, who publishes, frozen CHANGELOG entries, `pub get` before `dart format` | replaced by one pointer: *Before a release, run `pub-ready`.* |
| says more, or something only this package has — an SDK floor's reason, a `.pubignore` trap, a consumer to round-trip, a manual check | stays where it is |
| contradicts `pub-ready` | stays, since the repo's guidance wins, and is named in the closing report |

Where the answer is `None.`, no copy is touched.


## At §4: the question

`pub-ready` or `None.` Recommend `pub-ready` when the package is open source —
`gh repo view --json visibility` reads `PUBLIC` and a `LICENSE` is at the root —
and `None.` otherwise. Where `gh` cannot answer because the repo has no GitHub
remote, the recommendation is still `None.`, and it says *no GitHub remote, so
whether it is public is unknown* rather than *not public*. Show what `pub-ready`
would replace beside the option, from the sort above, so the answer is given
knowing what it changes.

## At §5: show it, then check it

Where the answer is `pub-ready`, show each copy of the release bar it replaces,
old line beside its pointer, with the rest of §5's approval. After writing, check
by reading, since the line is judged: the build has a *Release* line, and each
copy of the release bar reads as approved — the pointer, or the line kept.
