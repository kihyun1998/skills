#!/usr/bin/env node
// Validate a to-deck deck against just-learn's Import Format (see REFERENCE.md).
// Usage: node validate.mjs <path-to-deck.json>
// Zero dependencies. Exits 0 with "OK" if valid, else prints errors and exits 1.
//
// File: { name?, cards: [...] }. Each card is { id, origin, prompt, answer,
// explanation? } — id/prompt/answer are non-empty strings and ids unique; origin
// is "workbook" or "extra"; explanation (optional) is a string. prompt/answer are
// just-learn's required Card fields, explanation its optional one; id is the
// re-import merge key; origin is provenance just-learn ignores. No question-type
// labels or options — just-learn generates Multiple-Choice distractors itself.
//
// Beyond hard errors, it prints soft WARN lines (still exits 0) for the classic
// anti-pattern this skill guards against: an `answer` that has swallowed the
// explanation. Heuristic — a long answer (>60 chars) with no `explanation` likely
// folded the "why" into the answer; split it (see "핵심 규칙" in SKILL.md).

import { readFileSync } from "node:fs";

const ORIGIN = new Set(["workbook", "extra"]);

const path = process.argv[2];
if (!path) {
  console.error("usage: node validate.mjs <path-to-deck.json>");
  process.exit(2);
}

let data;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  console.error(`cannot read/parse ${path}: ${e.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const e = (msg) => errors.push(msg);
const w = (msg) => warnings.push(msg);
const str = (v) => typeof v === "string" && v.trim().length > 0;
const LONG_ANSWER = 60; // chars — above this, an explanation-less answer is suspicious

if (data.name !== undefined && typeof data.name !== "string") {
  e("top-level `name` must be a string when present");
}

if (!Array.isArray(data.cards)) {
  e("top-level `cards` must be an array");
} else if (data.cards.length === 0) {
  e("`cards` must have at least one card");
} else {
  const ids = new Set();
  data.cards.forEach((c, i) => {
    const at = c && c.id ? `card ${c.id}` : `cards[${i}]`;
    if (!c || typeof c !== "object") return e(`${at}: not an object`);

    if (!str(c.id)) e(`${at}: missing id`);
    else if (ids.has(c.id)) e(`${at}: duplicate id`);
    else ids.add(c.id);

    if (!ORIGIN.has(c.origin)) e(`${at}: bad origin "${c.origin}"`);
    if (!str(c.prompt)) e(`${at}: missing prompt`);
    if (!str(c.answer)) e(`${at}: missing answer`);
    if (c.explanation !== undefined && typeof c.explanation !== "string") {
      e(`${at}: explanation must be a string when present`);
    }

    // Soft: a long answer with no explanation likely folded the "why" in.
    if (str(c.answer) && c.answer.trim().length > LONG_ANSWER && !str(c.explanation)) {
      w(`${at}: answer is ${c.answer.trim().length} chars with no explanation — split the 부연 into explanation?`);
    }
  });
}

if (warnings.length) {
  console.error(`${warnings.length} warning(s):`);
  for (const msg of warnings) console.error("  WARN " + msg);
}

if (errors.length) {
  console.error(`${errors.length} problem(s):`);
  for (const msg of errors) console.error("  - " + msg);
  process.exit(1);
}
console.log(`OK — ${data.cards.length} cards`);
