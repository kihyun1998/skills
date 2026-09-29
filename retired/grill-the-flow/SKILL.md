---
name: grill-the-flow
disable-model-invocation: true
description: Onboard a repo to the `theflow` skill by interrogating the maintainer to author its `docs/agents/theflow.md` bindings doc — the project-specific values theflow reads at runtime (module/crate map, per-change-type reference routing, the mechanism/policy boundary rule, the per-layer proof methods, the behavior-describing surfaces, the gate matrix + release/downstream loop, and the war-story index). Inspects the repo first (CLAUDE.md, CONTEXT.md, manifests, directory structure, any existing bindings) and pre-fills everything derivable, then grills the maintainer one question at a time — recommending an answer for each — only on the *decisions* the code cannot answer. The target schema is not hardcoded here: it reads theflow's own "Bindings the skill expects" section, so adding a bindings field to theflow automatically widens this interrogation. Writes docs/agents/theflow.md (and a lessons.md stub if absent). Run once per repo, or again when the bindings drift. Use when a repo should adopt theflow, when theflow reports its bindings doc is missing, or when the user invokes /grill-the-flow. This authors the bindings; `theflow` then executes a change against them.
---

# grill-the-flow — author a repo's theflow bindings

> **Retired — no longer installed.** This skill lives under `retired/` alongside
> `theflow`, and the install scripts do not link it, so `/grill-the-flow` does not
> resolve. Its successor is [`grill-the-graph`](../../grill-the-graph/), which
> **compiles** the `docs/agents/theflow.md` this skill wrote into a graph rather
> than re-interrogating the maintainer — so the bindings docs it produced are not
> retired with it. See
> [ADR-0027](../../docs/adr/0027-retirement-moves-a-skill-to-the-retired-folder.md).

`theflow` is a project-agnostic method; it reads each repo's
`docs/agents/theflow.md` **bindings** doc at runtime for every project-specific
value. Something has to *produce* that doc. This skill does — by interrogating
the maintainer, the way `teach-impeccable` gathers design context for the
impeccable skills. It is the **setup** half; `theflow` is the **execution** half.

Run it once when a repo adopts theflow (or when `theflow` says the bindings doc
is missing), and again whenever the bindings drift. It **only writes the bindings
doc** — it never touches product code.

## The target schema lives in theflow, not here

Do **not** hardcode the list of bindings fields in this file. Read
[`../theflow/SKILL.md`](../theflow/SKILL.md) — its **"Bindings the skill expects
(`docs/agents/theflow.md`)"** section is the authoritative schema of what the
output doc must contain. Interrogate exactly those sections, in that shape. When
theflow gains a bindings field, this interrogation widens automatically; when it
renames one, follow it. (Duplicating the schema here would be the divergence seed
theflow exists to prevent.)

Also skim theflow's **seven steps** so each question is grounded in *why* the
step needs that binding — you are filling the values the steps defer to.

## Process — inspect first, then grill

The order is a hard rule: **look the repo up before you ask anything.** Asking
the maintainer what the code already answers is the offloading theflow's
decision-routing habit forbids.

### 1. Inspect (silent pre-fill)

Read, without asking:

- **`CLAUDE.md`** — the repo's identity/invariants and any gate/convention notes.
- **`CONTEXT.md` + `docs/adr/`** — the glossary and decision trail; the domain
  vocabulary and the boundary already named.
- **The manifest(s)** — `pubspec.yaml` / `Cargo.toml` / `package.json` etc.: the
  member/crate layout, the toolchain floor, the test/workspace membership, the
  formatter/lint config, the publish setup.
- **The directory tree** — the module map, which members sit outside the
  top-level test command (the Step 7 blind spots).
- **Sibling repos** — for the reference-routing table (this repo's sibling
  implementations, used as reference sources), scan `../*/`. Do **not** build a
  consumer list into the bindings — it is derived on the spot in theflow's
  after-merge downstream loop, never stored.
- **Any existing `docs/agents/theflow.md`** — if present, this is an *update*:
  diff current reality against it and only re-grill the stale/empty fields.

From this, draft a **complete first-pass** of every bindings section. Most
mechanical fields (module map, gate command skeleton, toolchain floor) come out
of inspection alone.

### 2. Grill (decisions only, one at a time)

Now walk theflow's bindings schema section by section. For each field, apply the
grilling discipline:

- **Ask one question at a time**, and wait for the answer before the next.
  Multiple questions at once is bewildering.
- **Recommend an answer** for every question — your pre-filled draft is the
  recommendation; the maintainer confirms or corrects it.
- **Facts you look up; decisions you ask.** If inspection already settled a field
  (the crate map, a gate command that's literally in CI config), state it as
  confirmed and move on — do not turn it into a question. Reserve questions for
  the calls the code cannot make:
  - **Step 1 reference routing** — *which real source* to read for each change
    type (an upstream SDK path, a reference repo, this repo's sibling
    implementations), and *where the hidden-state list lives*. This is a
    judgement about what "correct" is measured against — ask it.
  - **Step 2 boundary rule** — the concrete mechanism/core vs policy/consumer
    split *for this project*, and what the consumer owns by definition. The
    identity in `CLAUDE.md` constrains it but rarely states it operationally.
  - **Step 4 proof methods** — the real round-trip per layer, and how to link a
    local build into a consumer. Ask which proof actually convinces the
    maintainer for each layer.
  - **Step 5 unconditional triggers** — *which paths are sacred*: where a bug
    costs more than a wrong number, so the completeness pass runs regardless of
    judgement. The code cannot rank its own blast radius — only the maintainer
    knows which path spends money, touches production, or cannot be undone. Ask
    for concrete paths; accept no "use judgement".
  - **Step 6 surfaces** — confirm which docs describe behavior and whether the
    changelog is snapshotted at publish (ecosystem-dependent). Also ask **where a
    promoted decision record goes, and what earns one here** — theflow's Step 5
    promotion needs a named destination and a format. The maintainer knows which
    areas have already been re-decided; a repo with no record format has nowhere
    for a promotion to land, and that is worth recording as N/A rather than
    discovering mid-flow. The same answer feeds the rung below it: **the list of
    areas that already carry a record** — accepted *and* proposed — is what the
    filing step checks before proposing a spine, so gather the numbers, not just
    the areas. How a spine links and where its write-back lands are decided in
    theflow itself; ask only whether this project has an *exception*, and do not
    turn the default into a question. The one exception worth a direct question
    is **whether the tracker has a parent/child mechanism at all** (GitHub
    sub-issues, an epic, a parent field) — theflow leans on it twice, for the
    follow-up tree and for the spine's roster, and a tracker without one pushes
    both back into hand-maintained prose. That is worth stating once in the
    bindings instead of leaving each filing to discover it.
  - **Step 7 release + downstream** — the branch/PR/CI convention, the release
    judgement rules, and the downstream-migration procedure.
  - **Reasoning bindings** — the tie-breaker when prior art and this project's
    own evidence disagree. Ask it explicitly: a maintainer who measures their own
    market will not want a reference implementation's default to outrank it.
    Then ask the **second** question, which the first does not reach: *where does
    this project deliberately not follow that prior art, and what decided it?* A
    maintainer answers this quickly — the deliberate divergences are the ones they
    have defended before — and the list is what stops an adversarial pass from
    proposing the reference's design back as a defect. "Nowhere yet" is a real
    answer; record it as one.
- **When a field is genuinely N/A** (a leaf app has no consumers, no publish
  step), record *that* explicitly in the doc — a silent omission reads as
  "forgot", not "doesn't apply".

### 3. Write and confirm

Write `docs/agents/theflow.md` with every section filled (or marked N/A with a
reason). Structure it to match theflow's schema so the steps find each value
where they expect it. If the repo has no `docs/agents/lessons.md`, offer to drop
a stub (the war-story index the bindings' final section points at). Show the
maintainer the result and let them approve before you consider it done.

Point them at the next move: with the bindings in place, `theflow` (via
`/theflow`, or a one-line trigger in `CLAUDE.md`) can now execute a change
against them.
