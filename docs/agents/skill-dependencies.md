# Skill dependencies declared outside this catalog

Skills in this repo name other skills in their prose. Most of those names resolve
to this catalog; nothing checks that they still do, since
[ADR-0066](../adr/0066-there-are-no-gates.md). The ones that do not resolve here
are declared below, because the repo cannot derive them:
*"not in this catalog"* is not an error and never was.

This file is **data**. Acquiring a dependency is a row here, never a Python edit.

## Why each column exists

- **Skill** — the name as it appears in the referring skill's prose. This is the
  string that stops resolving when upstream renames it.
- **Namespace** — where the skill lives, and therefore whether a check against
  see it at all. Two values, and the distinction is load-bearing:
  - `user` — installed under `~/.claude/skills`, so it is checkable on disk.
  - `platform` — bundled with Claude Code and invocable, with **no file on
    disk**. Read it as *not checkable*, never as absent. Without
    this column a working dependency reads as a missing one, and a check that
    fails for a reason that is not a defect is a check people learn to bypass.
- **Upstream** — where it comes from. When a name stops resolving, this is the
  only place the answer lives. `/gate`'s outage is the case in point: the skill
  had been renamed upstream and nothing here recorded which upstream to ask.
- **Why** — what this repo loses if the dependency is gone. A row without this
  cannot be triaged; *"something referenced it"* is not a reason to keep it.
- **Identity** — a phrase from the dependency's own description that a rename
  does not change. This is what lets a reader tell *"renamed upstream"* from
  *"not installed on this machine"* instead of reporting both and guessing.
  `review` became `code-review` at 99% similarity: the name moved, the contract
  did not.

## How this relates to a skill's own `requires:`

A skill declares what it **invokes** in a `requires:` key in its own `SKILL.md`
frontmatter. This file declares what lives **outside this catalog**. The two
overlap only where a skill invokes an external one, and they answer different
questions:

- `requires:` -- *what does this skill call?* Only the author knows.
- this file -- *where does a name that is not in this catalog come from?* Only
  the repo can be told.

A name can be here without being in any `requires:`. That is the **boundary
reference** case: `grill-code` names `improve-codebase-architecture` to say a
rearchitecture is that skill's job, not its own. The name must resolve, so it is
declared here; nothing invokes it, so it is declared nowhere else. A row no
skill requires is the normal case for one, not a defect.

## Declared externals

| Skill | Namespace | Upstream | Why | Identity |
|---|---|---|---|---|
| `code-review` | `user` | mattpocock/skills — installed by hand, not by this repo's installers | `gate` (the Acceptance Gate) is built on its two-axis report and states the dependency as a hard stop; without it the Gate cannot produce a verdict | Standards (does the code follow this repo's documented coding standards?) |
| `tdd` | `user` | mattpocock/skills — installed by hand, not by this repo's installers | `make-it` calls it for what a good test is, where seams go, and the anti-patterns; without it the writing step has only `redden`, which asks whether a test can fail and not whether it was worth writing | Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor" |
| `security-review` | `platform` | bundled with Claude Code; no file under `~/.claude` | `check-it` calls it for the one axis nothing in this catalog covers. `assay` reads for shape and `silt` for cost; neither reads for an attacker | Complete a security review of the pending changes on the current branch |
| `improve-codebase-architecture` | `user` | mattpocock/skills — installed by hand | `grill-code` scopes itself against it: architecture-level redesign is out of `grill-code`'s scope precisely because this skill owns it | Scan a codebase for deepening opportunities, present them as a visual HTML report |
| `artifact-design` | `platform` | bundled with Claude Code; no file under `~/.claude` | `brief` must load it before writing any Artifact page, which is a platform requirement rather than a preference | Design guidance and fundamentals for Artifacts |
| `writing-for-agents` | `user` | installed by hand under `~/.claude/skills`; upstream not recorded | `winnow` loads it for the levers it applies — pointers, disclosure, pruning, positive phrasing; without it the procedure has no stated standard for how the cut document should read | Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md |
| `nit` | `user` | `kihyun-work-skills` — this maintainer's work catalog, installed by its own `scripts/install-skills.*` ([ADR-0078](../adr/0078-work-skills-move-to-their-own-repo.md)) | Nothing here invokes it. Decision records here, `skill-authoring.md` and `scripts/desc-audit.py` cite it as the worked example of a length budget reset, a human stop, and the invocation-placeholder shape; without it those examples point at nothing | Single entry point for all NIT tracker work |
| `unregistered-archives` | `user` | `kihyun-work-skills`, as above | Nothing here invokes it. ADR-0027 and ADR-0049 cite it as the skill whose paths a retirement had to keep resolving | Find archived features in the consuming repo that never reached the NIT tracker |

`to-external-issue`, `weekly-digest` and `unexported-archives` are named in the
records above too. They are not rows: they are retired, so nothing installs them
anywhere, and they resolve to `kihyun-work-skills`'s `retired/` — the same
answer `retired/` gives here for a retired skill that stayed.

## Checking an external by hand

`--resolve` did this and is gone with the rest of the gate
([ADR-0066](../adr/0066-there-are-no-gates.md)). It read `~/.claude/skills` —
the developer's own machine, because that is the only place an **upstream
rename** is visible, and nothing in this repo records one.

Doing it by hand, when a `user` external stops working: search the installed
catalog for the row's **Identity** phrase rather than its name, and one of two
things comes back.

- A skill carrying that identity under a different name — **an upstream rename**.
  Update the row.
- Nothing carrying it — **not installed on this machine**. The Upstream column
  says where to look.

Renamed *and* substantially rewritten in one move reads as both, and neither
reading is safe to pick without opening the skill.

A `platform` external is never resolvable from disk at all. Acquiring one is
still the moment the dependency gets written down here, since nothing else will
notice it.
