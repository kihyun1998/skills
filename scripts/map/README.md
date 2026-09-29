# `check_map.py` — is this map still true?

A map note claims things about code: that a symbol lives in a named file, that a
link resolves, that two notes point at each other. Code moves and the note does
not, and **nothing reports it** — which is how a note described a constant for six
days after it was deleted, with every gate green.

This is the mechanical half of that question, and the only thing anywhere that
asks it. `thegraph`'s `map` node **reads** a territory map and never checks it;
`sweep`'s surface list does not name maps at all.

## Run it

    python3 scripts/map/check_map.py --selftest       # verify the gate itself
    python3 scripts/map/check_map.py                  # every note
    python3 scripts/map/check_map.py docs/map/x.md    # one note

It needs a `.checkup.json` at the repo root. Derive one from
`check_map.example.json` — read the repo's layout and the map's own `## Code`
bullets to fill `path_roots`, `source_globs` and the section set — and **show it
to the maintainer before writing it**, because a wrong root turns a correct map
into a wall of red.

## Vendor it into the repo it checks

This script belongs in CI, and CI cannot reach a skills directory. Copy it to the
consuming repo — `justrdp` keeps it at `.github/scripts/check_map.py` and runs
`--selftest` then the check as two steps — and re-copy when it gains a rule.

That copy is a fork the moment it lands, so **diff before assuming they match**.
`justrdp`'s is 507 lines against this one's 787, missing the per-bullet locality
rule, the zero-files-scanned failure, and the anchor fixes.

## Two rules that are silent when wrong

- **Split on `\r?\n`, never `\n`.** On a CRLF checkout the naive split leaves `\r`
  on every line, so the heading pattern matches **zero** headings, every anchor set
  comes back empty, and every correct link is reported broken. It did exactly that
  against eleven valid links.
- **Each space in a heading becomes one hyphen; runs are not collapsed**, and an
  inline code span in a heading **keeps its text** in the anchor. So
  `## Damage / dirty tracking` anchors as `damage--dirty-tracking`.

## Do not re-implement it

Three attempts to rewrite this from scratch in one session each produced a
false-positive run on its first execution, all three failing the same way: a
path-root convention the port did not know. One reported 0 of 286 symbols as
resolving, because the notes address crates as `pkg-pdu/src/x.rs` while the tree
has a `crates/` prefix. Against real data that output is indistinguishable from
catastrophe.

**A run that inspected nothing is not a pass.** The script fails rather than
printing `ok` when a configured scan matched zero files — found in its own fixture,
whose crate was named `pkg` and was therefore blanked by the default skip list.

## Adjudicate the first failures; do not fix them

For each, open the note and the code and decide whether the **note** is wrong or
the **config** is. On a real map the second is more common on the first run — every
false-positive this checker has ever had was a configuration mismatch, which is why
the configuration is a file rather than something baked into the script.

The reverse reciprocity direction fired four times on its first real run and **all
four were correct notes**: an invariant's section is a roster of *sites*, and a
territory may name it as its *origin* rather than as a site. So the forward
direction is load-bearing and the reverse is opt-in. The rule that survived a real
map is the narrower one.

## What it cannot do

It verifies a note against **code**. Nothing verifies a note against **another
note**, and once a map is large enough for a fact to appear twice, that is where
the remaining defects are — two lists of the same length side by side, or a
`## Code` section contradicting the same note's `## Design model` fifty lines
above. Read those together by hand; no gate does it.
