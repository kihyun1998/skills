#!/usr/bin/env python3
"""Report every skill `description` against the guidance's stated rules.

    python3 scripts/desc-audit.py

A **report, not a gate.** It is deliberately not in the hook: what to do about
the findings is an open call (tighten the cap and rewrite, or record a
divergence), and a gate would decide it by going red. `docs/skill-authoring.md`
points here instead of storing a roster, because a roster of counts in a static
file is stale on the next commit -- this repo has the receipts, having corrected
one such count minutes after writing it.

What it checks, and where each rule comes from -- Anthropic's skill-authoring
best practices, cited by line in the raw `.md`:

- **1,024 characters max** (L158-163, restated L1128). A **field validation**
  rule, listed beside *non-empty* and *no XML tags*. It is NOT Claude Code's
  `skillListingMaxDescChars` of 1,536, which is a rendering truncation over
  `description` + `when_to_use` combined. Two limits, same field, and the looser
  one cannot see violations of the stricter.
- **Third person** (L205-211, a `<Warning>` -- the strongest callout on the
  page). Its stated cost is *discovery*, not style: the description is injected
  into the system prompt and an inconsistent point of view confuses selection.
- **Non-empty** and **no XML tags** (L158-163), the other two musts. The tag
  rule has one **deliberate exception**: an invocation placeholder such as
  `/nit <subcommand>`, which is the syntax a reader needs in order to call the
  skill. It is granted by shape -- a bare lowercase identifier in angle brackets
  with no closing tag and no attributes -- so a new skill inherits it and a real
  tag still fires.

**The pronoun column reports candidates, not violations.** A `me` inside the
alias `/grill-me` and an `I` inside a quoted user utterance are both hits and
neither is a point-of-view defect. The guidance's own Avoid examples are about
the *skill* speaking (*"I can help you..."*, *"You can use this to..."*); a
trigger clause describing the *user's* state reads differently. Each hit is read
one at a time, which is why this prints a roster and refuses to total it into a
verdict.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    print("this report needs pyyaml (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")  # type: ignore[union-attr]

REPO = Path(__file__).resolve().parent.parent

# L158-163 and L1128. Field validation, not the 1,536 rendering truncation.
MAX_CHARS = 1024

PRONOUN = re.compile(r"\b(you|your|yours|yourself|I|me|my|mine|we|us|our)\b", re.I)
# A real tag against an invocation placeholder, told apart by SHAPE and never by
# a list of skills. `/nit <subcommand>` and `/brief <issue>` are the syntax a
# reader needs in order to call the skill, and the maintainer has ruled them a
# deliberate exception -- but the exception is granted to the *form*, so a new
# skill that documents `/foo <bar>` inherits it. A name list here would be a
# stored roster, which is what this whole report exists instead of.
#
# **Where it cannot discriminate, stated rather than hidden.** A bare, unpaired,
# lowercase tag -- `<br>`, `<hr>` -- has the same shape as a placeholder and is
# reported as one. Nothing distinguishes them without knowing what the word
# means. What still fires: a closing tag, attributes, or a capital. So
# `<b>bold</b>` is caught by its `</b>` and `<a href=...>` by its attribute,
# which covers every tag that is doing markup work; a lone void element is the
# gap, and it has never appeared here.
PLACEHOLDER = re.compile(r"^<[a-z][a-z0-9-]*>$")
ANGLE = re.compile(r"<[a-zA-Z/][^>]*>")


def descriptions() -> dict[str, str]:
    """Every live skill's description. Retired skills are not installed."""
    out: dict[str, str] = {}
    for d in sorted(REPO.iterdir()):
        f = d / "SKILL.md"
        if not d.is_dir() or not f.is_file():
            continue
        m = re.match(r"^---\n(.*?)\n---\n", f.read_text(encoding="utf-8"), re.S)
        if not m:
            continue
        try:
            fm = yaml.safe_load(m.group(1)) or {}
        except yaml.YAMLError:
            continue
        out[d.name] = fm.get("description", "") or ""
    return out


def main() -> int:
    descs = descriptions()
    over = {n: d for n, d in descs.items() if len(d) > MAX_CHARS}
    empty = [n for n, d in descs.items() if not d.strip()]
    angles = {n: ANGLE.findall(d) for n, d in descs.items() if ANGLE.search(d)}
    xml = {n: [g for g in gs if not PLACEHOLDER.match(g)]
           for n, gs in angles.items()}
    xml = {n: gs for n, gs in xml.items() if gs}
    placeholders = {n: [g for g in gs if PLACEHOLDER.match(g)]
                    for n, gs in angles.items()}
    placeholders = {n: gs for n, gs in placeholders.items() if gs}
    pronouns = {n: sorted({w.lower() for w in PRONOUN.findall(d)})
                for n, d in descs.items() if PRONOUN.search(d)}

    print(f"{len(descs)} live skills\n")

    print(f"over {MAX_CHARS} characters (L158-163, a field-validation maximum)")
    if over:
        for n, d in sorted(over.items(), key=lambda kv: -len(kv[1])):
            print(f"  {len(d):5d}  (+{len(d) - MAX_CHARS:4d})  {n}")
    else:
        print("  none")

    print(f"\nfirst or second person -- CANDIDATES, read each (L205-211)")
    if pronouns:
        for n, words in sorted(pronouns.items()):
            print(f"  {n:24s} {', '.join(words)}")
    else:
        print("  none")

    if empty:
        print(f"\nempty description (L158-163): {', '.join(empty)}")
    if xml:
        print("\nXML tags in description (L158-163)")
        for n, tags in sorted(xml.items()):
            print(f"  {n:24s} {tags}")
    if placeholders:
        print("\ninvocation placeholders -- a deliberate exception, not a finding")
        for n, tags in sorted(placeholders.items()):
            print(f"  {n:24s} {' '.join(tags)}")

    longest = max(descs.items(), key=lambda kv: len(kv[1]))
    shortest = min(descs.items(), key=lambda kv: len(kv[1]))
    print(f"\nlongest  {len(longest[1]):5d}  {longest[0]}")
    print(f"shortest {len(shortest[1]):5d}  {shortest[0]}")
    print("\nThe guidance's own worked examples run 141-170 characters "
          "(L222, L228, L234, L294).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
