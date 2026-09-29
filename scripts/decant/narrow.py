#!/usr/bin/env python3
"""narrow -- remove work honestly before `decant` reads a repository.

`decant` decides where each comment paragraph belongs, and that is a judgement
made by reading. This script exists only to make the reading affordable: it
removes the paragraphs whose answer is mechanical and points at the ones most
likely to be restatement. It decides nothing.

Three findings, and only the first is close to certain:

  history   a line describing a change to the code. Resolves to DROP, or to
            DESIGN when it constrains -- the script cannot tell which, and says
            so rather than guessing.
  restated  a comment sharing a long phrase with its own territory's
            `## Design model`. About half of what is there: people rewrite
            their own sentences rather than copying them, and a rewrite shares
            no phrase. Measured -- of two territories this reported clean, one
            held at least two real restatements.
  repeated  the same sentence in several source files. Here string matching is
            the right tool, because these really are copies.

**It prints what it scanned before what it found, and that is the point.**
Building this pass, three separate runs exited 0 having inspected nothing -- a
path form the runtime did not resolve, a `## Code` heading convention one
repository writes differently, and a field index that counted a drive letter.
Each was indistinguishable from a clean result. A count with no scope beside it
is not a result, so the scope block is printed first and unconditionally.

**It never exits non-zero.** Every finding is a candidate for a judgement, and a
check that fails on a judgement is one people learn to ignore.

Config is OPTIONAL. Every value this script uses -- where the map is, which
extensions carry comments, what to skip -- is a directory listing, so it is
derived from the tree and the report says whether it was read or derived. It
honours `.checkup.json` where the repo keeps one, because `scripts/map/check_map.py`
needs that file and agreeing with it is free. It does not require it: an earlier
version copied that script's exit-on-missing-config while reading nothing from
the file it had not already defaulted, and demanded a file it never used.

    python3 narrow.py --root /path/to/repo
    python3 narrow.py --root /path/to/repo --territory text-overflow
    python3 narrow.py --selftest
"""

import argparse
import json
import os
import re
import sys
import tempfile

SHINGLE = 6  # words; below 5 the noise floor rises sharply, above 10 recall falls

# Comment openers per extension. A language missing here is reported in the
# scope block as unscanned rather than silently contributing zero.
PREFIXES = {
    ".rs": ("///", "//!", "//"),
    ".dart": ("///", "//"),
    ".ts": ("///", "//"),
    ".tsx": ("///", "//"),
    ".js": ("//",),
    ".mjs": ("//",),
    ".go": ("//",),
    ".py": ("#",),
    ".kt": ("///", "//"),
    ".swift": ("///", "//"),
}

HISTORY = re.compile(
    r"\b("
    r"previously (?:in|inline|buried|lived|held)"
    r"|used to (?:be|throw|construct|hold|live|call|sit)"
    r"|pure extraction of"
    r"|extracted from"
    r"|moved (?:from|out of)"
    r"|renamed from"
    r"|no longer (?:is|the|does|exists|displaces)"
    r"|was (?:split|merged|inlined) (?:from|into)"
    r"|this (?:field|method|type) used to"
    r"|now owned"
    r"|caught me"
    r"|review flagged"
    r")\b",
    re.I,
)

# A test or harness file by path, in the conventions the scanned ecosystems use. Rust's
# inline `#[cfg(test)] mod` is found by `test_start`, not here. `demo/` is harness: a demo
# page's probes carry one comment per feature they prove, so ranking on them ranks the
# harness's territory for every feature's rationale (measured: it kept one territory first
# after its own comments were done).
TEST_PATH = re.compile(
    r"(^|[\\/])(tests?|e2e|__tests__|demo)[\\/]|[._-](test|spec)\.\w+$|_test\.\w+$"
)

# Module names too generic to find referrers by: every crate has a `lib`.
GENERIC_STEMS = {"lib", "mod", "index", "main"}

STOP = set(
    """the a an and or of to in is it its that this for on with as be are was were by
from at not no so which what when where how than then their there they them does do
can could would should may might will shall must if else while each any all one two
three both same other another only just even also more most less least we you""".split()
)


# ------------------------------------------------------------------ config --


def find_map_dir(root, skip):
    """The directory holding `territory/`, found rather than declared.

    `check_map.py` needs a config because its section schema cannot be derived:
    read the heading set off the existing notes and a note that dropped a section
    defines the schema as not having it. Nothing here has that problem -- every
    value this script uses is a directory listing -- so requiring the file would
    be requiring a copy of something the tree already answers.
    """
    for dirpath, dirnames, _ in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip]
        if os.path.basename(dirpath) == "territory" and os.path.dirname(dirpath) != root:
            return os.path.relpath(os.path.dirname(dirpath), root).replace("\\", "/")
    return None


def load_config(root, explicit):
    """Read `.checkup.json` where the repo has one; otherwise derive everything.

    The file is optional here and required by `check_map.py`, and the difference
    is not an oversight in either. An earlier version of this script copied that
    script's `sys.exit` on a missing config -- while reading nothing from the file
    that it did not already default. It demanded a file it never used.
    """
    path = explicit or os.path.join(root, ".checkup.json")
    cfg, source = {}, "derived (no .checkup.json)"
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            cfg = json.load(fh)
        source = path
    # Generated and vendored trees, per ecosystem. A repo that needs more says so
    # in `.checkup.json`; this list only has to cover what every repo generates.
    # Measured: without `.dart_tool` and `ephemeral` one Flutter package scanned
    # 13 generated files and reported a history hit inside one of them.
    cfg.setdefault("skip_dirs", [
        ".git", "node_modules", "target", "dist", "build", "out", "vendor",
        ".dart_tool", "ephemeral", "Pods", ".gradle", ".next", ".nuxt",
        "__pycache__", ".venv", "venv", "coverage", ".mypy_cache", ".pytest_cache",
    ])
    cfg.setdefault("comment_exts", sorted(PREFIXES))
    if "map_dir" not in cfg:
        found = find_map_dir(root, set(cfg["skip_dirs"]))
        cfg["map_dir"] = found if found else "docs/map"
    cfg["_source"] = source
    return cfg


# ----------------------------------------------------------------- reading --


def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def blank_code(text):
    """Fenced blocks and inline spans -> spaces, offsets preserved.

    A note *about* comments contains comment-shaped text. Without this, a note
    quoting the phrasing it forbids is reported as an instance of it.
    """
    out = re.sub(r"```.*?```", lambda m: " " * len(m.group(0)), text, flags=re.S)
    return re.sub(r"`[^`\n]*`", lambda m: " " * len(m.group(0)), out)


def section(text, heading):
    m = re.search(
        r"^" + re.escape(heading) + r"\s*\r?$(.*?)(?=^## |\Z)", text, re.M | re.S
    )
    return m.group(1) if m else ""


def words(text):
    return re.findall(r"[a-z]+", blank_code(text).lower())


def shingles(text):
    w = words(text)
    return {tuple(w[i : i + SHINGLE]) for i in range(len(w) - SHINGLE + 1)}


def blocks(path):
    """Contiguous comment runs as (line_no, text). Language decided by suffix."""
    pre = PREFIXES.get(os.path.splitext(path)[1])
    if not pre:
        return []
    out, cur, start = [], [], None
    for i, line in enumerate(read(path).splitlines(), 1):
        s = line.strip()
        if any(s.startswith(p) for p in pre):
            if start is None:
                start = i
            cur.append(re.sub(r"^(///|//!|//|#)\s?", "", s))
        elif cur:
            out.append((start, " ".join(cur)))
            cur, start = [], None
    if cur:
        out.append((start, " ".join(cur)))
    return out


def test_start(path):
    """First line of test code in `path`, or None when it holds none.

    1 for a test file. For Rust, the `#[cfg(test)]` line that opens an inline
    `mod`; everything after it is counted as test code, which holds for the
    trailing `mod tests` convention and over-counts a file that puts production
    code after it.
    """
    if TEST_PATH.search(path.replace("\\", "/")):
        return 1
    if path.endswith(".rs"):
        lines = read(path).splitlines()
        for i, line in enumerate(lines):
            if line.strip().startswith("#[cfg(test)]"):
                rest = [l.strip() for l in lines[i + 1 : i + 4]
                        if l.strip() and not l.strip().startswith("#[")]
                if rest and re.match(r"(pub(\([^)]*\))?\s+)?mod\s", rest[0]):
                    return i + 1
    return None


def split_blocks(path):
    """`blocks(path)` as (production, test)."""
    start = test_start(path)
    every = blocks(path)
    if start is None:
        return every, []
    return ([b for b in every if b[0] < start], [b for b in every if b[0] >= start])


def lines_of(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            return sum(1 for _ in fh)
    except OSError:
        return 0


def source_index(root, cfg):
    """Every scannable source file, by basename and by relative path."""
    exts = set(cfg["comment_exts"])
    skip = set(cfg["skip_dirs"])
    by_name, every = {}, []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for fn in filenames:
            if os.path.splitext(fn)[1] in exts:
                full = os.path.join(dirpath, fn)
                by_name.setdefault(fn, []).append(full)
                every.append(full)
    return by_name, every


def named_files(note_text, by_name, exts):
    """Files a note's `## Code` section names.

    Both formats are accepted on purpose. Maps in the wild write the bullet as
    `` `utils/x.dart` -- `Sym` `` and as `- src/a/b.tsx -- Sym`; a parser
    requiring backticks scanned zero blocks in one repository and reported a
    clean run.
    """
    body = section(note_text, "## Code")
    alt = "|".join(re.escape(e.lstrip(".")) for e in exts)
    hits = set()
    # Match on the longest path the note wrote, not on the basename. A note
    # naming `ssh/commands.rs` in a tree holding eight files called commands.rs
    # matched all eight under a basename rule, and the report then claimed a
    # 24-line file was shared by five territories.
    pat = r"([\w./\-\[\](){}]*[\w\-]+\.(?:" + alt + r"))\b"
    for raw in re.findall(pat, body):
        norm = raw.replace("\\", "/").lstrip("./")
        cands = by_name.get(os.path.basename(norm), [])
        if "/" in norm:
            suffix = "/" + norm
            exact = [c for c in cands if c.replace("\\", "/").endswith(suffix)]
            if exact:
                hits.update(exact)
                continue
        hits.update(cands)
    return hits


# ------------------------------------------------------------------- finds --


def territory_order(notes, by_name, exts):
    """Rank territories by comment blocks per line of `## Design model`.

    High ratio = the comments are carrying what the note is not. That is either a
    note missing content or a comment holding it instead, and telling those apart
    is the pass's whole job -- so it is where the pass starts.

    NOT by commit activity: `grill-map` measures that the areas which never change
    and break silently when touched score zero on every activity metric and carry
    the highest cost of being wrong. And never by "where I expect to find
    something" -- an order chosen that way cannot be told from one chosen to
    flatter the result.
    """
    # How many notes name each file. A file several territories name cannot be
    # attributed to one of them, and `grill-map` says why: a file holding a large
    # share of a layer "is several territories that were never named". Counting
    # its blocks toward each is how a note with 2 design lines and one shared
    # 1,577-line file scored top of the order on this pass's first unbiased run.
    owners = {}
    for _, text in notes:
        for f in named_files(text, by_name, exts):
            owners[f] = owners.get(f, 0) + 1

    shared_table = sorted(
        ((n, f) for f, n in owners.items() if n > 1), reverse=True)
    rows, unattributable = [], []
    for note, text in notes:
        design = [l for l in section(text, "## Design model").splitlines() if l.strip()]
        named = named_files(text, by_name, exts)
        own = [f for f in named if owners.get(f, 0) == 1]
        shared = [f for f in named if owners.get(f, 0) > 1]
        split = [split_blocks(f) for f in own]
        nblocks = sum(len(p) for p, _ in split)
        ntest = sum(len(t) for _, t in split)
        if named and not own:
            unattributable.append((note, len(shared), len(design)))
            continue
        rows.append((nblocks / max(len(design), 1), note, nblocks,
                     len(design), len(own), len(shared), ntest))
    return sorted(rows, reverse=True), unattributable, shared_table


def references(text, stem, ext):
    """Whether source `text` (of extension `ext`) uses the module named `stem`.

    A path use, not a declaration: Rust's `mod x;` is left out, or the crate root
    would refer to every module.
    """
    s = re.escape(stem)
    if ext == ".rs":
        return re.search(r"\b(?:crate|super|self)::(?:\{[^}]*\b)?" + s + r"\b", text) is not None
    if ext in (".ts", ".tsx", ".js", ".mjs"):
        # A statement that imports only types is a consumer of the module's shapes, not a
        # use of its behaviour, so it does not count.
        for m in re.finditer(r"""(import|export)\b([^;'"]*?)(?:from\s+|\(\s*)['"][^'"]*/"""
                             + s + r"""(?:\.\w+)?['"]""", text):
            if not re.match(r"\s*type\b", m.group(2)):
                return True
        return False
    return False


def code_drift(notes, all_notes, by_name, exts, every):
    """Per note in `notes`: files that use its own modules but its `## Code` does
    not name, split by whether any note names them at all, and named files with no
    use in either direction with any other file the note names.

    Ownership is counted over `all_notes`, so a `--territory` run does not make a
    file it shares with an unfiltered note its own. Only for extensions
    `references` can read; a note on any other language reports nothing, which
    is not a clean result.

    A referrer no note names is the strong finding — it is outside the map
    entirely. One another note already names is usually a consumer of this
    territory rather than a member of it, and is reported apart so it can be
    read as that.
    """
    owners = {}
    for _, text in all_notes:
        for f in named_files(text, by_name, exts):
            owners[f] = owners.get(f, 0) + 1
    texts = {}

    def text_of(f):
        if f not in texts:
            texts[f] = blank_comments(f)
        return texts[f]

    def stem(f):
        return os.path.splitext(os.path.basename(f))[0]

    readable = {".rs", ".ts", ".tsx", ".js", ".mjs"}
    out = []
    for note, text in notes:
        named = named_files(text, by_name, exts)
        own = [f for f in named if owners.get(f, 0) == 1
               and os.path.splitext(f)[1] in readable and stem(f) not in GENERIC_STEMS]
        if not own:
            continue
        unlisted = sorted(
            f for f in every
            if f not in named and os.path.splitext(f)[1] in readable
            and test_start(f) != 1 and stem(f) not in GENERIC_STEMS
            and any(same_unit(o, f)
                    and references(text_of(f), stem(o), os.path.splitext(f)[1])
                    for o in own))
        orphans = [f for f in unlisted if owners.get(f, 0) == 0]
        elsewhere = [f for f in unlisted if owners.get(f, 0) > 0]
        peers = [g for g in named if os.path.splitext(g)[1] in readable]

        def linked(f, g):
            return same_unit(f, g) and (
                references(text_of(f), stem(g), os.path.splitext(f)[1])
                or references(text_of(g), stem(f), os.path.splitext(g)[1]))

        unconnected = sorted(
            f for f in named if f not in own and os.path.splitext(f)[1] in readable
            and not any(linked(f, g) for g in peers if g != f))
        if orphans or elsewhere or unconnected:
            out.append((note, orphans, elsewhere, unconnected))
    return out


def same_unit(a, b):
    """Whether a path use in `b` can name the module `a`: for Rust, the same crate
    (`crate::x` resolves inside one `src/`), otherwise the same extension family."""
    if a.endswith(".rs") or b.endswith(".rs"):
        ra, rb = (p.replace("\\", "/") for p in (a, b))
        ia, ib = ra.rfind("/src/"), rb.rfind("/src/")
        return a.endswith(".rs") and b.endswith(".rs") and ia >= 0 and ra[:ia] == rb[:ib]
    return True


def blank_comments(path):
    """Source text with comment lines removed, so a comment naming a module is not a use."""
    pre = PREFIXES.get(os.path.splitext(path)[1], ())
    return "\n".join(l for l in read(path).splitlines()
                     if not any(l.strip().startswith(p) for p in pre))


def find_history(files):
    out = []
    for path in files:
        for ln, text in blocks(path):
            m = HISTORY.search(text)
            if m:
                out.append((path, ln, m.group(0), text[:120]))
    return out


def find_restated(notes, by_name, exts):
    out, scanned = [], 0
    for note, text in notes:
        design = section(text, "## Design model")
        dsh = shingles(design)
        if not dsh:
            continue
        for path in sorted(named_files(text, by_name, exts)):
            for ln, body in blocks(path):
                scanned += 1
                common = dsh & shingles(body)
                if not common:
                    continue
                best = max(common, key=lambda s: len(set(s) - STOP))
                if len(set(best) - STOP) >= 3:
                    out.append((path, ln, note, len(common), " ".join(best)))
    return out, scanned


def find_repeated(files):
    """The same sentence in three or more files. Verbatim copies only.

    Two sites inside ONE file was tried and removed. It is a real defect -- a
    doc-comment and an inline comment four lines apart gave the same rationale
    twice -- but shingles do not find it: run against the very case that motivated
    it, the check returned **0**, because the two sites were a rewrite rather than
    a copy. It also added 828 findings on a 1,819-file repository at the same bar,
    and raising the bar until that fell to 50 still returned 0 on the real case.
    A tuning problem would move with the threshold; this did not, so the method is
    wrong for it and the check is gone rather than loosened. Same-file duplication
    is found by reading, and `decant` says so.

    Across files it earns its place: one phrase turned up in five source files
    plus the note, and those really were copies.
    """
    seen = {}
    for path in files:
        for ln, text in blocks(path):
            for sh in shingles(text):
                if len(set(sh) - STOP) >= 4:
                    seen.setdefault(sh, []).append((path, ln))
    out = []
    for sh, sites in seen.items():
        if len({p for p, _ in sites}) >= 3:
            out.append((" ".join(sh), sorted(sites)))
    return sorted(out, key=lambda x: -len(x[1]))


# --------------------------------------------------------------------- run --


def run(root, config, only):
    root = os.path.abspath(root)
    cfg = load_config(root, config)
    map_dir = os.path.join(root, cfg["map_dir"])
    terr_dir = os.path.join(map_dir, "territory")

    all_notes = []
    if os.path.isdir(terr_dir):
        for fn in sorted(os.listdir(terr_dir)):
            if fn.endswith(".md"):
                all_notes.append((fn, read(os.path.join(terr_dir, fn))))
    notes = [(fn, t) for fn, t in all_notes if not only or only in fn]

    by_name, every = source_index(root, cfg)
    exts = cfg["comment_exts"]

    # A territory filter narrows the NOTES; it must narrow the files too, or the
    # scope line says "1 note" while the findings cover the whole tree. Found by
    # running it: the first scoped run reported 30 history hits across 188 files
    # under a header claiming one territory.
    scanned_files = every
    scope_note = "whole tree"
    if only:
        named = set()
        for _, text in notes:
            named |= named_files(text, by_name, exts)
        scanned_files = sorted(named)
        scope_note = f"files named by the filtered note(s)"

    total_blocks = sum(len(blocks(p)) for p in scanned_files)

    # --- scope, first and unconditionally -----------------------------------
    print("scanned")
    print(f"  root            {root}")
    print(f"  config          {cfg['_source']}")
    print(f"  map             {cfg['map_dir']}/territory -- {len(notes)} note(s)"
          + (f"  (filtered to '{only}')" if only else ""))
    print(f"  extensions      {' '.join(exts)}")
    print(f"  source files    {len(scanned_files)} of {len(every)}  ({scope_note})")
    print(f"  comment blocks  {total_blocks}")
    if not notes:
        print("\n  NO NOTES READ. Either this repo keeps no map, or `map_dir` is wrong.")
        print("  `decant` does not run without a map -- this is not a clean result.")
        return 0
    if not scanned_files:
        print("\n  NO SOURCE FILES READ. `comment_exts` matches nothing in this tree.")
        print("  This is a scope failure, not a clean result.")
        return 0
    unscanned = sorted({os.path.splitext(f)[1] for f in scanned_files} - set(PREFIXES))
    if unscanned:
        print(f"  UNSCANNED exts  {' '.join(unscanned)}  (no comment opener known)")

    # --- the derived order, printed before anything is read -----------------
    if not only:
        print()
        print("order  (production comment blocks per line of ## Design model -- read top-down)")
        print("       not by commit activity, and never by where you expect a finding.")
        print("       Test blocks are read too, but do not rank: they are counted beside it.")
        ranked, unattr, shared_table = territory_order(notes, by_name, exts)
        for ratio, note, nb, nd, nown, nsh, nt in ranked:
            extra = f" (+{nsh} shared)" if nsh else ""
            tests = f"  +{nt} test" if nt else ""
            print(f"  {ratio:7.1f}  {note:<34} {nb:5d} blocks / {nd:3d} design lines"
                  f" / {nown} own file(s){extra}{tests}")
        if unattr:
            print()
            print("  REFACTORING TARGETS -- every file these name is shared with another note.")
            print("  The pass cannot scope them, and that is the cheap half. grill-map M3:")
            print("  a file holding a large share of a layer is several territories that were")
            print("  never named in the code. The map named them; the code did not. Carry")
            print("  these to a person with the numbers -- nobody is looking for them.")
            for note, nsh, nd in unattr:
                print(f"      {note:<34} {nsh} shared file(s) / {nd:3d} design lines")
        if shared_table:
            layer = {}
            for f in every:
                layer[os.path.splitext(f)[1]] = layer.get(os.path.splitext(f)[1], 0) + lines_of(f)
            print()
            print("  the files they share, most-claimed first:")
            for n, f in shared_table[:10]:
                ext = os.path.splitext(f)[1]
                nl = lines_of(f)
                pct = 100.0 * nl / max(layer.get(ext, 1), 1)
                print(f"      {n:2d} notes  {os.path.relpath(f, root):<52}"
                      f" {nl:6d} lines  {pct:4.1f}% of {ext}")

    # --- whether each note's `## Code` names what actually uses it ------------
    # `-` only on a scoped run: a note names peer files that never import each
    # other as a matter of course, so on the whole tree it is mostly noise.
    drift = [(n, o, e, c if only else [])
             for n, o, e, c in code_drift(notes, all_notes, by_name, exts, every)]
    drift = [d for d in drift if d[1] or d[2] or d[3]]
    print(f"\ncode drift      {len(drift)} note(s)")
    for note, orphans, elsewhere, unconnected in drift:
        print(f"  {note}")
        for f in orphans:
            print(f"      +! {os.path.relpath(f, root)}   uses its module, and NO note names it")
        for f in elsewhere:
            print(f"      +  {os.path.relpath(f, root)}   uses its module, named by another note"
                  " -- usually a consumer")
        for f in unconnected:
            print(f"      -  {os.path.relpath(f, root)}   in ## Code, no use either way with"
                  " any file it names: a peer or a wrong entry -- read it")
    print("  -> fix the note before reading it: the findings below scan what ## Code names,")
    print("     so a wrong list sends the pass to the wrong file. Rust and JS/TS only.")
    if only:
        extra = sorted({f for _, o, e, _ in drift for f in o + e} - set(scanned_files))
        if extra:
            print(f"  scope below includes the {len(extra)} unlisted file(s) above.")
            scanned_files = sorted(set(scanned_files) | set(extra))

    # --- findings ------------------------------------------------------------
    hist = find_history(scanned_files)
    rest, rest_blocks = find_restated(notes, by_name, exts)
    reps = find_repeated(scanned_files)

    print(f"\nhistory-shaped  {len(hist)}")
    for path, ln, hit, text in hist[:40]:
        print(f"  {os.path.relpath(path, root)}:{ln}  [{hit}]")
        print(f"      {text}")
    if len(hist) > 40:
        print(f"  ... {len(hist) - 40} more")
    print("  -> DROP, or DESIGN where it constrains. This cannot tell them apart.")

    print(f"\nrestated        {len(rest)}   (compared {rest_blocks} block(s) named by a note)")
    for path, ln, note, n, phrase in sorted(rest, key=lambda r: -r[3])[:40]:
        print(f"  [{n:3d}] {os.path.relpath(path, root)}:{ln}  vs {note}")
        print(f"        ...{phrase}...")
    if len(rest) > 40:
        print(f"  ... {len(rest) - 40} more")
    print("  -> about HALF of what is there. A rewrite of the same fact shares no")
    print("     phrase, so silence here is not evidence the rest is clean.")

    print(f"\nrepeated        {len(reps)}")
    for phrase, sites in reps[:20]:
        print(f"  {len(sites)} sites  ...{phrase}...")
        for path, ln in sites[:6]:
            print(f"        {os.path.relpath(path, root)}:{ln}")
    if len(reps) > 20:
        print(f"  ... {len(reps) - 20} more")
    print("  -> real copies across files. Two sites in ONE file are a reading")
    print("     finding, not a matcher one -- see find_repeated.__doc__.")


    print()
    print("A block is a run of comment lines, not a paragraph: one block is often")
    print("three or four verdicts. The block count is a floor on the reading, not")
    print("a measure of it.")
    print("narrow removes work; it does not certify the remainder.")
    return 0


# ---------------------------------------------------------------- selftest --

CFG = json.dumps({"map_dir": "docs/map", "comment_exts": [".dart"]})

NOTE = """# Text overflow

## Design model

- **The measurement is cached on the measurement itself.** It keys on the value
  the answer was computed from, so the memo and the layout cannot list different
  inputs. A note about `previously inline in` must not itself be a finding.

## Code

`utils/overflow_cache.dart` -- `OverflowCache`
- src/plain.dart -- Plain
"""

DIRTY = """/// A memo for the overflow answer.
///
/// Pure extraction of the cell's three loose fields — 한글 too.
/// It keys on the value the answer was computed from, so the memo and the
/// layout cannot list different inputs.
class OverflowCache {}
"""

CLEAN = """/// Returns the next sort direction when a header is tapped.
///
/// Tapping a different column starts fresh in the cycle's first direction.
class Plain {}
"""


def _tree(base, files):
    for rel, body in files.items():
        p = os.path.join(base, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="") as fh:
            fh.write(body)


def _capture(root):
    import io, contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        run(root, None, None)
    return buf.getvalue()


def selftest():
    """Pass on known-good, fire on each defect kind, and report an empty scope.

    The third is the one that matters here: a run that inspected nothing must not
    read like a run that found nothing.
    """
    fails = []

    def expect(cond, what):
        if not cond:
            fails.append(what)

    with tempfile.TemporaryDirectory() as d:
        _tree(d, {
            ".checkup.json": CFG,
            "docs/map/territory/text-overflow.md": NOTE,
            "lib/utils/overflow_cache.dart": DIRTY,
            "lib/src/plain.dart": CLEAN,
        })
        out = _capture(d)
        expect("history-shaped  1" in out, "history: expected exactly 1")
        expect("Pure extraction of" in out, "history: did not name the phrase")
        expect("restated        1" in out, "restated: expected exactly 1")
        expect("plain.dart" not in out.split("repeated")[0],
               "clean file was reported as a finding")
        expect(out.index("scanned") < out.index("history-shaped"),
               "scope block must print before findings")
        # CRLF must not change the answer.
        _tree(d, {"lib/utils/overflow_cache.dart": DIRTY.replace("\n", "\r\n")})
        expect("restated        1" in _capture(d), "CRLF changed the result")

    with tempfile.TemporaryDirectory() as d:  # NO config file at all
        _tree(d, {
            "docs/map/territory/text-overflow.md": NOTE,
            "lib/utils/overflow_cache.dart": DIRTY,
            "lib/src/plain.dart": CLEAN,
        })
        out = _capture(d)
        expect("derived (no .checkup.json)" in out, "missing config not labelled as derived")
        expect("restated        1" in out, "no-config run did not find the restatement")
        expect("1 note(s)" in out, "map_dir was not derived from the tree")

    with tempfile.TemporaryDirectory() as d:  # map somewhere other than docs/map
        _tree(d, {
            "reference/map/territory/text-overflow.md": NOTE,
            "lib/utils/overflow_cache.dart": DIRTY,
        })
        out = _capture(d)
        expect("reference/map/territory" in out, "a map outside docs/ was not found")

    with tempfile.TemporaryDirectory() as d:  # no map at all
        _tree(d, {".checkup.json": CFG, "lib/a.dart": CLEAN})
        out = _capture(d)
        expect("NO NOTES READ" in out, "empty map read as a clean run")
        expect("not a clean result" in out, "empty map not called out")

    with tempfile.TemporaryDirectory() as d:  # map, but nothing to scan
        _tree(d, {
            ".checkup.json": json.dumps({"map_dir": "docs/map", "comment_exts": [".rs"]}),
            "docs/map/territory/text-overflow.md": NOTE,
            "lib/utils/overflow_cache.dart": DIRTY,
        })
        out = _capture(d)
        expect("NO SOURCE FILES READ" in out, "empty source scope read as clean")

    with tempfile.TemporaryDirectory() as d:  # Rust: test blocks, code drift
        _tree(d, {
            "docs/map/territory/glyphs.md": "# Glyphs\n\n## Design model\n\n- one\n- two\n\n"
                "## Code\n\n- `r/src/glyphs.rs` -- `draw`\n- `r/src/wrong.rs` -- `x`\n"
                "- `r/src/dom.rs` -- `d`\n- `r/src/mirror.rs` -- `m`\n",
            "docs/map/territory/other.md": "# Other\n\n## Design model\n\n- a\n\n"
                "## Code\n\n- `r/src/wrong.rs` -- `x`\n- `r/src/dom.rs` -- `d`\n"
                "- `r/src/mirror.rs` -- `m`\n- `r/src/shared.rs` -- `s`\n",
            # Two shared files the note names, linked to each other and to nothing it owns:
            # neither is a wrong entry.
            "r/src/dom.rs": "use crate::mirror;\nfn d() {}\n",
            "r/src/mirror.rs": "fn m() {}\n",
            # Uses the owned module and is named by another note: a consumer, reported apart.
            "r/src/shared.rs": "use crate::glyphs;\nfn s() {}\n",
            "r/src/glyphs.rs": "// prod one\nfn draw() {}\n\n// prod two\nfn b() {}\n\n"
                "#[cfg(test)]\nmod tests {\n    // test one\n    // now owned by glyphs\n"
                "    fn t() {}\n}\n",
            "r/src/wrong.rs": "fn x() {}\n",
            "r/src/raster.rs": "use crate::{atlas, glyphs};\nfn r() { glyphs::draw() }\n",
            "r/src/lib.rs": "mod glyphs;\nmod raster;\nmod wrong;\npub use crate::glyphs::draw;\n",
            # Another crate's `crate::glyphs` is a different module.
            "q/src/elsewhere.rs": "use crate::glyphs;\n",
        })
        out = _capture(d)
        expect("2 blocks /   2 design lines" in out and "+1 test" in out,
               "test blocks were ranked, or not counted beside the rank")
        expect("+! r" in out and "raster.rs   uses its module, and NO note names it" in out,
               "code drift: grouped `use crate::{..}` referrer not reported as an orphan")
        expect("+  r" in out and "shared.rs   uses its module, named by another note" in out,
               "code drift: a referrer another note names was not reported apart from orphans")
        expect("lib.rs   uses its module" not in out,
               "code drift: the crate root's `mod x;` / `pub use` reported as unlisted")
        expect("elsewhere.rs" not in out, "code drift: another crate's `crate::x` counted as a use")
        expect("now owned" in out, "history: `now owned` not found")
        buf = __import__("io").StringIO()
        with __import__("contextlib").redirect_stdout(buf):
            run(d, None, "glyphs")
        scoped = buf.getvalue()
        expect("wrong.rs   in ## Code, no use either way" in scoped,
               "code drift: a named file with no use was not reported on a scoped run")
        expect("mirror.rs   in ## Code" not in scoped and "dom.rs   in ## Code" not in scoped,
               "code drift: two named files linked to each other were reported as wrong entries")

    with tempfile.TemporaryDirectory() as d:  # TS: a type-only import is not a use; demo/ is harness
        _tree(d, {
            "docs/map/territory/keys.md": "# Keys\n\n## Design model\n\n- one\n\n"
                "## Code\n\n- `w/src/input.ts` -- `f`\n",
            "w/src/input.ts": "// what input is\nexport function f() {}\nexport type X = 1;\n",
            "w/src/types.ts": 'import type { X } from "./input";\nexport type Y = X;\n',
            "w/src/user.ts": 'import { f } from "./input";\nf();\n',
        })
        out = _capture(d)
        expect("user.ts   uses its module" in out, "code drift: a value import was not a use")
        expect("types.ts" not in out.split("history-shaped")[0],
               "code drift: an `import type` statement counted as a use")
        expect(test_start(os.path.join(d, "w", "demo", "main.ts")) == 1,
               "demo/ was not classed as harness")

    if fails:
        print("selftest FAILED")
        for f in fails:
            print("  -", f)
        return 1
    print("selftest ok -- passes clean input, fires on each kind, reports empty scope")
    return 0


def main():
    # Source comments carry em-dashes, quotes and non-Latin text, and a console
    # on a non-UTF-8 codepage raises on the first one. Measured: this passed its
    # selftest (ASCII fixtures) and died on the third finding of its first real
    # run, on a cp949 console. Replace rather than raise -- a mangled character
    # is a worse report; a traceback is no report at all.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser(add_help=True, description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".", help="repository root (default: cwd)")
    ap.add_argument("--config", help="path to .checkup.json (default: <root>/.checkup.json)")
    ap.add_argument("--territory", help="only notes whose filename contains this")
    ap.add_argument("--selftest", action="store_true", help="verify this pass itself")
    args = ap.parse_args()
    if args.selftest:
        return selftest()
    return run(args.root, args.config, args.territory)


if __name__ == "__main__":
    sys.exit(main())
