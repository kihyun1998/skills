# check-it's subagents: what each does, and which model fits

Research for [#86](https://github.com/kihyun1998/skills/issues/86), gathered 2026-11-19 by two subagents and spot-checked by the conductor. It decides nothing.

Part A measures the three roles from this machine's transcripts. Part B reads the outside evidence per kind of work. Labels and sources are each part's own.

**Conductor's spot-check:** a `grep` over `~/.claude/projects/**/*.jsonl` finds 130 transcript files holding a fork's reply that its brief was empty ("브리프가 비어") and 5 holding `args: "see task message"`, which supports Part A's empty-brief finding; files are not runs, so the 25% and 30% rates are Part A's count, not reproduced. The probe file Part A names in `just_tooltip` is no longer on disk.

---

## Part A. The three roles, measured


Measured 2026-11-19 on this Windows machine, from `C:/Users/User/.claude/projects/**` (1,480 subagent transcripts, 1,477 `.meta.json`) and from the run sheets and reports in `C:/Users/User/AppData/Local/Temp/thegraph/`. Nothing was changed in any repository and nothing was posted. Scripts and raw extracts: `scan.mjs`, `scan2.mjs`, `scan3.mjs`, `after.mjs`, `scan.json`, `scan2.json`, `scan3.json` in this scratchpad folder.

This extends `docs/research/thegraph-herdr-models-context.md` §B/§C (2026-11-10). That note had one reviewer figure (55-63k tokens per run, ADR-0095:63, three runs) and no figure for `lens` (its gap G9). Neither note had anything on `comment-it`.

## Method

**How a role was identified** (from the first user message of each subagent transcript):

| Role | Identifying text | Units found |
|---|---|---|
| reviewer | a general-purpose agent whose prompt contains Review (4)'s "Does it hold up" and the harm question (check-it/SKILL.md, *Review (4)*) | 295 runs, 2026-11-02 to 2026-11-19 |
| lens, forked | prompt opens `Base directory for this skill: …\\lens` (the `context: fork` form) | 284 fork transcripts |
| lens, wrapper | general-purpose agent whose prompt tells it to load or follow the `lens` skill | 214 transcripts |
| comment-it, forked | prompt opens `Base directory for this skill: …\\comment-it` | 57 fork transcripts |
| comment-it, wrapper | general-purpose agent told to load or follow `comment-it` (2 that ran all of `check-it` excluded) | 48 |

Older review prompts without the harm question (62, e.g. the `code-review` skill's two axes) were left out.

**One run = one dispatch from the calling session.** A wrapper and the fork(s) it started (linked through `meta.parentAgentId`) count as one run, with their tokens and tool calls added together. That gives **288 lens runs** and **55 comment-it runs**.

**Token figures.** Assistant entries were de-duplicated by `message.id` (§C of the earlier note: streaming repeats ids). "Tokens in" = `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` summed over every request. It is the total input processed, mostly cache reads, and it is **not** the context size. "Peak context" = the largest single request's input. "Wall" = first to last timestamp in the transcripts. It includes idle time, so the maximums are sessions left open, not work.

## 1. The kind of work

| | Reviewer | lens | comment-it |
|---|---|---|---|
| What it is given | the whole diff (`git diff HEAD` + untracked), the issue, the repo's records (check-it/SKILL.md, *Briefing*) | subject, corpora (siblings, prior art), deliberate-divergence list (lens/SKILL.md, Workflow 1-2) | repo root and the same diff (comment-it/SKILL.md, *The scope*) |
| Reading breadth | the diff plus the files around it: median 4 distinct `Read` paths (p90 12), plus shell reads | the widest of the three: median 30 tool calls per fork, peak context median 108k (p90 210k, max 400k). 28 lens transcripts used WebFetch/WebSearch, 59 used curl/`gh api`/`git clone` to read prior art | narrow: median 6.5 tool calls per fork, peak context median 47k, start context 39k (mostly the skill and system prompt) |
| Judgement | grades each finding violation / judgement / already decided, across three questions | proves or refutes completeness. Grades CONFIRMED / UNADJUDICATED / INERT / DELIBERATE and gives a direction | sorts each comment against the repository's list. Checks an "outside cause" claim against live code |
| Runs things | yes, often. 191 of 295 transcripts ran a test, build or analyzer command. 23 wrote probe or mutation copies, all under the OS temp folder | yes. 120 of 341 lens transcripts ran tests, builds or analyzers. Probe tests and worktrees were common | rarely. 3 of 68 ran a build or test command. The rest was `rg`/`grep` and git |
| Output size (final report, chars) | median 4,329 (p90 7,161) | median 4,620 (p90 7,910) | median 1,841 (p90 3,992) |

Read-only discipline, measured. **Reviewer:** no Write/Edit outside the OS temp folder. Some reviewers ran `git checkout -- <file>` or `git stash list` in a repository (7 transcripts with checkout/stash/worktree commands). Whether any of those touched the live tree was not checked. **lens:** 5 transcripts wrote outside temp. Four wrote to `D:\\wt124l\\…`, `D:\\wt126l`, `D:\\wt128l` and `D:\\wt133l`, which are worktrees the lens created itself with `git worktree add`. One wrote `D:/github/just_tooltip/test/zz_lens_probe_test.dart` into the repository under review. **comment-it:** none. The 2 writes it made were replay fixtures under the temp folder.

## 2. Measured size per run

| | Reviewer (295) | lens (288 runs) | comment-it (55 runs) |
|---|---|---|---|
| Tokens in, median (p10-p90) | 724k (303k-2.14M) | 1.81M (732k-5.08M) | 315k (134k-623k) |
| Tokens out, median (p10-p90) | 14.1k (6.2k-29.6k) | 26.7k (11.3k-53.2k) | 5.4k (2.4k-13.7k) |
| Tool calls, median (p10-p90) | 29 (10-73) | 49 (17-108) | 13 (7-46) |
| Requests, median | 23 | 41 | 16 |
| Wall, median (p10-p90) | 4.1 min (1.7-9.0) | 7.7 min (3.1-13.4) | 1.5 min (0.7-3.5) |
| Peak context, median | 92k | 108k (fork alone) | 47k (fork alone) |
| Model (by `message.model`) | Opus 5.5 282, Fable 5.2 8, Sonnet 5.5 5 | Opus 5.5 273, Sonnet 5.5 9, Fable 5.2 6 | Opus 5.5 55 |
| Effort (entry `effort`) | medium 230, high 40, low 25 | medium 232, high 44, low 12 | medium 44, high 11 |
| Date range | 2026-11-02 to 11-19 | wrappers from 2026-10-19, forks from 11-02 | 2026-11-18 to 11-19 |

Most runs came from penterm (130 reviewer, 128 lens, 38 comment-it), then justrdp and acra_client.

No call passed a model: no `meta.model` was set by the caller. Every non-Opus run sits in a session whose own model was Fable or Sonnet, so each role inherited the session's model, as ADR-0091 and ADR-0095 decided.

The 724k figure is a different measure from ADR-0095's 55-63k. The units in ADR-0095:63 are not stated in what I read; peak context (92k) is the closer comparison.

### How lens and comment-it are actually started

The skill is written to be called through `Skill` and run as a fork. In practice the calling session usually starts a **general-purpose wrapper agent**, and that wrapper calls `Skill`:

| lens runs (288) | count |
|---|---|
| wrapper, then a working fork | 167 |
| fork started directly from the calling session | 36 |
| wrapper's fork got an empty brief, and the wrapper did the pass itself | 28 |
| wrapper did it without ever forking | 57 |

comment-it, 55 runs: 35 / 3 / 6 / 11 in the same order.

**Empty-brief forks are frequent:** 72 of 284 lens forks (25%) and 17 of 57 comment-it forks (30%) did nothing. Each returned a message saying its argument was missing, for example *"브리프가 비어 있어서 점검을 시작하지 않았습니다"*. The wrapper's own calls show the cause: `Skill {"skill":"lens"}` with no `args`, or `args: "see task message"` / `"see prompt"`. In those calls the brief sat in the wrapper's own prompt, and a fork never sees that prompt.

- 85 of the 89 failures were under a wrapper.
- 67 of the 89 fell on 2026-11-17 to 11-19.
- A wrapper adds its own cost on top of the fork: median 267k tokens in, 7.2k out and 11 tool calls (157 wrappers that had a working fork).

## 3. What they found, and how the calling session handled it

**Saved.** check-it says to save each report. A `.review.md`, `.lens.md` or `.comments.md` path appears in the calling session after the run in:

- 237 of 273 reviewer runs whose return point could be found
- 207 of 253 lens runs
- 40 of 44 comment-it runs

Runs whose return point could not be found: 22 reviewer, 35 lens, 11 comment-it. They were background notifications or nested runs. Several reports say the saved file holds only the launch receipt, with the findings summarised in the report, for example `penterm-…2761.report.md` and `acra_client-…743b.report.md`.

**Grades in the reports**, counted as words, so a mention in a legend also counts:

- lens: CONFIRMED appears in 243 of 341 reports. Totals: CONFIRMED 689, INERT 694, UNADJUDICATED 379, DELIBERATE 352.
- reviewer: violation 214, judgement 885, already decided 215, "not run" 66.
- comment-it: of 68 reports, 7 say clean or no findings in plain words. The rest list findings.

**Handling, from the 28 worker reports in `…/Temp/thegraph/*.report.md`** (2026-11-16 to 11-19). These record the calling session's verdict per finding.

Reviewer:
- Findings reproduced and fixed, test first: acra_client #740 (*"재현해 고친 것 2건: (H1) 4 MiB 메시지 하나로 런타임 스레드가 155초 묶임 … (S1) …"*) and penterm #2785 (*"reviewer's scenario, reproduced as chain test …"*).
- In penterm #2784, the reviewer and lens both corrected the working session, which had removed a branch as unreachable (*"Both fresh agents traced a reachable path"*).
- In penterm #2783 a reviewer finding was re-read at source: *"re-read at source: `@xterm/xterm` … `OptionsService.ts:52`"*.
- Most reports end with "no violation; judgements only" plus a "Harm: none".

lens:
- Findings fixed: acra #740 (3 fixed), #2787 (1 fixed, the assertion watched red), #2773.
- Findings carried as "not reproduced": #2772 (*"lens #7, PLAUSIBLE, not reproduced"*; PLAUSIBLE is not one of lens's four grades), #2784, #2785.
- One premise refuted by measurement: #2783-followups (*"the lens's premise did not hold; a different defect did"*, measured in headless Chromium).
- Skipped with a reason: #2776 (*"a one-key rename … nothing to enumerate"*).
- One lens reported on itself that it had not read the full prior art: acra #740 (*"MS-TSGU 본문과 형제 일부를 읽지 않았다"*).

comment-it:
- #2774: 4 findings, all fixed.
- #2784: 3 why-clauses, deleted.
- #2772: 1 finding, the fact moved to the territory note.
- #2783: 9 findings, 7 acted on and 2 kept as judgement (issue-number tags, which the repo rule neither lists nor forbids).
- Clean: #2787, #2761, #2797, acra #743c and #743d.
- Skipped: #2776, which changed no comment.

A count of how many findings were dropped against confirmed, over all runs, was **not determined**. The calling sessions record handling in free prose. Keyword counts over the text that follows each return (for example "재현", "기각", "drop") were tried and are too noisy to report.

## 4. Same role on two models

**No same-subject pair with both outcomes known was found.**

- **penterm #2792, session `43a0fc71…`:** lens ran on Opus 5.5 at 00:35Z and 00:51Z (87 and 149 tool calls) and then on Sonnet 5.5 at 01:13Z, with the same brief. The session's model changed in between. The first Sonnet fork got an empty brief. A second fork was still running at scan time, so its outcome is unknown.
- **acra_client #727 (Opus, 11-09) and wt-731 (Fable, 11-10):** the briefs name different diffs, so this is not a pair.
- **Aggregates by model:** these are different subjects, so they are sizes, not outcomes.

| Role | Model | Runs | Median tool calls | Median output |
|---|---|---|---|---|
| lens | Opus 5.5 | 249 | 50 | 27.6k |
| lens | Fable 5.2 | 5 | 45 | 45.3k |
| lens | Sonnet 5.5 | 6 | 13 | 8.7k |
| reviewer | Opus 5.5 | 282 | 30.5 | 14.0k |
| reviewer | Fable 5.2 | 8 | 18.5 | 21.2k |
| reviewer | Sonnet 5.5 | 5 | 9 | 6.6k |

Sonnet runs had the empty-brief failure in 5 of 8 lens forks; Opus in 65 of 269.

- **Already recorded elsewhere:** the earlier note's §E records that Sonnet 5.5 `thegraph-herdr` workers (#84, #77) skipped steps, and that #84 skipped `lens` until sent back. That concerns the worker, not the subagent's own judgement.

## Not determined

- Whether a non-Opus reviewer or lens finds what an Opus one finds on the same diff. No completed pair exists.
- Confirmed against dropped counts over all runs. Handling is prose; only the 28 thegraph reports were read for it.
- Whether the reviewers' `git checkout -- …` commands touched a live tree or a temp copy.
- Wall time as working time. It includes idle time, and the maxima (905 min lens, 890 min reviewer) are sessions left open.
- comment-it on any model but Opus 5.5. All 55 runs were Opus.
- Why calling sessions put lens and comment-it in a wrapper agent instead of calling `Skill` directly. It is visible in the transcripts but not explained there.


---

## Part B. Outside evidence per kind of work


Gathered 2026-11-19. Every page below was fetched raw with curl on 2026-11-19 (docs and claude.dev posts as `.md`; other pages as HTML with the tags stripped locally). No summarising fetch was used. Web search was used only to find URLs; nothing below rests on a search-result summary. The requests carried nothing about the user or the project.

Labels:
- **vendor-reported**: Anthropic measured or claimed it.
- **independent**: a third party measured it. Most of these third parties sell review tools of their own; where that matters, it says so.
- **anecdote**: a single customer quote or one run, with no method published.
- **inference**: my own reading of the evidence, not a source's claim.

## Sources read

| # | Source | URL | Published | Label |
|---|---|---|---|---|
| S1 | Choosing the right model | https://platform.claude.com/docs/en/about-claude/models/choosing-a-model.md | undated doc, read 2026-11-19 | vendor |
| S2 | Optimizing for cost and intelligence | https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence.md | undated doc; its refs are dated Oct-Nov 2026 | vendor-reported measurements |
| S3 | Effort | https://platform.claude.com/docs/en/build-with-claude/effort.md | undated doc | vendor |
| S4 | Model configuration (Claude Code) | https://code.claude.com/docs/en/model-config.md | undated doc | vendor |
| S5 | Subagents (Claude Code) | https://code.claude.com/docs/en/sub-agents.md | undated doc | vendor |
| S6 | How the Claude Code team does code review | https://claude.dev/blog/solving-code-review-at-anthropic.md | 2026-10-15 | vendor-reported |
| S7 | How the Claude Code team thinks about verification | https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification.md | 2026-11-16 | vendor-reported |
| S8 | Which Claude model should you build with? | https://claude.dev/blog/which-claude-model-should-you-build-with.md | 2026-11-09 | vendor |
| S9 | Using Claude Code: Spending your effort | https://claude.dev/blog/spending-your-effort.md | 2026-09-25 | vendor-reported |
| S10 | What a task costs on Opus 5.5 | https://claude.dev/blog/what-a-task-costs-on-opus-5-5.md | 2026-09-25 | vendor |
| S11 | Introducing Claude Opus 5.5 | https://www.anthropic.com/news/claude-opus-5-5 | 2026-09-22 | vendor-reported, plus customer anecdotes |
| S12 | Introducing Claude Sonnet 5.5 | https://www.anthropic.com/news/claude-sonnet-5-5 | 2026-09-28 | vendor-reported, plus anecdotes |
| S13 | Introducing Claude Haiku 5.5 | https://www.anthropic.com/news/claude-haiku-5-5 | 2026-10-07 | vendor-reported, plus anecdotes |
| S14 | Claude Fable 5.2 and Mythos 5.2 launch | https://www.anthropic.com/claude-fable-and-mythos-5-2 | 2026-11-09 | vendor-reported, plus anecdotes |
| S15 | Code Review docs (overview, setup, costs) | https://code.claude.com/docs/en/code-review.md, .../code-review-setup.md, .../code-review-costs.md | undated docs | vendor |
| S16 | /code-review (local) and ultrareview docs | https://code.claude.com/docs/en/code-review-local.md, https://code.claude.com/docs/en/ultrareview.md | undated docs | vendor |
| S17 | Code Review launch article | https://claude.com/resources/articles/code-review | 2026-03-09 (from page metadata) | vendor-reported |
| S18 | Claude Code best practices | https://code.claude.com/docs/en/best-practices.md | undated doc | vendor |
| S19 | Prompting Claude Sonnet 5.5 / Opus 5.5 / Haiku 5.5 | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5.md (and -opus-5-5, -haiku-5-5) | undated docs | vendor |
| S20 | Choosing a model and effort level in Claude Code (claude.com blog) | https://claude.com/blog/claude-model-and-effort-level-in-claude-code | 2026-07-07 (metadata) | vendor |
| I1 | CodeRabbit: Claude Opus 5.5 for code review | https://www.coderabbit.ai/blog/opus-5-5-model-review | 2026-09-22 | independent (review-tool vendor; quoted in S12) |
| I2 | CodeRabbit: Claude Sonnet 5.5 for code review | https://www.coderabbit.ai/blog/sonnet-5-5-model-review | 2026-09-28 | independent (same) |
| I3 | Artificial Analysis: Announcing FrontierCode | https://artificialanalysis.ai/articles/frontiercode | 2026-10-12 | independent |
| I4 | Kodus: What's the best LLM for code review? (2026 benchmark) | https://kodus.io/en/best-llms-for-code-review/ | 2026-11-11 (data 2026-11-10) | independent (review-tool vendor) |
| I5 | Fireworks Specialized Intelligence Index: Qodo AI Code Review Benchmark board | https://fireworks.ai/specialized-intelligence-index/benchmarks/code-review/qodo-code-review-benchmark | board "last updated Oct 28, 2026" | independent (benchmark by Qodo, a review-tool vendor; board run by Fireworks) |
| I6 | Qodo: Qodo outperforms Claude in code review benchmark | https://www.qodo.ai/blog/qodo-outperforms-claude-in-code-review-benchmark/ | 2026-03-12 | independent but a competitor's marketing |
| I7 | Greptile: ranks #1 on Martian's Code Review Bench | https://www.greptile.com/content-library/greptile-martian-code-review-benchmark | 2026-07-30 | second-hand report of an independent bench, by a ranked vendor |

## What the sources recommend in general

- **Start on Opus 5.5 at medium; use effort before changing model.** "Most workloads start with Claude Opus 5.5" (S1). "Before you move models, try adjusting your effort level … Past `high`, one more effort level can cost as much as a bigger model … If you're past `high`, test the next model up at a lower effort instead" (S8, 2026-11-09). Vendor.
- **The order to escalate in:** "1. Check that the model can verify its own work … 2. Raise effort one level. 3. Move to the next model up, starting at a lower effort" (S8). S10 says the same: "before you raise effort, check whether the model has a way to check its work." Vendor.
- **What effort buys:** effort "governs how much thinking, tool calling, and self-verification the model does" (S2). "Higher effort is best for tasks with lots of hidden edge cases … Extra effort gave better results in domains where verification and edgecase testing was more useful like hardware, code review, and security" (S9, 2026-09-25). Effort "does not fix when the model has the wrong approach"; for that you need a bigger model (S9, S8). Vendor.
- **Small models:** Haiku 5.5 is for "classification, routing, tagging, and high volume extraction". For subagents that search, read logs or summarise, use Haiku or Sonnet, because "Wrong answers are cheap to spot, and the main model has the judgment calls anyway." "Keep small models on work where a mistake is cheap to spot … Keep code edits and judgment calls on the main model" (S8). S2: "High-volume work with outputs you can check: try Claude Haiku 5.5 first." Vendor.
- **Repeated review tasks:** S8's task table, row "Agent tasks you run repeatedly such as investigation, review, or drafting", says start on **Sonnet 5.5 at `medium`** because "Well-defined, repeated tasks rarely need a bigger model." Vendor. This is the only row in any Anthropic source that names "review" with a model.
- **Re-run failures:** "If you can check outcomes automatically, run everything at a low level and re-run only the failures at a high one" (S8, S2). This requires a failure signal; "a checker that passes bad work lets those failures through" (S2). Vendor.

## (a) Code review of a diff: repo rules, issue fit, security, each finding reproduced

### What the sources recommend
- **Anthropic's own pipeline (S6, 2026-10-15)** reads the diff "against the whole repo and the PR's stated intent". Several agents look for bugs in parallel, a separate group votes on each finding, and findings that are only style get dropped. A separate security review can block the merge. `REVIEW.md` asks for "a file and line as evidence instead of a guess from a name". Depth is matched to risk: "a quick pass on routine changes, a deep one where a missed bug is expensive". **S6 names no model.** S15: "Code Review chooses the Claude models that reviews run on, and its admin settings don't offer a model choice." The model behind Anthropic's own reviewer is **not disclosed**. Vendor.
- **The `/code-review` effort dial (S16):** "At `low`, the review reports the findings it's most confident in, so you see fewer false positives. From `medium` through `max`, the review broadens coverage." Vendor.
- **Effort for verification-heavy work (S9):** "**High**: for work where verification is important or there are edge cases, e.g. fixing a bug in a brownfield codebase. **Max**: … finding security vulnerabilities in critical software." The author's own loop is "Implement it on low effort … Verify and test on high effort." Vendor; one engineer's rule of thumb.
- **Reproduction as part of the finding:** the Terminal-Bench traces in S9 describe what effort changes. On `mvcc-lsm-compaction`, "At low … Claude would edit the code before building it or running the reproducer"; "At xhigh … Claude reproduced the crash first … and checked that its tests failed on half-finished fixes" (0/5 at low to 4/5 at xhigh, Opus 5.5). S19 (Sonnet 5.5): "At `low`, it keeps its thinking short and can skip verifying a change." Vendor-reported.
- **Security exposure:** on Opus 5.5 and Sonnet 5.5, "Finding vulnerabilities in source code is allowed. High-risk dual-use cybersecurity activities are not" (S19, S11). **Fable 5.2's classifiers "block high-risk cyber activities", and blocked queries are answered by Opus 4.8** (S14). S8 says the same: flagged cybersecurity requests fall back to Opus 4.8. Mythos 5.2 is the security model, but only through the Cyber Verification Program, and "On our own evaluations, vulnerability identification is roughly on par with Opus 5.5" (S14, footnote 2). Vendor. **Inference:** for the security part of a diff review, Fable 5.2 risks a silent fallback to an older model, and Opus 5.5 is the strongest generally available choice that the classifiers leave alone.

### What was measured
| Measurement | Numbers | Source, label |
|---|---|---|
| CodeRabbit "Signal": 13 hard known-bug PRs, actionable catches / precision | Opus 5.5 Max 10/13 (76.9%) / 52.0%; Opus 5.5 Standard 8/13 / 66.7%; Sonnet 5.5 (thinking on) 6/13 / 41.2%; Sonnet 5 4/13 / 40.0%; production mix 5/13 / 29.4% | I1, I2: independent, n=13 (the authors say so) |
| CodeRabbit "OSS August": 80 bug patterns | Opus 5.5 Standard 51/80 (63.8%) / 38.6% precision / 127 comments; Opus 5.5 Max 50/80 / 35.7% / 140; production mix 49/80 / 39.3% / 116 | I1: independent |
| Effort in review | "Turning up effort did not consistently produce a better review." Standard beat Max on the broad set; Max won only on the 13 hard cases, and including out-of-diff comments both reached 10/13 | I1: independent |
| Cost per review | Sonnet 5.5 model calls $0.47 (Signal) / $0.46 (OSS) per review vs Sonnet 5 $1.16; review time 5:27 vs 9:55. Opus 5.5 used +49% to +60% tokens vs CodeRabbit's production mix (dollars not given) | I2, I1: independent |
| Qodo benchmark (planted functional bugs and best-practice violations in real PRs), F1 / $ per task | Opus 5.5 high 56.8% / $1.00; Opus 5.5 medium 56.3% / $0.64; Opus 5.5 xhigh 54.0% / $1.46; Sonnet 5.5 xhigh 54.0% / $0.72; Fable 5.1 high 53.5% / $2.31; Sonnet 5.5 high 51.7% / $0.31; Opus 5.5 low 45.1% / $0.25; Sonnet 5.5 medium 42.6% / $0.14; Sonnet 5.5 low 38.2% / $0.12; Haiku 4.5 medium 30.6%. **No Haiku 5.5 or Fable 5.2 rows.** | I5: independent board of a vendor's benchmark. Confidence intervals not captured (they render as tooltips) |
| Kodus: 30 merged PRs, 121 confirmed bugs, single generalist agent | Opus 5.5 recall 42.2% / precision 52.6% / $0.715 per PR; Sonnet 5.5 37.2% / 57.0% / $0.542. Resampling moves recall by about ±20 points (95% bootstrap), so second-to-fifth place is not settled | I4: independent (vendor), one run per model |
| Kodus "heavy" mode (9 specialist agents + generalist) | On average +9.9 recall points, 2.5x cost, -7 precision points. Opus 5.5: recall 49.6%, $3.10 per PR | I4 |
| Anthropic Code Review service | Substantive comments on internal PRs went from 16% to 54%. PRs over 1,000 lines: 84% get findings, averaging 7.5 issues; under 50 lines: 31%, averaging 0.5. "Less than 1% of findings are marked incorrect." Average review about 20 minutes, **$15-25 per review** | S17 (2026-03-09): vendor-reported |
| Ultrareview | "typically $5 to $25 in usage credits depending on the size of the change" | S16: vendor |
| Anthropic convergence data | PRs passing after one review round went from 65% to 78%; PRs needing 5 or more rounds from 8.9% to 1.5%; after round caps and diff-only re-review | S6: vendor-reported |
| Customer anecdote | "Even at its lowest effort setting, Claude Opus 5.5 caught 72% of known bugs in our code reviews to Opus 5's 56% at high effort" (Deloitte CIO) | S11: anecdote, no method |
| Sonnet 5.5 at max effort | Scored lower on FrontierCode at Max than at Xhigh: "Sonnet 5.5 more often ran Claude Code's code-review skill, which splits the review across many subagents … led to a timeout or to extra edits beyond the task's scope" | S12, footnote 2: vendor-reported |

### Strength of evidence
- **Moderate** that Opus 5.5 beats Sonnet 5.5 on hard review cases. Two independent sets point that way (I1/I2: 8-10 vs 6 of 13; I5: 56.8 vs 54.0 at each model's best). Kodus (I4) has the gap inside its noise.
- **Moderate** that `high` is the top useful effort for review, and that `xhigh`/`max` do not reliably help. I5 has Opus high > xhigh; I1 has Standard ≥ Max on the broad set; S12 has Sonnet getting worse at max.
- **Moderate to strong** that `low` effort costs real recall in review. I5: Opus 5.5 low 45.1 vs medium 56.3; Sonnet 5.5 low 38.2 vs high 51.7. The Deloitte anecdote (S11) goes the other way.
- **Weak, vendor-only** on whether effort makes the model produce a reproduction with each finding. S9 has traces of single runs. No independent benchmark scores "finding carries a reproduction". **Not confirmed.**
- No independent review benchmark has Fable 5.2 or Haiku 5.5. **Not confirmed.**

## (b) Adversarial completeness read: whole corpora end to end, graded findings

### What the sources recommend
- **Work bigger than one context window:** "split it into parts, one session or one subagent per part" (S2). An orchestrator pays off for "Work larger than one context window" and for "routine work with a long cost tail". For "one dependent chain, or [work that] fits in a single context", a single model at lower effort did better (S2). Vendor.
- **Hardest technical work:** "Major refactors and migrations, architecture planning, and leading many subagents" and "Deep research" start on Fable 5.2, `medium` then `high` (S8). Move to Fable "when Opus 5.5 at `high` still falls short, or for long unattended runs" (S8). S4: Fable models "investigate before acting, and verify their work more often … Hand it ambiguous problems." Vendor.
- **Opposite pull:** S8's row "Agent tasks you run repeatedly such as investigation, review, or drafting" points to Sonnet 5.5 at medium. **Inference:** that row describes routine repeated work, not a one-off adversarial sweep. The defect-search numbers below fit the Fable/Opus rows better.

### What was measured
**Anthropic's internal defect-search benchmark** (S2, reference 8): about 22M tokens from 14 public Python packages, in 201 parts, with 130 planted defects, graded deterministically, 10 runs per configuration, run 2026-10-27 to 2026-11-04. Vendor-reported. Of everything found, this is the closest published analogue to (b).

| Configuration | Mean F1 (range) | Cost per run |
|---|---|---|
| Fable 5.2 alone, high | 0.909 (0.896-0.925) | $563 |
| Fable 5.2 alone, medium | 0.877 | $378 |
| Fable 5.2 alone, low | 0.866 | $357 |
| Opus 5.5 alone, high | 0.850 (0.829-0.876) | $236 |
| Fable 5.1 alone, high | 0.847 | $716 |
| Opus 5.5 + Sonnet 5.5 subagents | 0.831 | $139 |
| Opus 5.5 alone, medium | 0.827 (0.797-0.850) | $200 |
| Sonnet 5.5 alone (high) | 0.760 (0.669-0.788) | $103 |
| Opus 5.5 + Haiku 5.5 subagents | 0.677 | $47 |
| Haiku 5.5 alone (medium) | 0.577 | $25 |
| **Opus 5.5 alone, low** | **0.489** (0.437-0.551) | $38 |

- From S2's text: Opus 5.5 "scored 34 points lower at `low` than at `medium`, for about a fifth of the cost". Fable 5.2 lost only 4.3 points from high to low, for 37% less. Fable 5.2 alone at high beat Opus 5.5 alone at high by 5.9 points (95% CI 4.7-7.1), for 2.4x the cost.
- Opus + Sonnet subagents matched Opus alone at medium, within noise, for 31% less.
- Haiku subagents lost about 15 F1 points.
- Anecdote (S14): "I had Claude Fable 5.2 run a 10–12 hour security audit. It sent out about 170 reviewer agents … At High effort, I'd use this over what I run today for long unattended audits."
- FrontierCode (I3, S14) measures whether code a model *writes* would be merged, not review, so it is only indirect evidence here. AA: Opus 5.5 (max with fallback) 52% score / 58% pass rate at $10.15 per task; Sonnet 5.5 (max) $8.26 per task (I3, 2026-10-12, independent). S14: FrontierCode 2.0, Fable 5.2 49.1% (xhigh) vs Opus 5.5 45.5% (vendor).

### Strength of evidence
- **Moderate.** It is one vendor benchmark, but with 10 runs, ranges and CIs, and deterministic grading. It measures planted-defect recall/precision over a large corpus. It does not measure "contradiction with named reference projects" or the quality of grading. No independent benchmark of whole-corpus completeness reading was found. **Not confirmed independently.**
- **Strong within that benchmark:** Opus 5.5 at `low` collapses on search-for-what-is-missing work (0.489 vs 0.827), and Haiku is weak there (0.577).

## (c) Rule-list classification with proof by tracing code

### What the sources recommend
- **Classification is Haiku 5.5 work in Anthropic's guidance**, with outputs you can check (S1, S2, S8). Haiku's default effort is medium: "Start with `medium` for most work … Use `low` … for simple, high-volume requests" (S3). For classification output, S19 (best practices) recommends "tools with an enum field" / structured outputs. Vendor.
- **But tracing is a judgement call:** "Keep code edits and judgment calls on the main model. When a small model misreads a search result, the main model opens the wrong file and spends tokens on it" (S8). S20: "Pick a larger model when the problem is genuinely hard … where the smaller model is confidently wrong no matter how much context you give it." Vendor.
- **Inference:** (c) has two parts. Sorting a comment into an allow-list category is checkable classification. A claim that an outside dependency forces the behaviour has to be proven by tracing code, which is the cross-file reading the sources keep on the main model. That points to Haiku or Sonnet for the sort, and Sonnet or Opus for the trace, with failures escalated (S2's re-run pattern). No source tests this exact split.

### What was measured
| Measurement | Numbers | Source, label |
|---|---|---|
| Haiku 5.5 as a judge matching review comments to an answer key | agreed with Opus 5.5 on 249 of 252 comments | I4: independent, small n, a classification-like task |
| GPQA Diamond | Haiku 5.5 85% vs 91% for Opus 5.5 and Sonnet 5.5, at about 1/20 of Opus's cost per correct answer | S2: vendor |
| Managed Agents task set | Haiku 5.5 93% of attempts passed at about $0.011 per pass (single run) | S2: vendor |
| FrontierCode 1.1 | Haiku 5.5 46.4%; Sonnet 5.5 52.1% (xhigh); Opus 5.5 54.4% | S13, S12: vendor |
| Haiku 5.5 on defect search (judging code) | 0.577 F1 vs Sonnet 0.760, Opus medium 0.827 | S2: vendor |
| Haiku subagents on coding | "an alternative to lowering effort, not better": -32% cost, about -4 pass-rate points (95% CI 1.3-7.1) | S2: vendor |

### Strength of evidence
- **Weak for (c) as specified.** There is evidence that Haiku 5.5 classifies well (I4's 249/252; S2's checkable-output tasks). There is none, from anyone, on "classify against an allow-list and prove a dependency claim by tracing code". Haiku's defect-search score (0.577) suggests it misses things when it has to read code to find them (inference). Haiku 5.5 is on no independent review benchmark. **Not confirmed.**

## Cross-cutting questions

### A different model for review than for writing
- **Anthropic recommends a different context, not a different model.** `/code-review` "reviews the diff in a fresh subagent that never saw your conversation. It isn't swayed by the reasoning that produced the code"; "A second session is also the easiest independent reviewer you can get" (S18). S7 (2026-11-16): "We don't try to improve reviews by stacking on more reviewers. Adding a second, more expensive, reviewer on top of the primary one is often a worse approach than tuning the primary." Vendor.
- **Independent hints that models differ in what they miss:** Opus 5.5 Standard caught 11 bugs the production mix missed and missed 9 it caught. "The differing catches make it worth testing a second reviewer alongside the first, although these runs do not establish the quality, cost, or comment volume of running both together" (I1). Sonnet 5.5 and Sonnet 5 disagreed on 6 of 13 cases (I2). Independent, small n.
- Qodo argues that "true multi-agent orchestration requires model diversity" (I6): a competitor's claim with no ablation shown.
- Kodus: more agents on the same diff (heavy mode) give +9.9 recall for 2.5x cost and -7 precision (I4).
- **No source measures "writer model X, reviewer model Y" against "same model, fresh context".** **Not confirmed.**

### Effort for verification
- Vendor: implement low, verify high (S9). Verification is the first lever, before effort or model (S8, S10). Low-then-high re-runs cost about 40% less at the same pass rate when outcomes are checkable (S2: $0.17 vs $0.29 per task, SWE-bench Pro subset, Opus 5.5).
- Independent: in review, low hurts (I5), high is the peak, and xhigh/max add noise or cost (I1, I5). S19: Sonnet 5.5 at xhigh/max "can start its own rounds of review", and a prompt that stops this "cut session cost by about a third, with no change in quality" (vendor).

### Small models for classification-like checks
- Recommended by the vendor for checkable, high-volume work (S1, S2, S8). Independent support is one judge-agreement figure (I4, 249/252). Against: Haiku on code-reading search tasks (S2, ref 8) and Haiku subagents on coding (S2, ref 29).

### Cost per review
| Setup | Cost | Source |
|---|---|---|
| Anthropic Code Review (managed, multi-agent) | average $15-25 per review | S17 (vendor), repeated by I6 |
| Ultrareview | $5-25 per review after free runs | S16 (vendor) |
| Sonnet 5.5 in CodeRabbit's pipeline (Claude calls only) | $0.46-0.47 per review | I2 |
| Qodo benchmark, per task | Opus 5.5 high $1.00, medium $0.64; Sonnet 5.5 high $0.31, xhigh $0.72; Fable 5.1 high $2.31 | I5 |
| Kodus, per PR | Opus 5.5 $0.715 (heavy $3.10); Sonnet 5.5 $0.542 | I4 |
| List prices per MTok in/out | Haiku 5.5 $0.10/$0.50 (≤100K prompt); Sonnet 5.5 $2/$10; Opus 5.5 $4/$20; Fable 5.2 $8/$40 | S8 |

## Could not confirm
- Which model Anthropic's Code Review or ultrareview runs on (S15 says only that the service chooses).
- Martian Code Review Bench primary data: only read through Greptile's report (I7). The primary leaderboard was not fetched.
- The live Artificial Analysis FrontierCode leaderboard (rendered in JavaScript; only the launch article was read). Third-party mirrors found in search disagree with each other and were not used.
- Confidence intervals on the Fireworks/Qodo board rows (I5).
- Any independent review-benchmark row for Haiku 5.5, Fable 5.2 or Mythos 5.2.
- Any measurement of findings with attached reproductions, of corpus-completeness reading against named reference projects, or of allow-list classification with traced proof.
- "Introducing Claude Opus 5.5 … 40% on typical workloads" (cited in S2) was not checked beyond S2's quote.

