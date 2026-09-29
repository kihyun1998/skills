# retired/

Skills that are no longer installed.

The install scripts scan **top-level** directories for a `SKILL.md`, so a skill
under `retired/` is not linked into `~/.claude/skills`, and re-running the script
prunes the link it used to have. Moving a folder in here **is** the uninstall;
there is no list to edit.

They stay in the repo, readable, because the artifacts they wrote still exist in
other repositories and someone reading one of those needs to be able to read the
skill that produced it. A retired skill is frozen: no fixes, no new precision.

| Skill | Retired because | Successor | Decision |
|---|---|---|---|
| [`theflow`](theflow/) | Succeeded by a method that carries every rule it held | [`thegraph`](../thegraph/) | [ADR-0019](../docs/adr/0019-theflow-is-frozen-thegraph-inherits-by-copy.md), [ADR-0027](../docs/adr/0027-retirement-moves-a-skill-to-the-retired-folder.md) |
| [`grill-the-flow`](grill-the-flow/) | The setup half of `theflow`; its successor **compiles** the bindings it wrote | [`grill-the-graph`](../grill-the-graph/) | [ADR-0027](../docs/adr/0027-retirement-moves-a-skill-to-the-retired-folder.md) |
| [`checkup`](checkup/) | Only one of its three tiers ever ran, and never through the skill | [`scripts/map/check_map.py`](../scripts/map/) | [ADR-0033](../docs/adr/0033-checkup-retires-and-its-script-is-promoted.md) |
| [`grill-code`](grill-code/) | The maintainer stopped using it — nothing measured it defective and nothing superseded it | — | [ADR-0058](../docs/adr/0058-grill-code-is-retired.md), ADR-0027 |
| [`to-deck`](to-deck/) | As above, called immediately after it; also settles the `/grill-me` alias two skills were claiming | — | [ADR-0059](../docs/adr/0059-to-deck-is-retired.md), ADR-0027 |
| [`promote`](promote/) | Records would pile up faster than they earned their place, and nothing counted its triggers any more | none — the two-occurrence bar was stated in `sift`, now retired and deleted too, and has no live holder ([ADR-0075](../docs/adr/0075-sift-is-retired.md)) | [ADR-0070](../docs/adr/0070-promote-is-retired.md), [ADR-0027](../docs/adr/0027-retirement-moves-a-skill-to-the-retired-folder.md) |
| [`tickets`](tickets/) | Over-engineered on the maintainer's read, and its one measured run marked **every** entry `derived` — which licenses nothing, and is [ADR-0045](../docs/adr/0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md)'s own falsification condition | — the schema it filled stays live in [`thegraph`](../thegraph/) and is read wherever a contract is written | [ADR-0069](../docs/adr/0069-tickets-is-retired.md), ADR-0027 |
| `sift` (deleted) | The maintainer took the one-bin policy for comments; `sift` was the three-bins-stay policy not in use | [`decant`](../decant/) | [ADR-0075](../docs/adr/0075-sift-is-retired.md), ADR-0027 |

`to-external-issue`, `weekly-digest` and `unexported-archives` were retired here
and moved, with the rest of the NIT work, to `kihyun-work-skills`'s own
`retired/` ([ADR-0078](../docs/adr/0078-work-skills-move-to-their-own-repo.md)).

## What still reads what they wrote

Retiring a skill does not retire its output.

- `grill-the-flow` wrote `docs/agents/theflow.md` into every repo it onboarded.
  Those are live input **until the repo is built into a graph, and residue after**
  — `grill-the-graph` compiles one rather than re-interrogating from scratch,
  which is what makes adopting `thegraph` a compile instead of a migration, and
  that compile is what **consumes** them. A repo already holding
  `docs/agents/thegraph.md` has spent its bindings: nothing reads them, nothing
  maintains them, and whatever they still get wrong is recorded in the graph's own
  compile notes. Deleting them there is the maintainer's call and costs nothing.

## References that point in here

- `checkup` names `retired/theflow/SKILL.md` § *Bindings the skill expects* as the
  schema a `docs/agents/theflow.md` is checked against.
- `tickets` points **out**, not in: it reads `../../thegraph/SKILL.md` for the
  slot list and the provenance values, deliberately, rather than holding a copy.
  It is the one skill here that moved **alone**, so that path was repaired from
  `../` in the same act as the move — ADR-0027's check was that co-moving skills
  keep their relative paths, and this is the case it does not cover.
- Inside this folder, `grill-the-flow` reads `../theflow/SKILL.md`. The two moved
  together, so that path still resolves.
