# to-html — Report mode reference

Report mode is the **rich, diagram-forward** register: Tailwind (CDN) for layout and Mermaid (CDN) for graph-shaped diagrams, in the editorial style of an architecture-review report. Read this file every time you build a report-mode page — do not reconstruct the markup from memory.

**This mode is not self-contained.** It pulls two CDN scripts, so the file **needs internet to render**. That is the deliberate trade for Tailwind ergonomics + real Mermaid graphs. Use it only when the user has opted into report mode (see `SKILL.md § Modes`). If they want a file that opens offline, that is Standard mode (`REFERENCE.md`).

Report mode does **not** use `assets/style.css` — that stylesheet is Standard mode's. Report mode styles with Tailwind utility classes plus a tiny custom `<style>` layer for the few things utilities don't cover.

## Contents

- [Scaffold](#scaffold)
- [Header](#header)
- [Table of contents](#table-of-contents)
- [Sections and headings](#sections-and-headings)
- [Code blocks](#code-blocks)
- [Callouts](#callouts)
- [Tables](#tables)
- [Card / panel](#card--panel)
- [Strength badges](#strength-badges)
- [Mermaid diagram (the workhorse for dependencies / call flow)](#mermaid-diagram-the-workhorse-for-dependencies--call-flow)
- [Before / after (hand-built boxes)](#before--after-hand-built-boxes)
- [Cross-section (layered shallowness)](#cross-section-layered-shallowness)
- [Mass diagram (interface surface vs implementation)](#mass-diagram-interface-surface-vs-implementation)
- [Style guidance](#style-guidance)
- [Footer](#footer)

## Scaffold

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOCUMENT TITLE</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: {
          sans: ['Pretendard', 'Noto Sans KR', 'Malgun Gothic', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          serif: ['Nanum Myeongjo', 'Noto Serif KR', 'Georgia', 'serif'],
          mono: ['JetBrains Mono', 'D2Coding', 'ui-monospace', 'monospace'],
        },
      },
    },
  };
</script>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
</script>
<style>
  /* small custom layer — things Tailwind doesn't cover cleanly */
  .seam { stroke-dasharray: 4 4; }        /* dashed seam line in SVG */
  .leak { stroke: #dc2626; }              /* red leakage edge */
  .deep { background: linear-gradient(135deg, #0f172a, #1e293b); } /* deep-module fill */
</style>
</head>
<body class="bg-stone-50 text-slate-900 font-sans antialiased">

<div class="max-w-6xl mx-auto grid lg:grid-cols-[1fr_15rem] gap-10 px-6 py-12">
  <main class="min-w-0 space-y-12">
    <!-- header, then sections -->
  </main>
  <aside class="hidden lg:block">
    <nav class="sticky top-8 text-sm space-y-1"><!-- TOC --></nav>
  </aside>
</div>

</body>
</html>
```

Notes:

- `<meta charset="UTF-8">` mandatory — Korean corrupts without it. `<html lang="…">` follows the document language.
- The Korean font fallbacks live in `tailwind.config.fontFamily` — Tailwind's default `font-sans` has no Korean coverage, so always keep this config. No web font is pulled; system fonts (Pretendard / Noto Sans KR / Malgun Gothic) render Korean.
- The two-column grid gives a sticky TOC on the right ≥1024px and collapses to one column below. For a pure single-column editorial report (no TOC), drop the `<aside>` and use `<main class="max-w-3xl mx-auto ...">`.
- Palette: `bg-stone-50` page, `slate` text, one accent (`indigo` or `emerald`), `red` for danger/leak, `amber` for warnings. Keep colour sparing.

## Header

```html
<header class="border-b border-slate-200 pb-6">
  <h1 class="font-serif text-4xl tracking-tight">DOCUMENT TITLE</h1>
  <p class="mt-2 text-lg text-slate-500">One-line subtitle — omit if none.</p>
</header>
```

Optional legend row — only when the page uses schematic diagrams whose encoding needs spelling out:

```html
<div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-wider text-slate-400">
  <span>■ module</span><span>▦ deep module</span><span class="text-red-500">→ leakage</span>
</div>
```

## Table of contents

`h2` → a link; `h3` → an indented link. Every `href` matches a section `id`.

```html
<nav class="sticky top-8 text-sm space-y-1">
  <div class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">목차</div>
  <a href="#sec-1" class="block text-slate-600 hover:text-indigo-600">1. First section</a>
  <a href="#sec-1-1" class="block pl-3 text-slate-400 hover:text-indigo-600">1-1. Subsection</a>
  <a href="#sec-2" class="block text-slate-600 hover:text-indigo-600">2. Second section</a>
</nav>
```

Label follows the document language: `목차` (ko) / `Contents` (en).

## Sections and headings

```html
<section id="sec-1" class="space-y-4 scroll-mt-8">
  <h2 class="font-serif text-2xl tracking-tight">
    1. First section
    <span class="block w-12 h-[3px] mt-2 bg-indigo-600 rounded"></span>
  </h2>
  <p class="leading-relaxed">Body text. <code class="font-mono text-sm bg-slate-100 rounded px-1.5 py-0.5">inline code</code>, <strong class="font-semibold">bold</strong>, <a href="#" class="text-indigo-600 underline underline-offset-2">links</a>.</p>

  <h3 id="sec-1-1" class="font-serif text-lg scroll-mt-8">1-1. Subsection</h3>
</section>
```

The `<span>` under the `h2` is the accent underline — the editorial signature. Use `scroll-mt-8` so anchor jumps clear the sticky nav.

## Code blocks

```html
<pre class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono leading-relaxed"><code>ssh-keygen -t ed25519 -f C:\ca\my-ca -N ""</code></pre>
```

Escape `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;` inside code and body text.

## Callouts

Left-accent bar + tinted background. Four variants — swap the colour pair:

```html
<div class="rounded-lg border-l-4 border-blue-400 bg-blue-50 p-4 text-sm">info</div>
<div class="rounded-lg border-l-4 border-teal-400 bg-teal-50 p-4 text-sm">tip</div>
<div class="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm">warn</div>
<div class="rounded-lg border-l-4 border-red-400 bg-red-50 p-4 text-sm">danger</div>
```

With a title:

```html
<div class="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm">
  <div class="font-semibold mb-1">⚠ Version pitfall</div>
  <p>Body.</p>
</div>
```

## Tables

```html
<table class="w-full text-sm border border-slate-200 rounded-lg overflow-hidden border-separate border-spacing-0">
  <thead><tr class="bg-slate-100">
    <th class="text-left font-semibold px-3 py-2 border-b border-slate-200">Column</th>
    <th class="text-left font-semibold px-3 py-2 border-b border-slate-200">Meaning</th>
  </tr></thead>
  <tbody>
    <tr class="hover:bg-slate-50">
      <td class="px-3 py-2 border-b border-slate-100 align-top font-mono">-N ""</td>
      <td class="px-3 py-2 border-b border-slate-100 align-top">Empty passphrase</td>
    </tr>
  </tbody>
</table>
```

---

# Report-mode components

The diagrams carry the weight. Prose is sparse. Mix patterns — don't make every diagram look the same.

## Card / panel

One self-contained unit — a candidate, an option, a proposal. Header line: title + strength/tag badges. Then a monospaced file list, one-line Problem/Solution rows, and a tight Wins list.

```html
<article class="rounded-xl border border-slate-200 bg-white p-6 space-y-4" id="sec-2-1">
  <div class="flex items-center gap-2 flex-wrap">
    <h3 class="font-serif text-xl">Collapse the intake pipeline</h3>
    <span class="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-semibold">Strong</span>
    <span class="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-xs font-semibold">in-process</span>
  </div>
  <div class="font-mono text-sm text-slate-500">src/intake/handler.ts · validator.ts · repo.ts</div>

  <p class="text-sm"><span class="text-xs font-bold uppercase tracking-wide text-slate-400 mr-2">Problem</span>Three thin layers each forward one call.</p>
  <p class="text-sm"><span class="text-xs font-bold uppercase tracking-wide text-slate-400 mr-2">Solution</span>One interface absorbs the wrappers.</p>

  <ul class="list-disc pl-5 text-sm space-y-1">
    <li>One place to test</li>
    <li>Delete 4 shallow wrappers</li>
  </ul>
</article>
```

## Strength badges

```html
<span class="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-semibold">Strong</span>
<span class="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs font-semibold">Worth exploring</span>
<span class="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-xs font-semibold">Speculative</span>
```

## Mermaid diagram (the workhorse for dependencies / call flow)

Reach for Mermaid when the point is a genuine graph — "X calls Y calls Z, and look at the mess", or a sequence "before: 6 round-trips; after: 1". Wrap it in a card so it doesn't feel parachuted in. Colour leakage edges red and the deep module dark via `classDef`.

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
flowchart LR
  A[Handler] --> B[Validator]
  B --> C[Repo]
  C -.->|leak| D[PricingClient]
  classDef leak stroke:#dc2626,stroke-width:2px;
  class C,D leak
  </pre>
  <p class="mt-3 text-sm text-slate-500">Pricing leaks across the repo seam.</p>
</div>
```

Sequence diagrams work well for round-trip collapse:

```html
<pre class="mermaid">
sequenceDiagram
  Client->>API: 1
  Client->>API: 2
  Note over Client,API: before — 6 round-trips
</pre>
```

## Before / after (hand-built boxes)

When Mermaid's layout fights you, or you want the "after" to feel like one thick deep module.

```html
<div class="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
  <div class="space-y-2">
    <div class="text-xs uppercase tracking-wider text-slate-400 text-center">Before</div>
    <div class="rounded-lg border-2 border-slate-300 bg-white text-center p-3 text-sm">Handler</div>
    <div class="rounded-lg border-2 border-slate-300 bg-white text-center p-3 text-sm">Validator</div>
    <div class="rounded-lg border-2 border-red-400 bg-red-50 text-center p-3 text-sm">PricingClient <span class="block text-xs text-slate-500">leaks across seam</span></div>
  </div>
  <div class="text-2xl text-indigo-600 text-center md:rotate-0 rotate-90">→</div>
  <div class="space-y-2">
    <div class="text-xs uppercase tracking-wider text-slate-400 text-center">After</div>
    <div class="deep rounded-lg border-2 border-slate-800 text-slate-100 text-center p-3 text-sm">Intake module
      <span class="block text-xs text-slate-400">handler · validator · repo (now internal)</span>
    </div>
  </div>
</div>
```

## Cross-section (layered shallowness)

Thin band = a layer doing almost nothing; thick band = the consolidated responsibility.

```html
<div class="space-y-[3px]">
  <div class="border-l-4 border-indigo-500 bg-slate-100 px-3 py-1 text-xs text-slate-400">Controller — forwards</div>
  <div class="border-l-4 border-indigo-500 bg-slate-100 px-3 py-1 text-xs text-slate-400">Service — forwards</div>
  <div class="border-l-4 border-indigo-500 bg-slate-100 px-3 py-1 text-xs text-slate-400">Manager — forwards</div>
  <div class="border-l-[6px] border-indigo-500 bg-indigo-50 px-3 py-5 text-sm font-semibold">Repository — the actual work</div>
</div>
```

## Mass diagram (interface surface vs implementation)

Short interface bar over tall implementation = deep; tall interface bar = shallow. Set each bar's `height` inline.

```html
<div class="flex gap-6 items-end justify-center">
  <div class="flex flex-col items-center gap-2">
    <div class="flex flex-col items-center gap-[3px]">
      <div class="w-24 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 text-[11px] font-semibold flex items-center justify-center" style="height:68px">interface</div>
      <div class="w-24 rounded bg-slate-100 border border-slate-300 text-slate-500 text-[11px] font-semibold flex items-center justify-center" style="height:40px">impl</div>
    </div>
    <div class="text-xs uppercase tracking-wider text-slate-400">Before — shallow</div>
  </div>
  <div class="flex flex-col items-center gap-2">
    <div class="flex flex-col items-center gap-[3px]">
      <div class="w-24 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 text-[11px] font-semibold flex items-center justify-center" style="height:24px">interface</div>
      <div class="w-24 rounded bg-slate-100 border border-slate-300 text-slate-500 text-[11px] font-semibold flex items-center justify-center" style="height:96px">impl</div>
    </div>
    <div class="text-xs uppercase tracking-wider text-slate-400">After — deep</div>
  </div>
</div>
```

## Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace (`space-y-12` between sections). `font-serif` for headings against `stone`/`slate`.
- Colour sparingly: one accent (`indigo` or `emerald`) + `red` for leakage/danger + `amber` for warnings.
- Keep diagrams ~320px tall so before/after sits side by side without scrolling.
- `text-xs uppercase tracking-wider` for schematic labels — they should read as blueprint, not UI.
- The only scripts are the Tailwind CDN and the Mermaid ESM import. No app code, no interactivity beyond Mermaid's own rendering.

## Footer

```html
<footer class="border-t border-slate-200 pt-6 text-sm text-slate-400 text-center">
  Generated from SOURCE.md
</footer>
```

Place it as the last child of `<main>` (inside the single content column).
