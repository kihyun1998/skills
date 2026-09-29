---
name: to-html
disable-model-invocation: true
description: "Convert a markdown file — or documentation already in the conversation context — into one styled HTML file. Two modes. Standard mode (default) is strictly self-contained: inline CSS, zero external dependencies, opens offline in a browser — with a sticky TOC, GitHub-style callouts, an editorial serif register, and hand-built schematic diagrams (before/after, module boxes, cross-sections, mass diagrams). Report mode (opt-in) is a rich, diagram-forward register using Tailwind + Mermaid via CDN (needs internet) for graph-shaped diagrams and architecture-review-style reports. Use when the user wants to turn a guide, setup doc, reference, README, design note, review, or technical notes into a polished HTML page, asks to \"make this HTML\" / \"export to HTML\", or invokes /to-html. Not for slide decks or presentations, and not for narrative re-authoring — this skill does structural conversion of general documentation, not a rewrite."
---

# to-html

Convert documentation into a single, styled HTML file. You perform the conversion yourself (no `marked`, no `pandoc`) — doing the conversion and the component judgment in one pass is the whole point.

## Input

One of:

- **A markdown file** — the user gives a path. Read it.
- **In-context content** — a document you drafted, notes, or material from the current conversation that the user wants captured as HTML.

## Modes

Pick the mode **before** reading component references — it decides which reference file and stylesheet you use.

- **Standard mode (default).** One `.html` file, CSS inlined, **zero external dependencies**, no build step — it opens directly in a browser with no network. This is the skill's core promise. Uses `assets/style.css` + `REFERENCE.md`. Right for guides, setup docs, references, READMEs — anything meant to be saved, emailed, or read offline.

- **Report mode (opt-in).** A rich, diagram-forward, architecture-review-style report using **Tailwind + Mermaid via CDN**. Renders genuine graph diagrams (dependency graphs, call flow, sequence collapse) that are tedious to hand-draw. Uses `REPORT.md` (its own scaffold; it does **not** use `assets/style.css`). The cost: the file **needs internet to render**. Right for reviews, design explorations, and diagram-heavy reports where offline doesn't matter.

**Choosing:**

- Default to **Standard**. Its editorial register + hand-built diagrams cover most "make this look polished" needs while staying self-contained.
- Switch to **Report** when the user asks for it by name, says "rich / report / like the architecture review", wants **Mermaid** or genuine graph diagrams, or explicitly doesn't care about offline.
- If a request points both ways (wants graph diagrams *and* an offline file), surface the trade-off and let the user pick — do not silently pull a CDN into a Standard-mode page, and do not silently downgrade a requested graph to boxes.

## Scope — read before converting

In scope: guides, setup docs, references, READMEs, technical documentation — content already shaped as a document.

Out of scope — stop and say so instead of converting:

- **Slide decks / presentations** — a different layout model entirely.
- **Narrative re-authoring** — reshaping content into a story or argument. That needs hand re-writing, not structural conversion. This skill preserves the document's structure; it does not rewrite it.

## Process

1. **Get the source.** A file path → Read it. Otherwise gather the in-context content the user pointed at.
2. **Pick the mode** — Standard or Report (see Modes above).
3. **Read the reference for that mode — always, do not reconstruct markup from memory:**
   - Standard → `assets/style.css` (the canonical stylesheet) **and** `REFERENCE.md` (skeleton + component markup).
   - Report → `REPORT.md` (scaffold + component markup). Report mode does not use `assets/style.css`.
4. **Strip non-document noise.** Drop conversational scaffolding that is not part of the document — e.g. a "Sure, here's the doc…" preamble, a trailing "want me to also…?". Convert the document, not the chat around it.
5. **Detect language** and set `<html lang="…">` (e.g. `ko`, `en`). Both modes' font stacks cover Korean and Latin — no web fonts needed.
6. **Convert the standard markdown** — see Conversion rules.
7. **Decide on premium / report components** — this is judgment, not a mechanical mapping. See Premium elements (Standard) or the component list in `REPORT.md`.
8. **Build the TOC** from the h2/h3 headings, nested.
9. **Assemble** from the mode's reference. Standard → inline the entire stylesheet into one `<style>` block. Report → the Tailwind + Mermaid scaffold from `REPORT.md`.
10. **Write** the `.html` file (next to the source file, or where the user asks) and tell the user the path. In Report mode, add one line reminding the user the file needs internet to render.

## Conversion rules

| Markdown | HTML |
|---|---|
| H1 / frontmatter title (+ subtitle) | `.page-header` — `<h1>` plus optional `.subtitle` |
| h2, h3 | `<h2>` / `<h3>` with stable `id`s; also feed the TOC |
| paragraphs, lists, tables, code blocks, inline code, links, blockquotes | plain semantic HTML — the stylesheet does the styling |
| `> [!NOTE]` | `.callout.info` |
| `> [!TIP]` | `.callout.tip` |
| `> [!WARNING]` | `.callout.warn` |
| `> [!CAUTION]` | `.callout.danger` |

If the document has no H1, derive the page-header title from the first top-level heading or the filename, and omit the subtitle. Always escape `<`, `>`, `&` in code blocks and text — see `REFERENCE.md`.

## Premium elements — apply judgment (Standard mode)

The stylesheet ships richer components. Use one **only when the content clearly calls for it**. Never force them, and never emit one just because some markdown syntax is present. (Report mode has its own component set — see `REPORT.md`.)

Core:

- `.step-block` (numbered circle) — a genuinely sequential procedure.
- `.badge` — short inline keyword / status tags (`priv`/`pub`/`cert`, plus strength variants `strong`/`explore`/`speculative` and a neutral `tag`).
- `.two-col` — two parallel, directly comparable blocks.
- `.overview` diagram — a two-side system/structure overview, when the document opens by describing one.

Editorial / schematic (from `REFERENCE.md` § "Editorial layer & schematic diagrams"):

- `.panel` — an editorial card for a self-contained unit (an option, a proposal, a candidate) with a title + badge header, file list, one-line Problem/Solution rows, and a Wins list.
- `.before-after` — two schematic columns with an arrow, for a genuine before→after change.
- `.diagram` card + `.mod-box` — hand-built boxes-and-arrows; `.mod-box.deep` is a thick dark box, `.mod-box.leak` is a red boundary crossing.
- `.cross-section` — stacked layer bands (thin = shallow layer, thick = consolidated responsibility).
- `.mass` — interface-vs-implementation bars, for "the interface is as wide as the implementation."

Hand-author these from `REFERENCE.md`. If nothing in the content calls for them, a clean document with callouts and a TOC is the correct result.

### Editorial register (Standard mode)

For documents that read as considered prose rather than reference tables — design notes, reviews, proposals, essays — you may switch on the **editorial register** by adding `editorial` to the layout class (`<div class="layout editorial">`). It gives serif headings, an accent underline under each `h2`, and more air. It is purely a typographic register; every component still works, and the file stays self-contained. Use it when the document's voice is editorial; keep the default (crisp, dense) for setup guides and references. (This is a look *within* Standard mode — distinct from Report mode, which is a different tooling stack.)

## Constraints

- **Standard mode is strictly self-contained** — inline the CSS, never `<link>` it, never reference a CDN. The file must open in a browser with no network. Graph diagrams / Mermaid are not a Standard-mode feature; they are the reason Report mode exists.
- **Report mode is not self-contained** — it intentionally depends on the Tailwind and Mermaid CDNs and needs internet to render. That is the only place a CDN reference is allowed. Always tell the user when you produce one.
- Keep each mode's palette (Standard: the bundled light tokens; Report: `stone`/`slate` + one accent). Dark mode is out of scope for now.
- Do not edit `assets/style.css` to fit one document — it is Standard mode's canonical house style. New recurring components belong in the stylesheet + `REFERENCE.md` (Standard) or `REPORT.md` (Report), not inline in a single output.
