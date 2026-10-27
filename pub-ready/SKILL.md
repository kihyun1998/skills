---
name: pub-ready
requires: [firsthand]
description: "Ready a Dart or Flutter package for pub.dev, up to the publish command. Use when preparing a pub.dev release."
---

# pub-ready — everything but the publish

The bar the maintainer sets for the packages they publish, held once here
instead of in each package's `CLAUDE.md`. **The repo's own guidance outranks
it**: a package's `CLAUDE.md`, release note or map note that asks for more — a
consumer round trip, an eyeball pass on the example — adds to this, and one that
asks for something different wins.

## Whether this repo uses it

Read the *Release* line in `docs/agents/thegraph.md` before anything else.
`grill-the-graph` writes it from the maintainer's answer.

| The line | Then |
|---|---|
| `pub-ready` | run it |
| `None.` | the maintainer chose another way to release this repo: say so, and run it only if they ask again knowing that |
| no line, or no build | nobody has chosen yet: say so, name `/grill-the-graph` as where the choice is recorded, and ask whether to run it this once |

**Publishable** means a `pubspec.yaml` with no `publish_to: none`. A workspace
holds one per package; run this once per publishable one.

## The line this never crosses

`dart pub publish` and `flutter pub publish` are **the maintainer's**. pub.dev
keeps every version forever and the only undo is a retraction, so this ends with
the command written out for them to run. Tagging waits for the same go-ahead:
the tag lands after the docs, on the commit that is published.

## What is published, read first

Query `https://pub.dev/api/packages/<name>` — raw JSON — for the versions already
out. It settles three things below that a guess gets wrong: whether the pubspec
version is new, which CHANGELOG entries are frozen, and what changed since the
last release (`git log` from that version's tag, or its commit where no tag
exists). A package pub.dev does not know yet is a first release; say so.

## Checks

Each ends on a stated result. Report every one, including the ones that passed.

1. **pubspec.yaml.** The version is newer than every published one and its size
   matches what changed since the last release, read against the diff rather
   than the CHANGELOG. In `0.x` a caret stops at the minor (`^0.4.0` does not
   accept `0.5.0`), so a fix shipped as a minor reaches nobody pinned with a
   caret. The `environment` floor moves only in a minor or major, with its
   reason recorded where the repo records reasons. `description`, `repository`,
   `issue_tracker` and `topics` are checked against pub.dev's own rules, read
   raw (`firsthand`): `dart pub global run pana` where it is installed, which is
   the scorer itself, and the pubspec page on dart.dev otherwise.
2. **CHANGELOG.md.** Its newest heading is the pubspec version. Every behaviour
   change since the last release has a line, matched commit by commit. **A
   published entry is never rewritten** — pub.dev snapshotted it — so a fix to
   one goes into the new entry.
3. **README.md.** The install line names the new version or a range that takes
   it. Every API name and parameter the README shows exists in `lib/` at this
   version — grep each one. A behaviour the release changed reads as it does
   now. The example the README points at runs against this version.
4. **Gates, bare**: no pipe or filter on any of them. The CI workflow is the list: run each of its steps
   locally, in each directory it runs them in. Where the repo's guidance says CI
   gates nothing, the gate list that guidance names is the list instead. Then
   the ones the list does not reach, each run on its own:
   - `flutter pub get` (or `dart pub get`) in the package and in `example/`,
     first — `dart format` reads the language version from the resolved
     package config, and a stale one passes locally and fails in CI
   - `dart format --output=none --set-exit-if-changed` over what CI formats,
     and `example/` where CI skips it
   - `flutter analyze` in `example/` where CI skips it
   - `dart pub publish --dry-run` (or `flutter pub publish --dry-run`), on a
     clean tree: **0 warnings**, and its file list read — a `.pubignore` turns
     `.gitignore` off for the archive, so `coverage/`, `build/` and any other
     directory a run creates has to be listed there
5. **Clean tree.** `git status --short` prints nothing once the release commit
   is made. The dry-run in 4 is the one that counts only if it ran on that tree.

A check that fails is fixed, and the gates from 4 run again after the fix. A
fix that would mean moving a floor, a threshold or a published entry goes to
the maintainer instead.

## Handing over

Report the version, each check with its result, and the dry-run's warning count
and archive size. Then the commands, in order, for the maintainer to run:

```sh
dart pub publish          # flutter pub publish for a Flutter package
git tag v<version> && git push origin v<version>
```

Use the tag shape the repo's existing tags use. Where any check failed and was
not fixed, say which, and write no command.
