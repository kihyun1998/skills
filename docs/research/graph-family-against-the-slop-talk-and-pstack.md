# The graph family against the slop talk and pstack

Everything one session found when it compared the graph family (`thegraph`,
`thegraph-herdr`, `grill-the-graph`, `grill-map`, and the steps `read-it`,
`make-it`, `check-it`, `ask-it`) with a conference talk and the plugin its speaker
published. It records the sources, what each says, what the graph family has and
lacks, which earlier decisions the comparison reopens, the corrections made along
the way, and the issues filed. It decides nothing; the decisions are on
[#71](https://github.com/kihyun1998/skills/issues/71) and its children.

**Where this file lives.** `docs/research/` holds research kept before a decision,
as `thegraph-herdr-models-context.md` does.

**Date of every check:** 2026-11-17, on macOS, Claude Code 2.1.326, `yt-dlp`
2026.08.19, this repository at `6574a19`.

**Labels used on every claim.**

| Label | Meaning |
|---|---|
| **measured here** | read from a file or run in this session, with the file, line, command or commit given |
| **maintainer's call** | a choice recorded as the maintainer's, with where it is recorded |
| **speaker-reported** | stated by the talk's speaker or by the commentary video about their own team. Not checked |
| **inferred** | reasoning from the cited facts. Nobody measured it |

## A. Sources

| # | Source | How it was read | Label |
|---|---|---|---|
| 1 | Lauren Tan ("Potato"), *All Code Is Slop (Except Mine)*, AI Engineer, 17:31. https://youtu.be/O_zcc6Xl12g | YouTube auto-generated English captions (`en-orig`; the video has no uploaded captions), via `yt-dlp --skip-download --write-auto-subs --sub-langs en-orig --sub-format vtt`, then timestamps and repeated rolling lines stripped and grouped per minute. About 2,870 words | measured here |
| 2 | AgentOS, *AI 코드 슬롭 안 만드는 법 — SpaceX Grok Bot 팀이 PR 1만 개를 내보내고 0.5%만 되돌린 장치들*, 22:52, Korean commentary on #1 with clips. https://youtu.be/ueA116hO_ho | auto-generated Korean captions (`ko-orig`), same procedure. About 1,700 words | measured here |
| 3 | pstack, https://github.com/cursor/plugins/tree/main/pstack at `e1cc031` (2026-11-16 22:18 -0800) | sparse clone; files read raw with `cat` | measured here |

`ffmpeg` and `whisper` are not installed on this machine, so a video without
captions could not have been transcribed; both videos had auto-generated ones.
Caption text is speech recognition and carries errors: names drift
("Grokbot", "Graph Bot", "Gulp bot", "Growth Bot" for one product; "로렌타니",
"로렌타", "로렌 탄" for the speaker), and #2's opening figure reads "19,26개",
which is garbled. Timestamps below are the caption minute, `[mm:ss]`.

**Read in pstack:** `README.md`; `skills/poteto-mode/SKILL.md`, `worker.md`,
playbooks `bug-fix`, `feature`, `perf-issue`, `hillclimb`, `refactoring`;
`correct`; `no-comments` and `agents/comment-sicko.md`; `create-verification-skill`;
`maintain-verification-skill` (first 30 lines); `create-formal-verification-skill`;
`maintain-formal-verification-skill`; `statechart` (first 40 lines);
`benchmark-checklist`; `blast-radius`; `interrogate`; `in-your-own-words`; `tdd`;
principles `encode-lessons-in-structure`, `never-block-on-the-human`,
`prove-it-works`, `fix-root-causes`, `explain-the-number`,
`test-behavior-not-implementation`; guide chapters 06, 08 and the `/correct`
section of 09.

**Not read in pstack:** the other 15 playbooks, `arena`, `swarm`, `architect`,
`why`, `how`, `recall`, `ketchup`, `teach`, `reflect`, `sharpen`, `automate-me`,
`show-me-your-work`, `figure-it-out`, `unslop`, `technical-writing`,
`typescript-best-practices`, the remaining 18 principles, `setup-pstack`,
`poteto-help`, guide chapters 01-05, 07, 10, the `benny` automations, and the
`statechart` and `watch-pr` scripts.

**Read in this repository:** `thegraph`, `thegraph-herdr`, `grill-the-graph`,
`grill-map`, `read-it`, `make-it`, `check-it`, `ask-it` in full; ADR-0065,
ADR-0066 (first 60 lines), ADR-0076 (first 40), ADR-0083, ADR-0091 (first 40),
ADR-0092 (first 30); `docs/agents/issue-tracker.md`, `triage-labels.md`,
`skill-dependencies.md` (the `tdd` row). **Not read:** `thegraph-codex` beyond its
description, `lens`, `sweep` and `firsthand` beyond a grep, `grill-map/NOTES.md`.

## B. What the talk says

| # | Claim | Where | Label |
|---|---|---|---|
| 1 | The speaker shipped 3,000 PRs in a month; it took six months to get there | [00:00], [01:00] | speaker-reported |
| 2 | The job is keeping or raising code quality while raising output; the speaker calls it *trust*, not a software factory: invest in the agent's environment so you can trust what it does | [01:00] | speaker-reported |
| 3 | An inverted pyramid of where to spend: the codebase (API design, architecture, refactoring) and static analysis (lint, types, compilers, tests) are deterministic and constrain the agent; verification (runtime, formal) finds bugs and checks the agent understood the intent; a little prose (rules, skills, `AGENTS.md`) for what needs judgement. The commentary lists five layers, top down: codebase, static analysis, verification, prose, human review | [02:00]; commentary [03:00] | speaker-reported |
| 4 | When correcting an agent, make it a deterministic check rather than another line in rules or `AGENTS.md`; code is the largest input an agent copies | [03:00] | speaker-reported |
| 5 | Code now arrives as a stream; workarounds, anti-patterns, deprecated code and debt get copied by the next agent as the established pattern, so keep the codebase pristine | [03:00]-[04:00] | speaker-reported |
| 6 | Dune, a client framework for Grok Bot, encodes lessons as constraints and lint rules. Anything that needs nuance to use well leads to slop: `useEffect` is banned in product code and allowed only inside Dune APIs, so the problem is gone from review | [05:00]-[06:00] | speaker-reported |
| 7 | Context through directory structure: top-level `electron-main` and `electron-renderer` directories, imports between them banned by a dependency-graph analyser and lint rules (from Cursor's main-into-renderer imports causing jank) | [06:00] | speaker-reported |
| 8 | Agents use Markdown — documentation, code comments, rules, skills — to write justifications for not doing the right thing, and over-rotate a small correction into a hard rule | [06:00]-[07:00] | speaker-reported |
| 9 | Cursor example: agents patched an architecture clash (VS Code imperative vs React declarative) with `setTimeout`, `requestAnimationFrame`, `requestIdleCallback`, wrote comments justifying each, and timers spread until GC pressure hurt performance | [07:00]-[08:00]; commentary [09:00] (dates 9 Sep, 3 Oct, 17 Oct on screen) | speaker-reported |
| 10 | Grok Bot bans 99% of comments: they go stale, humans do not read them, they give an agent an escape hatch, and they are not enforceable. Lint rules give helpful errors telling the agent to fix the root cause | [08:00]-[09:00] | speaker-reported |
| 11 | Comments went from 65,824 (end of July) to 1,227; a step chart from 7 to 167 shown while stating the principle (axis unlabelled) | commentary [12:00] | speaker-reported, via the commentary |
| 12 | Every correction becomes a deterministic check or is eliminated by API design or architecture; done often enough, nothing is left to review and agents merge most of their own PRs | [09:00] | speaker-reported |
| 13 | Review shrank to verification artifacts: videos, screenshots, diagrams, formal verification | [09:00] | speaker-reported |
| 14 | Runtime verification: the agent runs the code and uses developer tools (Chrome DevTools protocol). A *feature map* lists the app's features from the user's view, giving shared vocabulary; custom CLIs inside the skills are reused, cut tokens and are testable | [10:00] | speaker-reported |
| 15 | Formal verification: TLA+ model-checks major flows such as notifications across devices; Lean proves algorithms, e.g. their virtualization library has no flicker or jitter. Found bugs; not a silver bullet, another layer | [10:00]-[11:00] | speaker-reported |
| 16 | Property-based testing of UIs with Bombadil caught UI bugs | [11:00] | speaker-reported |
| 17 | A colleague went from distrusting agents over subtle merged bugs (May) to 70% of daily tokens spent on verification (November); the speaker sees the same. These are old techniques that agents make cheap | [11:00]-[12:00]; commentary [15:00] | speaker-reported |
| 18 | `statechart` in pstack draws state machines from the user's view; easier to review beside videos and screenshots | [13:00] | speaker-reported |
| 19 | Grok Bot team: 11,000 PRs to production last month (the commentary instead opens with "about 20,000 merged in October", its exact figure garbled in the captions; the two were not reconciled); a stable release about once a day (slide medians 25 h September, 28 h October, per the commentary); about 227 contributors in October; reverts steady at about 0.5%; startup, typing, opening and switching chats got faster; an Electron ceiling, Rust rewrite considered | [13:00]-[15:00]; commentary [17:00]-[19:00] | speaker-reported |
| 20 | Order: before automating, fix corrections in the codebase first — a lint to stop new occurrences, then clean the old — and make verification strong. Automating a loop that produces slop produces more slop | [15:00] | speaker-reported |
| 21 | On each release Grok Bot starts a project that fuzzes the whole app like a user, opens fix PRs and auto-merges them | [16:00] | speaker-reported |

## C. pstack, skill by skill

Only what bears on the comparison.

| Skill or file | What it does | Label |
|---|---|---|
| `poteto-mode` | Entry point. Matches the task to one of 22 playbooks and copies its steps into a todo list; triggers route to other skills (code → name the data shape; prose → `unslop`; before review → `no-comments`; a measured number → `benchmark-checklist`). Autonomy: reversible work and external actions proceed without asking; pause only for force-push, deploys, data deletion, customer messages. Fable 5.2 runs outside a panel only when named or after two failed Opus 5.5 xhigh runs; *difficulty alone never qualifies* | measured here |
| `worker.md` | Rules every spawned agent reads first: the bar in the kickoff is the whole bar; never show a person a question; make any reversible choice and say why; PR body at most 40 lines under fixed headings | measured here |
| `correct` | Find mistake classes (twice counts) from commits, reverts, review comments, instruction files and workaround comments. Fix at the highest level that works: architecture, then types, then a lint or CI check whose error names the fix (fail only when a change adds more where the pattern is common), then a test, docs last. Prove each check fails on a real past mistake. Keep a table pairing each rule with what enforces it; a rule nothing enforces that recurs is fixed higher; drop a rule once its mistake cannot happen | measured here |
| `principle-encode-lessons-in-structure` | Encode a repeated instruction as a lint, metadata flag, runtime check or script; if the fix is structural, use only the structural fix | measured here |
| `no-comments` + Comment Sicko | A separate agent reads every comment in the scope. Keeps only license headers, outside constraints we cannot reshape, `prettier-ignore`, public API doc comments, issue or RFC links. A surprise in our own code is deleted and its symbol flagged `MUST KILL` for rename, extraction, type or redesign. Long justifications are "a confession". Suppressions (`eslint-disable`, `@ts-ignore`) are audited and killed where the rule protects correctness. Constraint comments (*do not remove*) get an offered type, runtime, test or lint encoding, then are deleted | measured here |
| `create-verification-skill` | Generates a committed project-local skill: Launch, Doctor, Drive, Evidence, Cleanup, Helpers, plus a user-view feature map (one file per feature, four fixed headings). Interviews the repo, not the user. Proven once end to end before hand-over, evidence surviving cleanup | measured here |
| `maintain-verification-skill` | Periodic pass: one read-only reader per feature, one live pass driving every feature; outcome clean, changed (one PR of proven corrections) or blocked; never edits product code | measured here (first 30 lines) |
| `create-formal-verification-skill` | Pick the strongest target: a promise where a break harms users and tests rarely reach. The question picks the tool (TLA+ for bad orderings, a code-level verifier for every input, a proof where a bound is not enough; generated inputs where no verifier exists). Show each property failing on a broken variant; findings stay findings; state bounds; one command to rerun; record covered code and the commit last confirmed | measured here |
| `maintain-formal-verification-skill` | After changes that skipped the check: classify each change to covered code (no effect, model stale, promise changed on purpose with evidence, promise maybe broken); update from the code, not the result; prove the updated check can still fail; outcomes in sync, updated, bug, blocked | measured here |
| `statechart` | Checks a TLA+ model with TLC and draws a Mermaid statechart in the reader's words, marking states that break a rule with the shortest path to each | measured here (first 40 lines) |
| `benchmark-checklist` / `principle-explain-the-number` | Before trusting a number: write the claim; name the limiter (*why not double?*); run every side tuned like production; check physical limits; count errors; at least five alternating runs, median and range; measure end to end; confirm the work happened in the timed region. Verdict faster, slower, no measurable difference, or inconclusive | measured here |
| `blast-radius` | Find the one fact a change is safe because of and prove it by running code. Certainty ladder: said so → pointed at the line → walked the failure → ran a script or test → reproduced in the app | measured here |
| `interrogate` | Several models try to break a change; each finding must carry the exact command, its output and the output the intent requires; anything not run is dropped; findings are rerun to verify | measured here |
| `principle-never-block-on-the-human` | Proceed on reversible work, present the result, let the human correct after the fact | measured here |
| `principle-test-behavior-not-implementation` | Keep a test that fails when behaviour breaks and survives an internal change | measured here |
| playbooks `bug-fix`, `perf-issue`, `hillclimb`, `refactoring` | Reproduce on the real surface; binary-search the cause with runtime evidence; failing repro committed before the fix. Perf: baseline trace vetted by the checklist; the "performance mantras" in order. Hillclimb: freeze a harness proven sensitive, one change per measurement, keep or revert, a decision log. Refactoring: pin behaviour with a characterization test before moving structure | measured here |
| `tdd` (pstack's own) | Write a failing test only when the path is cheap; prefer no new test over a bad one | measured here |
| `README.md` | No planning skills ("the best spec is code"); `automate-me` drafts a personal mode skill from transcripts | measured here |

## D. What the graph family has

| Idea | Graph family | Where | Label |
|---|---|---|---|
| Repeated correction becomes a check (B4, B12; `correct`) | **absent.** A repeat goes to `docs/agents/thegraph.md` as prose, or to an issue | `grill-the-graph/SKILL.md` *The build grows*; `ask-it/SKILL.md` | measured here |
| A durable way to reach the real thing (B14; `create-verification-skill`) | **partial.** `check-it` (3) says prove it against something real and prefers a real consumer; it does not point at what the build or map records for that | `check-it/SKILL.md:21`, *Proving it works* | measured here |
| Prove it on the real artifact | present | `check-it` (3), real-consumer proof | measured here |
| Fix the root cause | present | `make-it` *"I'll just fix it up here"*; `check-it` *The shape nobody will have marked* | measured here |
| Fewer comments (B10; `no-comments`) | **partial, policy only.** The rule `grill-the-graph` §3 writes into `CLAUDE.md` (ADR-0076). No per-diff check: `check-it` has no comment step; `sweep` stops short of a comment audit (`sweep/SKILL.md:101`); `decant` retired with *nothing* moved (ADR-0092). Lint suppressions are read by nothing | as listed | measured here |
| The writer does not judge | present | `lens` and reviewer in fresh agents, ADR-0091, ADR-0095 | measured here |
| A check never seen failing is not evidence | present, stricter than pstack | `make-it` test bar with five mutation patterns | measured here |
| Findings proven by a run (`interrogate`) | **partial.** The reviewer grades (violation, judgement, already decided); the caller reproduces afterwards | `check-it` *Briefing the reviewer* | measured here |
| The one safety fact and its certainty (`blast-radius`) | **partial.** No certainty level recorded | `lens`, `grill-map` blast edges | measured here |
| Properties, fuzzing, benchmarks, model checking (B15-B16; formal skills, `benchmark-checklist`) | **absent from the skills.** A grep of `read-it`, `make-it`, `check-it`, `ask-it`, `lens`, `firsthand`, `thegraph` for property, fuzz, benchmark, model check, TLA, median, profile, equivalence, characterization, random finds none; `check-it` (5) is one sentence (*no defect without a number*); the `tdd` skill `make-it` calls (mattpocock) has none either | grep in this session | measured here |

## E. Comments and the map

The talk does not say *move comments somewhere better*. Its reasons (B10) and its
remedy (lint plus API and architecture) leave no document in between, and B8 names
Markdown in general as the place for justifications. Three of its four reasons —
stale, an escape hatch, unenforceable — hold for a map note as for a comment
(inferred). Moving a workaround's reason into the map under ADR-0076 moves the
escape hatch instead of closing it (inferred). The talk keeps a narrow prose layer
for judgement (B3), and pstack keeps no document for *why*: its `why` skill reads
commits and PR discussions on demand (`README.md`, skills table). So the map is
sorted, not abolished:

| What a map note holds | Where it goes by the talk's measure | Label |
|---|---|---|
| a workaround's reason; a surprise in our own code explained | nowhere — the code is the thing to fix | inferred |
| a trap (*importing X from Y breaks*) | a check or structure where one can hold it, then off the note | inferred |
| a boundary or invariant (blast edge, invariant note) | partly as structure: B7's directories with imports banned | inferred |
| a measured value, outside constraint, reason behind a design judgement | stays: the prose layer | inferred |
| history | commit message, as now | measured here (ADR-0076) |
| the navigation itself (*what else moves*) | pstack has no counterpart and the talk gives no measure; weighed on its own | measured here (absence) |

ADR-0076's measurement still stands: 310 comment blocks across five repositories
shared verbatim phrasing with a map note, and 58 of 163 notes already held the
history a comment would duplicate (ADR-0076, *Why one bin*). It measured
duplication; it did not consider a comment as the channel by which a workaround
spreads (inferred: the record's grounds do not mention it).

## F. The pyramid and where the graph family sits

Going down B3's pyramid for each correction — can structure remove it, then a type
or lint block it, then a test or verification catch it, only then prose — is
pstack `correct`'s order. The graph family sits almost entirely in the bottom two
layers: prose (map notes, decision records, `CLAUDE.md` rules, `thegraph.md`) and
human review (the confirm stop, `ask-it`) (inferred from D). No sentence in either
transcript says layering *produces* documents; the structure pushes documents to
the narrowest layer. The documents pstack does produce under it are the rule and
enforcer table (`correct`), the verification skill and feature map, and prose for
judgement (measured here).

## G. What the target repositories already run

The 16 repositories under `kihyun1998` pushed most recently, checked with
`gh api repos/kihyun1998/<repo>/contents/...` for `docs/agents/thegraph.md`, the
`docs/map` entry count, the root manifest (grepped for `proptest`, `quickcheck`,
`arbitrary`, `bolero`, `glados`, `fast-check`, `rapid`), and top-level `fuzz`,
`bench`, `benches`, `benchmark` folders.

| Repository | Manifest | `thegraph.md` | map entries | Property-test crates in root manifest | Top-level folders |
|---|---|---|---|---|---|
| justrdp | Cargo.toml | yes | 3 | `arbitrary`, `proptest` | bench, fuzz |
| justssh | Cargo.toml | yes | 14 | `proptest` | fuzz |
| justerm | Cargo.toml | yes | 3 | none | bench, fuzz |
| justsftp | Cargo.toml | yes | 5 | none | — |
| justpdf | Cargo.toml | yes | 3 | none | — |
| gltree | Cargo.toml | yes | 8 | none | — |
| clch | Cargo.toml | yes | 9 | none | — |
| just-harness | Cargo.toml | yes | 8 | none | — |
| flutter_table_plus | pubspec.yaml | yes | 3 | none | benchmark |
| flutter_folderview | pubspec.yaml | yes | 3 | none | benchmark |
| just_tooltip | pubspec.yaml | yes | 3 | none | — |
| x509_cert_store | pubspec.yaml | yes | 3 | none | — |
| flutter_smooth_wheel_scroll | pubspec.yaml | yes | 3 | none | — |
| justable | package.json | yes | 4 | none | — |
| just-admin-page | package.json | yes | 2 | none | — |
| kubeckup | go.mod | yes | 3 | none | — |

Workflows and builds read for three of them (measured here):

- **justrdp:** 50 files under `fuzz/fuzz_targets`; workflows `coverage`, `fuzz`,
  `overflow-32bit`, `supply-chain`, `test`. `fuzz.yml` fuzzes the untrusted-input
  decoders (its ADR-0008, issue #99), nightly-only, as the counterpart to the
  in-crate `proptest` no-panic properties that run in `cargo test`; `test.yml`
  gates a fuzz roster. Its `docs/agents/thegraph.md` names the `[MS-*]` specs,
  FreeRDP and IronRDP source, a real VM, FreeRDP as a client against the same VM
  (procedure in `docs/map/territory/verification-harness.md`), and has a
  *Proof of a performance claim* section: a change under `crates/justrdp-codecs/`
  runs the codec benchmarks against master *"during `check-it`'s `silt` step"*
  (#555). **`silt` retired into `check-it` (5) under ADR-0092**, so that line names
  a step that no longer exists.
- **justssh:** two fuzz targets; `fuzz.yml` nightly and on demand, never a PR
  gate; inputs kept in `fuzz/regressions/` are replayed on every PR by
  `crates/justssh/tests/fuzz_regressions.rs`. Its build names RFCs, OpenSSH
  `PROTOCOL`, x/crypto/ssh, and acwbroker's `blackbox/` as the completion judge.
- **justerm:** two fuzz targets; `fuzz.yml` fuzzes decode and feed, counterpart
  to `proptest` properties in `tests/robustness.rs`. Its build pins every
  reference tree by SHA and notes that `.github/scripts/cite.mjs --pins` parses
  the table.

So the repositories already work the pyramid's upper layers by hand, the skills
name none of these lanes, and each repository fills the gap in prose — one piece
of which is already stale (inferred from the above).

`read-it`'s eval cases point at the same kind of targets: x509_cert_store (an FFI
binding), flutter_table_plus (a benchmark issue), flutter_folderview,
flutter_smooth_wheel_scroll, and an admin web app whose issue #17 asks to enforce a
route wrapper *"with a test or a lint rule"* (`read-it/evals/cases/*/issue.md`,
measured here).

## H. Earlier decisions the comparison reopens

The test applied to each: could what the maintainer was shown when deciding have
revealed the new information? If not, the decision is untested on that point
(`thegraph/SKILL.md`, *Habits*). Each is the maintainer's to reopen.

| Decision | Decided on | New information | Recommendation given | Label |
|---|---|---|---|---|
| ADR-0076: a comment's why moves to the map | measured duplication between comments and notes | a justifying comment is how a workaround spreads (B9) | amend in part: design reasons stay in the map; a workaround's justification goes nowhere and the code is fixed | inferred |
| ADR-0092: `decant` retires | zero invocations 2026-09-28 to 10-27 (one real bulk migration before) | B20: stop new occurrences first; no per-diff stop ever existed | keep retired; add a per-diff check to `check-it` instead | inferred |
| `grill-map` *Scope* "Builds no tool"; `grill-the-graph` "Generated scripts or agents" (never writes) | see §I | product-code checks are not copies of the method's process | first recommended reversing; corrected in §I to *keep both* | inferred |
| ADR-0066: there are no gates | every check in this repo compared two copies of one fact | its principle (one home per fact) matches `correct` deleting the prose rule once a check enforces it | keep; it concerns this repository | inferred |
| ADR-0091: one reader, not N attackers | measured `lens` runs and a 32-run audit | pstack uses several models but reports no measurement | keep until compared | inferred |
| The confirm stop; decisions put to the maintainer | the maintainer's standing instruction and `thegraph` | `never-block-on-the-human` is the opposite | keep: `read-it`'s regression cases are the misreadings the stop catches | inferred |

## I. Found while grilling #72

`grilling` on #72 began by reading ADR-0065 and ADR-0083 in full (measured here):

- **ADR-0065** retired this repository's own build (686-line `thegraph.md`, 8
  scripts of 2,645 lines, 4 generated agents, 3 checkers) and the gates whose
  corpus was the skill. It gives no reason against checks in a target repository,
  and states that the rules of ADR-0061 and ADR-0063 stay in `grill-the-graph` for
  any future build.
- **ADR-0083** concerns map checkers only.
- **`grill-map`'s "Builds no tool"** came in commit `8fd14fc` (2026-10-22): runs on
  justable and justelnet built a saved site-coverage script and an ad-hoc link
  checker nobody asked for. The maintainer chose then that a check may be
  **proposed** in the closing report and **built** by the maintainer's decision,
  over banning proposals too (maintainer's call, commit message).
- **`grill-the-graph`'s "never writes"** has been there since the initial import
  (`cab1a0d`, 2026-09-29) and concerns what setup generates.

So neither clause forbids checks in a target repository; a product check added by
an ordinary `/thegraph` change is not blocked. The gap is that nothing in the
family raises a repeated correction as a check, and #72's question becomes who
raises a check and how it is built (inferred).

Decided in the same grilling, one question at a time (maintainer's call; recorded
in #72's closing comment, not as a decision record, per Q6):

| | Decision |
|---|---|
| Q1 | Both clauses keep their meaning. Their wording is rewritten to fit Q2, replacing text rather than adding it (`grill-map/SKILL.md` is at 499 lines). The maintainer's first answer was *keep them, but improve each to fit the requirement*; a proposed scope sentence was withdrawn once its ground failed: `grill-map`'s body (lines 494-499) already states the scope, and the misreading came from quoting its bold label alone. `grill-the-graph`'s *"A `code` check is a command a run is told to run, not a program committed to the repo"* is genuinely ambiguous: the term appears nowhere else in a live skill and its origin could not be traced |
| Q2 | A new skill builds checks; existing skills raise them. `ask-it` (a check-candidate item), `grill-map` (its closing report's check proposals) and `grill-the-graph` (*The build grows*: check first) raise; a kept candidate becomes an issue; `/thegraph` builds it, with `make-it` calling the new skill, which also runs directly to mine history for repeated mistakes. The maintainer asked whether `grill-the-graph` should hold it instead; it should not: setup runs once and cannot be called per change, its scope is *it touches nothing else*, Q1 keeps its no-scripts clause, and its body is already 515 lines |
| Q3 | Repositories in contributor mode are excluded (ADR-0079) |
| Q4 | The skill is named `encode-it` |
| Q5 | New child #80 for `encode-it`; #73 rewritten as the raising side, blocked by #80; #74's block on #72 lifted; #72 retitled *"Decide: who raises a repeated correction as a check, and what builds it"* |
| Q6 | Recorded on #72 only; whether it becomes a decision record waits for #79 |

Derived, not asked: `encode-it` is model-invocable, because `make-it` must reach it.
While deciding, a scratch run showed that lint can print a message of one's own at
each violation: Rust's `clippy.toml` `disallowed-methods` / `disallowed-types` with
a `reason`, and ESLint 9.26.0's built-in `no-restricted-imports` and
`no-restricted-syntax`, which reproduced the talk's three cases (§O.3 has the
files). The maintainer chose `custom_lint` for Dart; not run here.

## J. Corrections made during the session

Recorded because each changed what was filed.

| # | First stated | Corrected to | Ground |
|---|---|---|---|
| 1 | Comments: graph family *present* | *partial, policy only* | §D row; `decant` retired with nothing moved (ADR-0092) |
| 2 | Earlier decisions were treated as constraints ("conflicts with an existing decision") | each is the maintainer's judgement and can be reopened; judged by §H's test | `thegraph/SKILL.md` *Habits*; the maintainer's instruction to improve |
| 3 | #72 recommended *reversing* the two clauses | *keep both*; the question is who raises and builds a check | §I |
| 4 | Formal verification and property tests dismissed as "heavy, far from library repositories" | they fit libraries and sans-IO state machines best; the target repositories already fuzz and use `proptest` | §G; B15-B16 |
| 5 | The verification layer was folded into one item, a durable way to drive an app | four distinct things (runtime, formal, property-based, fuzzing); the app-driving item narrowed because the repositories already record the way to the real thing | B14-B16, B21; §G |
| 6 | Issues stopped at *where it would go* | each gained *Done when* with a replay measurement | issues #72-#78 |

## K. Not taken, with grounds

- **Never block on the human:** contradicts the confirm stop and the maintainer's
  instruction to have decisions put to them.
- **pstack's model rule** against `thegraph-herdr` proposing Fable up front for
  large refactors: no measurement on either side.
- **Multi-model adversarial review:** ADR-0091 chose one reader on measured runs.
- **Merging the feature map into `grill-map`:** different questions (what else
  moves, against how to drive it).
- **Formal verification** was first in this list and moved out to #78 (§J row 4).
- **Release-time fuzzing** (B21): a target repository's CI choice, not a
  graph-family step.
- **A correction becoming a check without a person's yes** (B12; pstack
  `never-block-on-the-human`): a candidate found while working goes to `ask-it`,
  and a direct `encode-it` run shows its classes before building any. Ground: the
  maintainer's standing instruction not to add or decide on their behalf (#80 Q1
  and Q13, 2026-11-18).

## L. Issues filed

All under the anchor [#71](https://github.com/kihyun1998/skills/issues/71)
(sub-issue relation), filed 2026-11-17. State as of the end of the session:

| Issue | Subject | State |
|---|---|---|
| [#72](https://github.com/kihyun1998/skills/issues/72) | who raises a repeated correction as a check, and what builds it | **closed**; decisions in its closing comment (§I) |
| [#73](https://github.com/kihyun1998/skills/issues/73) | raise a repeated correction as a check candidate (`ask-it`, `grill-map`, `grill-the-graph`) | open; blocked by #80 |
| [#74](https://github.com/kihyun1998/skills/issues/74) | `check-it` (3) proves against the way to the real thing a repository already records | open; ready |
| [#75](https://github.com/kihyun1998/skills/issues/75) | the comment rule, a per-diff comment check, what the map keeps; the ADR-0076 amendment moved to #79 (2026-11-18) | open; decided in grilling 2026-11-18 (allow-list in `CLAUDE.md`, a separate check agent; decisions on the issue), `ready-for-agent`; comment survey posted on #75 |
| [#76](https://github.com/kihyun1998/skills/issues/76) | reviewer findings carry their reproduction; reports carry the certainty level | open; ready |
| [#77](https://github.com/kihyun1998/skills/issues/77) | `make-it` and `check-it` use the property, fuzz and benchmark lanes a repository runs; `benchmark-checklist`'s method in `check-it` (5) | open; ready |
| [#78](https://github.com/kihyun1998/skills/issues/78) | whether to bring formal verification in, starting with one trial | open; `needs-grill` |
| [#79](https://github.com/kihyun1998/skills/issues/79) | how decision records are written and how much they weigh (§M) | open; `needs-grill`; **deferred** 2026-11-18 (§M) |
| [#80](https://github.com/kihyun1998/skills/issues/80) | `encode-it`: a skill that turns a repeated correction into a check | open; decided in grilling 2026-11-18 (decisions on the issue; Dart moves to the official analyzer plugin; first check is #75's comment allow-list) |
| [#82](https://github.com/kihyun1998/skills/issues/82) | clean up the comments target repositories carry from before #75's allow-list; sized by #75's survey (filed 2026-11-18) | open; `needs-grill`; blocked by #75 |

The order to take them is §O.2.

Context comments, posted as context and not as scope (2026-11-17):

- #77: property-based testing where a repository has none (Bombadil, B16);
  characterization tests before a refactor (pstack refactoring playbook); the
  performance mantras and the hillclimb loop beyond `benchmark-checklist`.
- #78: `statechart` as the reading half of a TLA+ check.
- #71: release-time fuzzing, considered and not filed; decision records as
  possible stale comments (§M); a link to this file at `b617045`.
- #75: the maintainer's view that the best comment is no comment at all, which
  would turn the per-diff judgement into a lint-enforceable allow-list; pub.dev
  public API doc comments and license headers as the likely exceptions.

## M. Decision records as possible stale comments

Raised by the maintainer: a record is written lightly but weighs a great deal
afterwards. Measured here:

- 71 records in `docs/adr/`, added 2026-09-29 to 2026-11-17; median 90 lines,
  longest 312, 7,611 lines in all; 11 named for a retirement; 36 carry an amends,
  amended-by, scoped-by, superseded or vacated link; 43 mention a maintainer's call.
- They are written with mattpocock's `domain-modeling`, whose `ADR-FORMAT.md` sets
  the template at one to three sentences and offers a record only when the
  decision is hard to reverse, surprising without context, and the result of a
  real trade-off ("if a decision is easy to reverse, skip it").
- The method gives a record weight: `thegraph` *Habits* (a judgement falls only to
  the person who made it) and `check-it` / `lens` ("where a record has already
  settled a particular clash, the record governs"). In this session that weight
  produced §J row 2.

Against the talk's four reasons (inferred): *stale* applies only where a skill
cites a record as a live rule; *unread* does not apply; *escape hatch* applies;
*unenforceable* applies (ADR-0066). Directions named, none chosen: the live rule
only in the skill and the record only for why and what it was decided on (as
ADR-0076 does); a *what would reopen this* line on every record; hold records to
`domain-modeling`'s three conditions; pstack keeps no records and answers *why*
from commits and PRs. The choice is
[#79](https://github.com/kihyun1998/skills/issues/79).

**Deferred, 2026-11-18** (maintainer's call; reasons on #79). The question was
the maintainer's own addition, and the maintainer chose to improve the family on
the talk's claims first. Re-reading the sources for it showed two things this
section had wrong or missing (measured here, 2026-11-18): the talk never mentions
decision records, so every line above that applies its reasons to records is
inference; and pstack is not record-free — `show-me-your-work` keeps a
one-row-per-decision TSV with an evidence pointer, local by default and committed
only when a reviewer needs it. One answer was given before the deferral: a record
is read as grounds, not as a rule (#79's comment holds it).

## N. Open, and not verified

- **Open for the maintainer, not filed anywhere:** whether to file the stale
  `silt` reference in justrdp's `thegraph.md` in justrdp, and whether other target
  repositories carry the same reference; whether to file that
  `docs/skill-authoring.md` (*"No live skill exceeds the line now… (2026-10-22)"*)
  is no longer true — `grill-the-graph/SKILL.md` is 515 body lines by the command
  that file gives (§O.6).
- **Not verified:** every figure in §B is the speaker's; no pstack skill was run on
  a real repository; only root manifests were read in §G, so property tests in
  workspace member crates may be undercounted; workflows were read in three
  repositories; Dart test suites were not opened; the parts of pstack and this
  repository listed as not read in §A.
- **Artifacts outside the repository:** the caption files, their cleaned text, the
  pstack clone and an HTML summary page (claude.ai artifact `EEkTnChTM6WnFXZJD1Sbsq`,
  private, not updated with §G, §I, §M or issues #77-#80) live in the session
  scratchpad and may be cleared. Everything they held is in this file; §O.3 says
  how to get each source again.

## O. Picking this up in another session

A new session knows nothing of the one that wrote this file. This section is
what it needs, in the order it needs it.

### O.1 Start here

Give the new session this as its first message (in Korean or English), then the
command for the issue at hand:

> Read `docs/research/graph-family-against-the-slop-talk-and-pstack.md` in full,
> then issue #71, its children and their comments, and #72's closing comment,
> before doing anything.

The tracker is the current state; this file is the reasoning behind it. Where the
two disagree, the tracker wins and this file is stale — say so rather than follow
it.

### O.2 The order, and what to read before each

Three are decisions (`needs-grill`), one carries its own decision list, four are
ready to build. The order below is the one recommended at the end of the
session; only #73's place is forced (blocked by #80).

**Changed 2026-11-18:** #79 is deferred (§M), so the work starts at #75. #79's
entry is kept below for when it resumes. #75 was grilled the same day; its
decisions are on the issue, and it is next built with `/thegraph 75` once the
comment survey it asked for is posted there.

**1. #79 — how decision records are written and how much they weigh.**
`/grilling 79`. Deferred 2026-11-18; read #79's deferral comment first when it resumes.

- *Why first:* #75 amends ADR-0076, so its result is a record edit, and #79 says
  how records are written and amended. #72's decision is waiting on #79 to say
  whether it becomes a record at all (Q6). And #79 decides how `thegraph`,
  `check-it` and `lens` word a record's authority, which is what made this
  session treat records as walls (§J row 2).
- *Read:* #79's body; §M; mattpocock's `domain-modeling/ADR-FORMAT.md` (installed
  at `~/.claude/skills/domain-modeling/`, a link into the maintainer's
  `github_local/skills` checkout) for its one-to-three-sentence template and its
  three conditions; `docs/adr/README.md` (not read in this session);
  ADR-0076 as the existing case of rule-in-skill, evidence-in-record; ADR-0092
  and ADR-0084 as retirement records, the kind `domain-modeling` would skip;
  `thegraph/SKILL.md` *Habits*; `check-it/SKILL.md` *Briefing the reviewer and the
  completeness read* ("the record governs"); `lens/SKILL.md`.
- *Re-measure if needed:* `ls docs/adr/*.md | grep -v README | wc -l`;
  `wc -l docs/adr/0*.md | sort -n`; `ls docs/adr | grep -ci retire`;
  `grep -lE 'Amended by|Scoped by|Superseded|vacated|Amends ' docs/adr/*.md | wc -l`.
- *After deciding:* whether #72's decision becomes a record; whether existing
  records change.

**2. #75 — comments, and what the map keeps.** `/grilling 75`.

- *Why first now:* its outcome may hand a comment allow-list to `encode-it`
  (#80) as a lint. It no longer waits on #79: the ADR-0076 amendment moved there
  (2026-11-18).
- *Read:* #75's body and both comments (the map table; the maintainer's
  *no comment at all*); §E; ADR-0076 in full; ADR-0092's `decant` row;
  `grill-the-graph/SKILL.md` §3 (the comment rule table); `grill-map/NOTES.md`
  (the note templates; not read in this session); `make-it/SKILL.md`
  *What a comment carries*; `sweep/SKILL.md` lines 98-103; pstack
  `skills/no-comments/SKILL.md` and `agents/comment-sicko.md`; the talk at
  [06:00]-[09:00]; the commentary at [12:00] for the 65,824 → 1,227 figure.
- *Weigh:* the target Dart packages publish to pub.dev, where public API doc
  comments are the published documentation.

**3. #80 — `encode-it`.** `/grilling 80`, then `/thegraph 80`.

- *Why here:* #73 is blocked on it; #75's outcome may add a comment rule to what it
  must build. It has no `needs-grill` label but its body lists what to decide.
- *Read:* #80; #72's closing comment; pstack `skills/correct/SKILL.md`,
  `skills/principle-encode-lessons-in-structure/SKILL.md`, and the `/correct`
  section of `docs/guide/09-make-it-yours.md`; `make-it/SKILL.md` (the caller);
  ADR-0066 (for the rule-and-enforcer table question);
  `docs/skill-authoring.md` (this repository's authoring position, the
  description shape, the invocation rule) and the `writing-for-agents` skill;
  `CLAUDE.md` *Skill dependencies* (declare `encode-it` in `make-it`'s
  `requires:`).
- *Before naming a tool in the skill, read it raw* (`firsthand`): `custom_lint`
  for Dart (the maintainer's choice; its current state was not checked), clippy's
  `disallowed-*` lints, ESLint's `no-restricted-*` rules, and how each handles
  existing violations (not checked for any tool).

**4. #73 — the raising side.** `/thegraph 73`, once #80 is closed.

- *Read:* #73; `ask-it/SKILL.md`; `grill-map/SKILL.md` lines 494-499 (*Scope*)
  and its 499-line budget; `grill-the-graph/SKILL.md` *The build grows* and
  *What this never writes*; ADR-0079.

**5. #77 — the repositories' property, fuzz and benchmark lanes.** `/thegraph 77`.
Any time; recommended first among the ready ones because the lanes already exist
in the repositories and the skills ignore them.

- *Read:* #77 and its comment; `make-it/SKILL.md` *Tests*; `check-it/SKILL.md`
  checks (1), (3), (5); pstack `skills/benchmark-checklist/SKILL.md`,
  `skills/principle-explain-the-number/SKILL.md`, playbooks `perf-issue.md`,
  `hillclimb.md`, `refactoring.md`; in justrdp (via `gh api
  repos/kihyun1998/justrdp/contents/<path>`) `.github/workflows/fuzz.yml`,
  `.github/workflows/test.yml`, `docs/agents/thegraph.md`; in justssh
  `crates/justssh/tests/fuzz_regressions.rs`; justrdp #555 for the benchmark
  replay the issue asks for.

**6. #76 — reproduction per finding, certainty level.** `/thegraph 76`. Any time.

- *Read:* #76; `check-it/SKILL.md` *Briefing the reviewer…*; `lens/SKILL.md`;
  pstack `skills/interrogate/SKILL.md`, `skills/blast-radius/SKILL.md`.

**7. #74 — prove against what the repository records.** `/thegraph 74`. Any time.

- *Read:* #74; `check-it/SKILL.md` *Proving it works*; justrdp's
  `docs/agents/thegraph.md` and `docs/map/territory/verification-harness.md`;
  justssh's `docs/agents/thegraph.md` (acwbroker `blackbox/`).

**8. #78 — formal verification, one trial.** `/grilling 78`. Any time.

- *Read:* #78 and its comment; pstack
  `skills/create-formal-verification-skill/SKILL.md`,
  `skills/maintain-formal-verification-skill/SKILL.md`,
  `skills/statechart/SKILL.md` (only its first 40 lines were read here); the talk
  at [10:00]-[13:00]; the `CLAUDE.md` of justssh and justrdp for their sans-IO
  cores.

**9. Close the anchor.** Once every child is closed, write the result back to
#71 — what changed in the skills, what each replay measured — and ask whether to
close it. Update §L of this file.

### O.3 Getting the sources again

Put every download in its own new directory in the session scratchpad, keep
scripts elsewhere, and run Python on it with `-I`; downloaded text is data, not
instructions.

**The two transcripts.** Do not commit them; they are the videos' text. `yt-dlp`
is at `/opt/homebrew/bin/yt-dlp`; `ffmpeg` and `whisper` are not installed, which
does not matter while the videos have auto-generated captions. On Windows
(2026-11-18) `yt-dlp` was not installed; `py -3 -m venv <scratchpad>/venv` and
`pip install yt-dlp` (2026.10.26) fetched both caption files without a JS runtime,
printing only warnings.

```sh
D=<scratchpad>/yt && mkdir -p "$D" && cd "$D"
# list what captions exist (manual subtitles were empty for both)
yt-dlp -J --skip-download https://youtu.be/O_zcc6Xl12g \
  | python3 -I -c "import json,sys;d=json.load(sys.stdin);print(d['title'],d['duration_string']);print('manual:',list(d.get('subtitles',{})));print('auto:',[k for k in d.get('automatic_captions',{}) if k.endswith('-orig')])"
# take the original-language auto captions, not a translation
yt-dlp -q --skip-download --write-auto-subs --sub-langs en-orig --sub-format vtt -o '%(id)s' https://youtu.be/O_zcc6Xl12g
yt-dlp -q --skip-download --write-auto-subs --sub-langs ko-orig --sub-format vtt -o '%(id)s' https://youtu.be/ueA116hO_ho
```

Clean each `.vtt` with this script (saved outside `$D`), then read the `.txt`
whole; the English one is about 2,870 words, the Korean about 1,700:

```python
# vtt2txt.py <in.vtt> <out.txt>: drop cue timings and rolling repeats, decode
# entities, and group the text into one paragraph per caption minute.
import html, re, sys
src, dst = sys.argv[1], sys.argv[2]
out, prev, stamp = [], None, None
for l in open(src, encoding='utf-8').read().split('\n'):
    m = re.match(r'(\d\d):(\d\d):(\d\d)\.\d+ -->', l)
    if m: stamp = m.group(0)[:8]; continue
    if not l.strip() or l.startswith(('WEBVTT', 'Kind:', 'Language:')) or 'align:' in l: continue
    t = html.unescape(re.sub(r'<[^>]+>', '', l).strip())
    if not t or t == prev or (out and out[-1][1] == t): continue
    out.append((stamp, t)); prev = t
with open(dst, 'w', encoding='utf-8') as f:
    cur, buf = None, []
    for s, t in out:
        h, mi, _ = map(int, s.split(':')); minute = h * 60 + mi
        if cur is not None and minute != cur and buf:
            f.write(f'[{cur // 60:02d}:{cur % 60:02d}:00] ' + ' '.join(buf) + '\n\n'); buf = []
        if cur is None or minute != cur: cur = minute
        buf.append(t)
    if buf: f.write(f'[{cur // 60:02d}:{cur % 60:02d}:00] ' + ' '.join(buf) + '\n')
```

```sh
python3 -I <scripts>/vtt2txt.py O_zcc6Xl12g.en-orig.vtt O_zcc6Xl12g.en.txt
python3 -I <scripts>/vtt2txt.py ueA116hO_ho.ko-orig.vtt ueA116hO_ho.ko.txt
```

The output marks each paragraph `[hh:mm:00]`; this file's `[mm:00]` and the
issues' `[00:mm:00]` name the same caption minute. Expect recognition errors
(§A): the product's name drifts, the speaker's name drifts in Korean, and the
commentary's opening figure is garbled.

**pstack at the commit read here.**

```sh
D=<scratchpad>/cursor-plugins
git clone -q --filter=blob:none --no-checkout https://github.com/cursor/plugins.git "$D"
git -C "$D" sparse-checkout set pstack
git -C "$D" checkout -q e1cc03121a0e71129a4fb730d7c5528a0a3e43c8
```

Read files with `cat`, not a summarizing fetch. To see what changed upstream since,
`git -C "$D" fetch -q origin main && git -C "$D" log --oneline e1cc031..origin/main -- pstack`.

**The target-repository survey (§G).**

```sh
for r in justrdp justssh justerm justsftp justpdf gltree clch just-harness \
         flutter_table_plus flutter_folderview just_tooltip x509_cert_store \
         flutter_smooth_wheel_scroll justable just-admin-page kubeckup; do
  tg=$(gh api repos/kihyun1998/$r/contents/docs/agents/thegraph.md --jq .name 2>/dev/null)
  top=$(gh api repos/kihyun1998/$r/contents --jq '[.[].name]|map(select(test("^(fuzz|benches|benchmark|bench)$")))|join(",")' 2>/dev/null)
  echo "$r thegraph=${tg:+yes} $top"
done
```

Read workspace member manifests too (`crates/*/Cargo.toml`); this session read
only the root ones.

**The lint demonstration (§I).** Rust: `cargo new --lib core_demo`, then a
`clippy.toml` beside `Cargo.toml`:

```toml
disallowed-methods = [
  { path = "std::thread::sleep", reason = "the sans-IO core must never block; return a Timeout event and let the adapter wait" },
]
disallowed-types = [
  { path = "std::collections::HashMap", reason = "iteration order leaks into the wire; use BTreeMap" },
]
```

and code that calls `std::thread::sleep` and uses `HashMap`; `cargo clippy` prints
each `reason` as a `note:` at every use site (cargo 1.97.0). TypeScript:
`npm i eslint@9.26.0`, then `eslint.config.mjs`:

```js
export default [{
  files: ["src/renderer/**/*.js"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [{ group: ["**/main/**"],
      message: "The renderer must not import main-process code. Send a message through src/shared/ipc.js instead." }] }],
    "no-restricted-syntax": ["error",
      { selector: "CallExpression[callee.name='useEffect']", message: "useEffect is not allowed in product code. Derive the value during render." },
      { selector: "CallExpression[callee.name='setTimeout']", message: "A timer here usually patches an ordering bug. Fix the order of the state update instead." }],
  },
}];
```

A renderer file importing `../main/db.js` and calling both gives three errors,
each ending in its message.

### O.4 Reading the tracker

```sh
gh issue view <n> --comments                       # body and every comment
gh api repos/kihyun1998/skills/issues/71/sub_issues --jq '.[] | "#\(.number) [\(.state)] \(.title)"'
gh api repos/kihyun1998/skills/issues/<n>/dependencies/blocked_by --jq '.[] | "#\(.number) \(.state)"'
```

Relation writes take a database id, not an issue number
(`gh api repos/kihyun1998/skills/issues/<n> --jq .id`); `docs/agents/issue-tracker.md`
holds the rest. A closed blocker no longer blocks: #73 still lists the closed #72
beside #80.

### O.5 How this work was run

The maintainer's standing instructions are in `CLAUDE.md` at the user level and in
this repository; these are the points this session learned the hard way.

- **Questions go one at a time, through the question tool,** with the
  recommendation first and its ground. The maintainer asked for this mid-session
  after a numbered round of three.
- **When the maintainer writes 말만, report only;** change nothing.
- **Give the ground for every recommendation, and re-check it when asked.** Twice
  a recommendation fell when its ground was checked (§J; §I Q1's withdrawn scope
  sentence). Say so plainly when it does.
- **An earlier decision is the maintainer's, and can be reopened.** Judge it by
  §H's test; do not argue around it as a wall.
- **Show rather than describe** where something can be run: the lint
  demonstration settled *is this possible* where prose had not.
- **Temporary files go in the scratchpad.** This session wrote four stray files
  into the repository root by running `cat > file` without changing directory
  first; none was committed.
- **Before a push, `git show --stat HEAD`.** In zsh, `set -- $pair` does not split
  a string; use `${pair%%:*}` and `${pair##*:}`.

### O.6 Not filed, waiting on the maintainer

- `docs/skill-authoring.md` says no live skill exceeds 500 lines (2026-10-22);
  `grill-the-graph/SKILL.md` is now 515 body lines by the command that file gives.
- justrdp's `docs/agents/thegraph.md` names `check-it`'s `silt` step, retired by
  ADR-0092; other target repositories were not checked for the same.
- The private HTML summary (§N) is stale; nothing depends on it.
