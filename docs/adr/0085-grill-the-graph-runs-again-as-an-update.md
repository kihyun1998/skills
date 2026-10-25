# ADR-0085 — grill-the-graph runs again as an update, and rebuilds when asked

**Status:** accepted.

Ends the build's *"never rebuilt"* rule (GLOSSARY *Build*, the skill's *The build
grows* section). The build still grows by being appended to; nothing else in
that rule changes.

`grill-the-graph` reads disk to decide which run it is. With no
`docs/agents/thegraph.md` it runs **init**, the setup it always did. With one, it
runs **update**: References are not asked again and the build is kept, and every
piece setup installs — the comment rule, the map hub, the settings block, the
`pre-push` hook, the exclude lines, `CLAUDE.local.md` — is compared with the
skill's current text and brought up to it. Both an update and a rebuild then
search for what points at the setup (`git grep` for the paths it writes) and fix
lines that no longer resolve. The argument `init` forces **init over an existing
setup**: the build is written again as if none existed, the old one shown beside
the new, and nothing is overwritten without the maintainer's approval. An older
generated build still goes to `salvage` before either.

Own or contributor stays the maintainer's to name. On update, what the earlier
run left is added to the recommendation, never taken as the answer.

## The call, and whose it was

The maintainer's, on 2026-10-25: a repo set up once has to be brought up to date
by running the skill again, and a rebuild is allowed with their approval. They
chose `init` as a second argument that forces the rebuild, with disk deciding
otherwise, and they asked that the rebuild find and repair the links to the old
setup.

## What it was decided on

- **Setup now installs pieces that change.** The skill once wrote one prose file.
  It now also writes a comment rule, a map folder and three attribution pieces,
  and seven of its last commits changed the attribution hook. A repo set up
  before those commits had no way to get them except by hand.
- **"Never rebuilt" assumed nobody changes their mind.** The build goes stale
  only when someone does, and with no rebuild path the only remedy was editing
  the file by hand. A rebuild that needs approval covers that case without
  letting a run overwrite a person's answers on its own.
- **Disk decides, the way it does for `grill-map`.** A file that exists is a
  repo that was set up. `init` is the one argument that changes the result, so
  it is the only one that counts.
