# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repo root if it exists — it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `GLOSSARY-MAP.md` at the root):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

## When a decision supersedes an earlier one, say so in the earlier one

A later ADR that supersedes, scopes, or amends an earlier one **adds a banner to
the top of the earlier file** pointing forward. The earlier reasoning is never
rewritten to match — it is the record of why the first answer looked right — but
a reader who lands on it must learn, in the first paragraph, that it is not the
current answer.

Without the banner an obsolete record is indistinguishable from a live one at the
point of use. This repo has measured it: `/nit register`'s length budget (now in
`kihyun-work-skills`) was
reset twice, and for months the two earlier records stated their dead numbers as
current with nothing pointing forward, so reading either one gave the wrong
budget.

**Merge, do not delete, when several records have become layers on one rule.**
If no single record can answer *"what is the rule today?"*, fold them into one,
vacate their numbers, and record where each went in `docs/adr/README.md` — a
vacated number is never reused, because a commit message or another repo may
still cite it. Delete a record only when the thing it describes is gone and
nothing points at it.

**Amend the record in the same change that falsifies it.** A decision trail only
ever read, never corrected, becomes a museum.
