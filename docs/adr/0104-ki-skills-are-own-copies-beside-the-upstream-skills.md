# ADR-0104 — `ki-skills/` holds own copies of upstream skills, beside the originals

**Status:** accepted.

`ki-skills/` is a new top-level folder holding this repository's own copies of fourteen
skills from mattpocock/skills, each named `ki-<name>` (`setup-matt-pocock-skills` is
`ki-setup`). They are copied byte for byte at one commit, and changed only where a copy
names itself or another of the fourteen, so the set calls itself. `ki-skills/UPSTREAM.md`
holds the commit, every file that differs and how to read upstream's changes since.
`scripts/install-skills.sh` links each `ki-skills/<name>` as it links a top-level skill.

## The calls, and whose they were

The maintainer's, in issue #133's grilling and at its confirm stop (2026-11-23):

- **Coexist under a prefix, not replace.** The upstream skills stay installed by hand under
  their own names, and the copies sit beside them as `ki-*`, so changing a copy never
  changes what an upstream name loads, and this catalog's own skills keep calling the
  upstream names (`make-it` calls `tdd`, `design-it` calls `prototype`).
- **A folder of its own kind.** `ki-skills/` rather than fourteen more top-level folders,
  as `herdr-mods/` is its own kind (ADR-0101): the copies have an upstream and a licence
  the rest of the catalog does not.
- **Only the names among the fourteen are renamed.** Other upstream names the copies use
  (`wayfinder`, `improve-codebase-architecture`) stay and are declared in
  `docs/agents/skill-dependencies.md`.
- **Nothing that was not upstream at the commit; the commit only, no sync script;**
  `ki-setup` writes the same files as upstream for now.

## What would reopen it

- Wanting the catalog's own skills to call the `ki-` copies instead of the upstream ones.
- The upstream skills no longer installed by hand, which removes the reason for the prefix.
