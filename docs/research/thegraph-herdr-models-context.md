# Model seats for `thegraph-herdr`: the context

The facts a later phase needs to decide which of Claude Fable 5.2, Opus 5.5,
Sonnet 5.5 and Haiku 5.5 takes which seat in `thegraph-herdr`, and how the decision
about models should be made. This file recommends no combination.

**Where this file lives.** The repository has no convention for research notes
kept before a decision: `docs/adr/` holds decisions, `docs/environment/` holds
global setup, and `docs/agents/` holds tracker and domain rules. This path was
named by the brief as the fallback.

**Date of every local check:** 2026-11-10, on Windows, with Claude Code 2.1.322,
`hc` 0.1.19, and this repository at `d7e16af`.

**Labels used on every claim.**

| Label | Meaning |
|---|---|
| **measured here** | read from a file in this repository or run on this machine, with the command or `file:line` given |
| **maintainer's call** | a choice recorded as the maintainer's, with where it is recorded |
| **vendor-reported** | stated by Anthropic or by another vendor about its own product, documents included. Not checked here unless the row says so |
| **inferred** | my reasoning from the cited facts. Nobody measured it |

Bundled guidance is cited by file name from
`claude-api/shared/` in the Claude Code 2.1.321 bundled skills. Web pages were
fetched raw with `curl` on 2026-11-10 unless a row says otherwise.

## A. What this repository already recorded about models

### A.1 Decisions and maintainer statements

| # | Claim | Sample | Whose call | Label | Source |
|---|---|---|---|---|---|
| 1 | The eval suite uses Opus for the agent and for the judge. The maintainer corrected a recommendation of Sonnet for the judge: *"조사는 낮은모델 판단은 opus가 하는게 맞는거아냐"* (a cheaper model may search, not judge) | none; a judgement | maintainer, 2026-10-27 | maintainer's call | ADR-0087:25-28 |
| 2 | Models pinned by full ID in each case, because an alias would make a rollout read as a regression | none | not stated as the maintainer's; it is a row of the record's design table | measured here | ADR-0087:59 |
| 3 | `lens` runs on the session's model, inherited | none | maintainer, 2026-10-27 | maintainer's call | ADR-0091:15-23 |
| 4 | The reviewer runs on the session's model. *"Felix Rieseberg's attackers one tier down is not measured here"* | none | maintainer, 2026-10-28 | maintainer's call | ADR-0095:25-26; #49 "Decided" |
| 5 | Model tier per forked step was listed as an open question and closed only by point 3, without a measurement | none | maintainer narrowed the scope | maintainer's call | #39 "Open questions", comment 2026-10-27 |
| 6 | Asking the maintainer which model should judge was counted as **offloading** (a technical question put to the person) | one run | classified in the issue; the maintainer is to confirm such classifications | maintainer's call on the counting procedure | #41 "Baseline"; #43 |
| 7 | A stop count was rejected as the measure of a cluster run, in favour of offloading, overreach and outcome | none | maintainer | maintainer's call | ADR-0088:99-105 |
| 8 | `thegraph-herdr`: separate skill, one worker per issue | one test worker | maintainer; sequence and direct step calls are derived | maintainer's call | ADR-0098:13-35 |
| 9 | **No record assigns a model to `read-it`, `make-it`, `check-it`, `ask-it`, routing, or the conductor**, and no record defines a step that judges difficulty | n/a | n/a | measured here | `Grep` for Fable, Opus, Sonnet, Haiku, `model:`, `--model`, `tier` across the repository, `retired/` included; the only live `model:` keys are the eval cases |
| 10 | Habit stated in `thegraph`: size the thinking to the task, and it never replaces a gate or a mutation that reddens. This is about reasoning depth and names no model | n/a | part of the method | measured here | `thegraph/SKILL.md:267-270` |

### A.2 Measurements that bear on a model choice

| # | What was measured | Sample and limits | Label | Source |
|---|---|---|---|---|
| 1 | `read-it` reading step, Opus 5.5 as agent and judge, with and without the skill: x509-43 1.00 vs 0.67, folderview-109 1.00 vs 0.33, admin-44, x509-34, admin-17 all 1.00 vs 1.00. $10.21 for the suite | 5 cases × 3 runs × 2 arms. **One model only.** Sandboxed: no `git`, no `gh`, no home directory | measured here (by an earlier session; the record was read, not re-run) | ADR-0087:64-87; #36 comment 2026-10-27 |
| 2 | Same suite re-run: with-arm 14/18 before and 13/18 after a text change; the no-plugin arm moved 0/3 to 2/3 on one case between runs. Called within noise. Cost $33.62 | 6 cases × 3 runs. Shows run-to-run variance the size of the effect one would test | measured here (earlier session) | #44 comment 2026-10-27 08:09 |
| 3 | About 90 past `/thegraph` runs: every wrong premise found had been raised by `read-it` at the confirm stop. Second pass over 95 runs for misses: one found, harmless | transcripts on the Mac; all under Opus by implication, the model is not stated | measured here (earlier session) | ADR-0087:46-50; #40 closing comment |
| 4 | Haiku against Sonnet on `thegraph`, one query, skill invoked properly: Sonnet read `nodes.md` and exited correctly; Haiku never opened it and reached the right diff by an inapplicable rule | n=1 per cell, 2026-09. **Haiku here predates Haiku 5.5** (launched 2026-10-07), so it was an older Haiku | measured here (earlier session) | ADR-0057:91-100, 146-162; private issue `kihyun-skills#44` (Finding 2) |
| 5 | Same issue, pass 1 and 2: Haiku "fails the skill arm wherever the skill's answer is counter-intuitive" (a 21-node graph where a refusal was required; closed a case that required one pending slot). Sonnet passed every `grill-the-graph` criterion | 34 cells, n=1 per cell, on a skill since rewritten | measured here (earlier session) | `kihyun-skills#44` comments, findings 2, 3, 5 |
| 6 | Token cost of the skill on the exit path: +47% on Haiku, +124% on Sonnet against baseline, 71-125k tokens per skill run | n=1 per cell; old `thegraph` | measured here (earlier session) | `kihyun-skills#44`, cost table |
| 7 | Fresh-agent `lens` found 3, 5, 5 and 2 defects on four changes, each re-checked at source | 4 runs, Opus by inheritance, no comparison across models | measured here (earlier session) | ADR-0091:27-30; #39 |
| 8 | Of 26 code `check-it` runs: subagent reviews found a defect the writer missed in 9 of 10; inline reviews recorded none in 6. One reader for both axes did as well as one per axis | 32 runs, 2026-09-28 to 10-28. Compares **separate reader vs same session**, not models | measured here (earlier session) | ADR-0095:33-48; #49 |
| 9 | Reviewer brief replayed on three past changes: 55-63k tokens each, under two minutes, no finding wrong on the facts | 3 changes; shows that it finds things, not how often | measured here (earlier session) | ADR-0095:52-66 |
| 10 | Selection bias noted: 5 of 5 `lens` loads found something, but `lens` was likely loaded on harder runs | stated in the record | measured here (earlier session) | ADR-0091:31-34; #44 caveat |
| 11 | One test worker through `hc` on a throwaway repo: question tool reported as `blocked`, `hc send` reached the conductor, the folder trust prompt was not reported as blocked. **No real issue has been run through a worker** | n=1, Claude Code 2.1.321, auto mode | measured here (earlier session) | ADR-0098:39-56 |

### A.3 Records that are stale against today

| Record | What it says | Why it is stale | Label |
|---|---|---|---|
| ADR-0074:39-41; ADR-0057:147; `docs/skill-authoring.md:155` | "A subagent cannot reach Opus" | Three failed attempts, all on an Opus 5 `reasoning_extraction` safeguard error (`kihyun-skills#44` Finding 3). On this machine 29,535 subagent transcript entries are `claude-opus-5-5` (section C). The statement no longer holds as written | measured here |
| ADR-0057, `kihyun-skills#44` | Haiku's failures | Older Haiku and a `thegraph` that has since been rewritten (ADR-0071). Haiku 5.5 went from 62% to 93% on one Anthropic task set against Haiku 4.5, one run per model | vendor-reported (cost page, "Upgrade the model") plus inferred |
| ADR-0091, ADR-0095 | "the session's model" | Decided on 2026-10-27/28, before Fable 5.2 existed (launched 2026-11-09, release notes). "The session's model" now means whatever each session was started on, and this machine's saved default is `fable` (section B.3) | measured here |
| ADR-0087 | Suite runs "only on this Mac", Claude Code 2.1.311 | This machine is Windows, the fixtures clone from `/Volumes/T7/...` (`read-it/evals/cases/x509-43-premise-wrong/fixture.sh:5`). The suite has grown to 7 cases (`ls read-it/evals/cases`) | measured here |
| ADR-0098 | Claude Code 2.1.321 | One patch behind 2.1.322. Fable 5.2 requires 2.1.321 or later, so the record is current on this point | measured here; vendor-reported for the requirement |
| #36, #39, #49 | "*one tier down*" | The interview's wording is less general than the shorthand (section D.3) | measured here |

## B. How each seat uses a model

### B.1 The seats

Per-step sizes come from 132 past `/thegraph` runs on this machine that contain all
four steps, single-session and almost all on Opus 5.5, split at each step's `Skill`
call (section C has the method). **They describe a long single session, not a
worker that starts empty.** Column headings: median requests, output tokens,
`Read`/`Grep`/`Glob`/`Bash` calls, and context at the step's first request.

| Seat | Kind of work | Size (median) | Forked? | Model today | What catches a mistake | Label |
|---|---|---|---|---|---|---|
| **`read-it`** (conductor) | Reads issue, cluster, map, sources, hidden state; writes two statements | 9 req, 7.3k out, 8 reads, context 127k. p90 reads 19 | inline | the conductor's session model; nothing pins it | Only the person at the confirm stop. The skill says so: "the only one whose mistakes nothing downstream catches", a wrong reading "passes everything" (`read-it/SKILL.md:9-12`) | measured here |
| **Confirm stop** | Puts the two statements to the person; one stop for a whole cluster | part of the above | inline | same | The person, by reading. A go-ahead is not recorded as a decision (`read-it/SKILL.md:152-154`). The stop shows ① and ②; the route is not listed as one of the things shown (`read-it/SKILL.md:130-136`, `thegraph/SKILL.md:151-153`) | measured here |
| **Routing** | Four labels chosen from the restatement, "never from the title or your impression of the change's size" | part of `read-it` | inline | same | A mis-route is "invisible until the enumeration arrives too late" for open decisions (`read-it/SKILL.md:169-175`). Prose vs code changes which of `check-it`'s checks run (`check-it/SKILL.md:59-62`) | measured here |
| **Judging difficulty** | **No step does this today.** Route labels name the kind of change, not its difficulty | n/a | n/a | n/a | n/a | measured here |
| **`make-it`** (worker) | Writes the change, test-first; mutates tests; carries what it notices | 26 req, 27k out, 21 reads (p90 64), 11 edits | inline in the worker | the worker's session model | `check-it`'s gates, the fresh-agent review, the tests it had to watch fail, then the person at the signals | measured here |
| **`check-it`** (worker) | Runs the project's checks, proves against something real, attributes failures, runs cost check, decides what goes back | 17 req, 14k out, 16 reads (p90 41) | inline; two forks below | the worker's session model | The person on anything returned; `ask-it`. Its own verdict on a finding has a second check: the session must re-open each citation (`check-it/SKILL.md:180-181`) | measured here |
| **Reviewer** (`check-it` 4 and 6) | One fresh agent: holds up, does what was asked, harm. Reads the diff, the issue, the repo's records. Read-only by instruction | 55-63k tokens per run (ADR-0095:63, three runs) | new general-purpose agent, prompt written by the worker (`check-it/SKILL.md:174-178`) | inherits, unless the worker's Agent call passes `model`; no text asks it to | The worker re-opens every `violation` it will act on; then the person | measured here |
| **`lens`** (`check-it` 7, open decisions) | One adversarial reader over all corpora, end to end; graded findings | no token figure on record | `context: fork`, `background: false`, no `model` key (`lens/SKILL.md:4-5`) | inherits | The caller re-opens every `CONFIRMED` citation (`lens/SKILL.md:17-18`). *"Two readers on the same model share every blind spot that matters"* (`lens/SKILL.md:24-25`) is the skill's own stated limit | measured here |
| **`ask-it`** (conductor) | Collects carried items, searches the tracker per item, drafts decide items, asks one at a time, writes back | 25 req, 22k out, 18 reads (p90 57), context 266k | inline | the conductor's session model | The person reads every item. A reported call the person later reverses is counted as overreach (`ask-it/SKILL.md:28-30`) | measured here |
| **Conductor loop** | Writes briefs, starts workers, waits, reads reports, `git log`, `git status`, relays questions | **never measured**: no real run exists (section C). Must read `hc --skill` (279 lines) and `herdr-app --skill` (153 lines) once, by `wc -l` | is the main session | the session the person opened | Reports are claims until commit and tree are read (`thegraph-herdr/SKILL.md:83-85`); the person on `stuck` and `question` | measured here |

Two structural facts follow from the above, stated as inference.

- **Inferred.** The two seats where nothing but a person catches an error are the
  reading and the stop, and the person sees only the statement. A check of the
  reading against the code happens nowhere except inside `read-it` itself.
- **Inferred.** The handoff to a worker is text: the brief carries ① and ②
  (`thegraph-herdr/SKILL.md:101-102`). A worker reads the skills and the repository
  itself but not the conductor's reasoning, so anything in `read-it` not written
  into those two lines is lost.

### B.2 Mechanics

| Question | Answer | How confirmed | Label |
|---|---|---|---|
| Can a skill pin a model? | Yes. `model` in frontmatter, same values as `/model` or `inherit`. Inline, it applies "for the rest of the current turn"; "the session model resumes when you send your next prompt" | read [skills.md](https://code.claude.com/docs/en/skills.md) frontmatter table | vendor-reported |
| Can a forked skill pin a model? | Yes. "With `context: fork`, the value sets the forked subagent's model instead." `effort` works the same way | same | vendor-reported |
| Do this repo's skills pin one? | No. `lens` has no `model` key, nor does any step | `Grep`; files read | measured here |
| Does a pin bind `thegraph` as well? | Yes: `read-it`, `make-it`, `check-it`, `ask-it` and `lens` are in the `requires:` of both `thegraph` and `thegraph-herdr`, so frontmatter on them changes both | `thegraph/SKILL.md:3`; `thegraph-herdr/SKILL.md:3`; ADR-0098:27 | inferred |
| Will an inline pin survive the confirm stop? | Not after the person's next prompt. Whether an answer through the question tool counts as "your next prompt" is not stated (gap G3) | doc above | inferred |
| What does a subagent inherit? | Order: per-invocation `model` (alias only: `sonnet`, `opus`, `haiku`, `fable`), then definition frontmatter, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main conversation's model | read [sub-agents.md](https://code.claude.com/docs/en/sub-agents.md) "Choose a model" | vendor-reported |
| Effort on a subagent on another model | "On another model, that level doesn't apply. To pick a subagent's level, set `effort` in its definition." A per-invocation `effort` exists since 2.1.292 | read sub-agents.md, model-config.md | vendor-reported |
| Force one model everywhere | `CLAUDE_CODE_SUBAGENT_MODEL` plus `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`, since 2.1.257 | read sub-agents.md | vendor-reported |
| `claude --model` | Alias (`fable`, `opus`, `sonnet`, ...) or full name | ran `claude --help` | measured here |
| `claude --effort` | `low`, `medium`, `high`, `xhigh`, `max` in `--help`; the docs add `ultracode` | ran `claude --help`; read model-config.md | measured here; vendor-reported for `ultracode` |
| Can `hc` start a worker with a model? | Argv after `hc run` goes to the program, so `hc run --bg --name x claude --model sonnet "task"` is the form the manual shows for another agent. **Not run**: the brief forbids starting terminals | ran `hc run --help`; read herdr manual `crates/herdr-core/src/SKILL.md:18-21, 43` | measured here for the argument form; inferred for `claude` |
| Can `hc` templates fix a model? | Yes: templates are `~/.config/herdr-core/templates/<name>.md`, and `command` includes the model. None exist here | herdr manual:18-21; ran `hc templates` → `{"templates":[]}` | vendor-reported; measured here for the empty list |
| Today's worker command | `hc run --bg --name c<issue> --cwd <repo> --label ... claude "Read <brief> and do what it says."` carries no `--model` or `--effort` | `thegraph-herdr/SKILL.md:66` | measured here |
| Advisor tool in Claude Code | `advisorModel` setting, `/advisor`, `--advisor` (not listed in `--help`: `claude --help` has no "advisor" line, ran). Advisor must rank at or above the main model; "Claude decides when to call it"; "no setting to cap or force advisor calls". Fable 5.2 main accepts only Fable 5.2 | read [advisor.md](https://code.claude.com/docs/en/advisor.md) | vendor-reported; measured here for `--help` |
| `opusplan` | `opus` in plan mode, `sonnet` in execution | model-config.md | vendor-reported |
| Mid-conversation model switch | Caches are per-model. A conversation moving off Fable 5.2 loses Fable 5.2's thinking blocks, "and the request still succeeds". Anthropic's guidance: "Switch between conversations, not inside one" | `cost-optimization.md:185`; release notes 2026-11-09 | vendor-reported |
| Conductor and worker as separate sessions | They share no cache or thinking, so giving them different models costs no switch. Each worker starts a fresh prefix | `agent-design.md:94` (subagent as the way to change model), `cost-optimization.md:141` | inferred |
| Auto mode and model | Auto mode supports Sonnet 5 or later, Opus 4.7 or later, Haiku 5.5, Fable. An unsupported `model:` on a skill "isn't used" in auto mode | read permission-modes.md, skills.md | vendor-reported |
| Safety fallback | A flagged request on Fable falls back automatically; in a subagent it switches or fails depending on `/config`. Haiku 5.5 has no server-side fallback. Cyber-flagged work on Opus 5.5 is re-routed to Opus 4.8, on Sonnet 5.5 to Sonnet 5 | model-config.md; `models.md:91`; Opus 5.5 and Sonnet 5.5 launch posts | vendor-reported |
| Bearing on the reviewer's harm check | The harm question reads security-flavoured material and may meet these classifiers. Nothing on record has measured this | ADR-0095; above | inferred |

### B.3 What a worker actually gets today

| Fact | Label | Source |
|---|---|---|
| `~/.claude/settings.json` has `"model": "fable"`. No `--model` is passed, so a new `claude` in `hc` starts on Fable 5.2 unless project or managed settings or `ANTHROPIC_MODEL` say otherwise. **The worker has not been run to confirm** | measured here for the setting; inferred for the outcome | read settings; model-config.md "A new session starts on a different model" |
| `modelSettings` holds effort for Opus 5.5, Opus 5, Sonnet 5.5 and Opus 4.8, none for Fable 5.2, so a Fable worker runs at the Claude Code default for Fable 5.2 | measured here; vendor-reported default | read settings; model-config.md |
| Claude Code's default effort for Fable 5.2, Opus 5.5, Sonnet 5.5 and Haiku 5.5 is `medium` | vendor-reported | model-config.md, effort resolution order |
| The API default for Fable 5.2 and Sonnet 5.5 is `high` | vendor-reported | `models.md:78,89`; whats-new-fable-5-2; Sonnet 5.5 launch post ("In Claude Code and our apps ... Medium, while the Claude Platform defaults to High") |
| Fable models need a consent prompt to bill usage credits on some plans. A worker could stop there; `hc` did not report the folder trust prompt as blocked, and whether this prompt would be is unknown | vendor-reported; measured here (trust prompt, ADR-0098:47-48); gap G4 | model-config.md "Fable and usage credits" |

**Consequence of the second and fourth rows (inferred):** an Anthropic benchmark
quoted at "default effort" for Fable 5.2 or Sonnet 5.5 ran at `high`, and a Claude
Code session on the same model without a saved level runs at `medium`. Those are
different cells of the same table.

## C. Usage data on this machine

**What exists (measured here, `~/.claude/projects`, structural fields only):**

- 1,062 JSONL transcripts: 276 main, 786 under `subagents/`. 3.3 GB. File dates are
  all October and November 2026, and the `/thegraph` sessions span 2026-10-07 to
  2026-11-10. These are this Windows machine's; the Mac the earlier audits read is
  not here.
- `.meta.json` beside subagent transcripts: `agentType`, `toolUseId`, `model`,
  `effort`, `isFork`, and others (723 files).

**Field names per message that support measurement.** On an `assistant` entry:
`message.model`, `message.usage.{input_tokens, output_tokens,
cache_read_input_tokens, cache_creation_input_tokens,
cache_creation.ephemeral_5m_input_tokens, cache_creation.ephemeral_1h_input_tokens,
output_tokens_details.thinking_tokens, service_tier, speed, iterations,
fallback_credit}`, `message.id`, `message.output_config`, `requestId`. On the entry:
`effort`, `requestedModel`, `attributionSkill`, `isSidechain`, `sessionId`,
`promptId`, `timestamp`. Step boundaries come from `tool_use` blocks named `Skill`
and their `input.skill`.

**How many runs (measured here).**

| Count | Value |
|---|---|
| `/thegraph` slash commands | 719 entries, 715 distinct by `uuid`, in 124 main transcripts (582 in October, 133 in November) |
| Segments with all four steps | **132** |
| Segments with `read-it` only | 205 |
| Segments with **no** step `Skill` call | 298 (not classified; could be interrupted runs, resumes, or sessions that did the work without loading a step) |
| `/thegraph-herdr` real runs | **None identified.** One transcript has the skill or command name, two contain the worker-brief sentence; ADR-0098 lists a real issue through a worker as not measured. Contents were not read |

**Which models the history covers (measured here, entries, not requests).**

| Model | Main | Subagent |
|---|---|---|
| `claude-opus-5-5` | 168,225 | 29,535 |
| `claude-sonnet-5-5` | 3,295 | 324 |
| `claude-opus-4-8` | 3,053 | 518 |
| `claude-fable-5-2` | 115 | 18 |
| `claude-haiku-5-5` | 16 | 38 |

Effort on entries: `medium` on Opus 5.5 is 195,787; `high` 1,161; `low` 812.

Subagent definitions in `/thegraph` sessions: `general-purpose` with no model set 644,
`general-purpose` with `sonnet` 10, `fork` with `inherit` 5, `Explore` 55.

**Answer: can the transcripts measure the token cost of each step? Yes, with these
limits.** A trial over all 132 full runs produced the sizes in B.1, and list-price
estimates of median $0.50 (`read-it`), $0.78 (`make-it`), $0.45 (`check-it`) and
$0.77 (`ask-it`), with a median of $7.96 per whole run (mean $9.67). Pricing was this
file's table in D.1; Opus 4.8 at $5/$25 (`models.md:84`), with its cache rates assumed
at $6.25 write, $10 1-hour write and $0.50 read.

| Limit | Label |
|---|---|
| Streaming writes one `message.id` several times: 86,688 of 150,803 assistant entries repeat an earlier id. Summing without de-duplicating over-counts by more than double | measured here |
| `attributionSkill` is empty on 32,344 of 64,118 de-duplicated main-thread entries. The dollar medians above use it and leave "none" at median $1.65 per run. Skill-call boundaries assign every entry and give larger per-step figures | measured here |
| Step cost depends on position: context at the first request grows from 127k at `read-it` to 266k at `ask-it` in these single sessions, and much of that is cached earlier work. A worker starting empty will differ | measured here; inferred for the worker |
| Subagent cost can be linked through `meta.toolUseId` to an `Agent` call (645 of 723 files have it). Forked skills such as `lens` start through `Skill`, so the "75 of 132 `check-it` runs spawned an agent" count excludes forks | measured here for the link; inferred for why |
| Dollars are API list prices. The account here is on a plan with included limits, so they estimate relative size, not a bill | measured here (`claude auth status`); inferred |
| **Transcripts cannot compare models.** With 96% of entries on Opus 5.5 and almost no Fable or Haiku, they say what a step costs on Opus and nothing about what another model would have got right | measured here; inferred |

**Subscription limits (primary sources).**

| Fact | Label | Source |
|---|---|---|
| Session and weekly limits are "shared across all models". A separate model-specific message exists ("You've hit your Opus limit") | vendor-reported | [costs.md](https://code.claude.com/docs/en/costs.md) "When a developer asks about a limit" |
| Max and Ultra have a separate weekly limit for Fable; Fable is included "up to half your weekly limit". On Pro, Fable bills to usage credits | vendor-reported | [claude.com/pricing](https://claude.com/pricing); support article 11145838 |
| The account on this machine is on a plan with Fable included under that half-of-weekly limit | measured here | `claude auth status` |
| "How much you can do depends on the length and complexity of your conversations, the model you choose, and the features you use" | vendor-reported | claude.com/pricing FAQ |
| Relative order only: Haiku lightest, Sonnet moderate, Opus heavy, Fable heaviest. **No numeric weight per model was found in any primary source** | vendor-reported | [Claude Academy guide](https://academy.claude.com/tutorials/choosing-the-right-claude-model) (still names Fable 5.1, so older than 2026-11-09) |
| `/usage` on a subscription shows a breakdown of what counts against limits. Interactive; not run | vendor-reported | costs.md |

## D. Primary sources for the comparison

### D.1 Capability and price

| Source | Covers | Date | Kind |
|---|---|---|---|
| `models.md`, `model-migration.md` (bundled 2.1.321) | IDs, defaults, breaking changes | bundled with 2.1.321 | vendor document |
| [Pricing](https://platform.claude.com/docs/en/about-claude/pricing.md) | Per-token prices | fetched 2026-11-10 | vendor document |
| [Models overview](https://platform.claude.com/docs/en/models/overview.md) | Comparison table, latency | fetched 2026-11-10 | vendor document |
| [Choosing a model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model.md) | Selection matrix: "Most workloads start with Claude Opus 5.5" | fetched 2026-11-10 | vendor guidance, no measurement |
| what's-new pages for all four models | Breaking changes, defaults | fetched 2026-11-10 | vendor document |
| Launch posts: Opus 5.5 (2026-09-22), Sonnet 5.5 (2026-09-28), Haiku 5.5 (2026-10-07) | Benchmark tables, customer quotes. Fable 5.2's post was not found at the guessed URL (gap G6) | release notes for dates | vendor-reported; customer quotes are single anecdotes |

Prices per million tokens (vendor-reported; pricing page):

| Model | Input | Output | 5-min write | 1-h write | Cache read |
|---|---|---|---|---|---|
| Fable 5.2 | $8 | $40 | $10 | $16 | $0.20 |
| Opus 5.5 | $4 | $20 | $5 | $8 | $0.20 |
| Sonnet 5.5 | $2 | $10 | $2.50 | $4 | $0.10 |
| Haiku 5.5, prompt up to 100K | $0.10 | $0.50 | $0.125 | $0.20 | $0.01 |
| Haiku 5.5, prompt over 100K | $0.50 | $2.50 | $0.625 | $1 | $0.05 |

**Inferred from the prices and B.1:** Fable and Opus have the same cache-read price;
and the Haiku low tier is bounded by prompt length, counting cache reads. The past
`read-it` began at a median of 127k tokens of context, so a conductor on Haiku over a
long session would pay the higher tier. A fresh agent would start well under it.

### D.2 Anthropic's guidance on multi-model design

| Source | What it says | Basis | Date |
|---|---|---|---|
| [Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence.md) | Sweep effort before adding a model. "Build a pairing only if it beats the single model's whole curve." Results are "Anthropic-internal ... and directional, not guarantees" | named benchmarks with methods in its references | runs Aug-Nov 2026 |
| same, *Advisor* | One coding pairing that consulted often: +1.7 points, about 2.1× cost, "about what more effort does". Other pairings consulted on few or no tasks | Internal agentic-coding, GPQA, Chartography | Opus 5.5 at `high` + Fable 5.1 advisor, **no Fable 5.2 pairing reported** |
| same, *Orchestrator* | Pays only for routine work with a long cost tail or work larger than one context window. "When the work is one dependent chain, or fits in a single context ... the orchestrator's model alone at lower effort came out ahead" | BrowseComp, DeepWideSearch, defect search, on earlier models | see page |
| same, reference 29 | Opus 5.5 `medium` + Haiku 5.5 subagents on coding: 32% cheaper per attempt, 4.2 points fewer passes (95% CI 1.3 to 7.1); "about what a mix of `low` and `medium` ... would give" | 134 repo tasks, 5 attempts, 3 runs | 2026-10-21 to 23 |
| `cost-optimization.md:141,183-188` | "Skip when the deciding model needs the intermediate context to judge well." Smallest model "fits high-volume work with checkable outputs, not long agentic loops" | same sources | bundled |
| [Which Claude model should you build with?](https://claude.dev/blog/which-claude-model-should-you-build-with/) | Table: classification and routing → Haiku 5.5; "Agent tasks you run repeatedly such as investigation, review, or drafting" → Sonnet 5.5 at `medium`; leading many subagents → Fable 5.2. "Keep code edits and judgment calls on the main model." "When the routing rule is simple ... let code pick the model" | Guidance. Cites the cost page; gives no measurement for the review row | 2026-11-09 |
| [How the Claude Code team does code review](https://claude.dev/blog/solving-code-review-at-anthropic/) | Process and repeat-review measurements. Names no model for its reviewer | Anthropic's own team | 2026-10-15 |
| [Spending your effort](https://claude.dev/blog/spending-your-effort/) | Effort modulates verification; extra effort helped more in hardware, code review, security. Uses Terminal-Bench 3.0 | Internal runs, 5 attempts per task | 2026-09-25 |
| [Choosing a Claude model and effort level](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) | Analogy-based guide to the two settings; its curves are "for illustration purposes only" | No data | date not captured |

**A tension the later phase has to read directly (inferred):** the 2026-11-09 post puts
"review" with Sonnet 5.5 at `medium` and "judgment calls" with the main model, and
the maintainer's statement in ADR-0087 puts judging with the stronger model. Whether
this repository's review counts as "well-defined, repeated" work or as judgement is
not settled by either source.

### D.3 The Felix Rieseberg material

| Source | What it says | Date | Kind |
|---|---|---|---|
| [How to be more ambitious](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/) (read in full) | "Use an outside judge: Do not ask the model to judge itself ... in October 2026, I implore you to insist on outside validation. Ideally that's a tool the model can run." **Says nothing about model tiers** | 2026-10-13 | one engineer's account |
| [Interview "Stop Using Claude Like It's 2024"](https://www.youtube.com/watch?v=D-SVFneJ_Nk) (English auto-captions, read around the cited times) | 13:27 asked whether he uses the same model: "Kind of depends on the task. This is a little context dependent." 13:48: "usually you can like take a step down in intelligence and still get very good results." His reason: finding flaws is easier than creating. Attackers, then a judge, then the author decides (14:58-15:30). 26:32: the current session judging itself "is still really iffy" | published 2026-10-20 | one engineer's account, spoken; **no measurement given** for the step down |

Notes: the claim the ADRs cite as *attackers one tier down* is accurate but drops
"kind of depends on the task". He speaks of adversarial reading, where the judge
step is separate; `lens` and the reviewer are single readers whose caller adjudicates
(ADR-0091:21-22). The captions at 26:32 read "I really want"; #36's quotation reads
"I rarely want", and the sense of the sentence supports #36. All **vendor-reported**
in the sense of an Anthropic engineer's statement.

### D.4 Published evaluations

| Evaluation | What it measures | The four models | Date | Closeness to this use |
|---|---|---|---|---|
| SWE-bench Pro subset (Anthropic's runs; cost page ref. 3) | Solved tasks | Sonnet 5.5 `high` 87.6% at $0.11 per solved task; Opus 5.5 `low` 87.4% at $0.12, `medium` 92.8% at $0.22; Fable 5.2 `high` 96.3% at $1.39 and Opus 5.5 `xhigh` 96.5% at $0.75 (463 problems). Haiku absent | 2026-09/11 | Anthropic's benchmark. Implementation, tests decide. "Largely saturate[d]" per the page |
| Internal agentic-coding (ref. 11) | 370 repo tasks | Opus 5.5 `medium` 86.6% $0.84; Fable 5.2 `medium` 88.9% $1.34 (one run) | 2026-09/11 | Anthropic-internal; closest to `make-it` of the vendor's figures |
| Terminal-Bench 4.0 (launch posts) | Agentic command-line tasks | Opus 5.5 66.4%; Sonnet 5.5 70.6%; Haiku 5.5 39.2% | 2026-09/10 | Vendor-reported; closest to long agent loops. Haiku is far below the other two here |
| FrontierCode 1.1 Main (launch posts) | Would a maintainer merge the change; penalises out-of-scope edits | Opus 5.5 54.4%; Sonnet 5.5 46.2-52.1% by effort; Haiku 5.5 46.4% | 2026-09/10 | Grades diff quality as a reviewer would, so closer to `make-it` than tests-only. Fable 5.2 in [Cognition's changelog](https://cognition.com/frontiercode); score not read |
| [Artificial Analysis on FrontierCode 1.1](https://artificialanalysis.ai/articles/frontiercode) | Independent run, same harness across models, 3 attempts per task, 100 tasks | Opus 5.5 (max) 52%, pass 58%, $10.15 per task; Sonnet 5.5 (max) $8.26, ~50% more output tokens than Opus | 2026-10-12 | Independent. All at `max`, which this repo does not use |
| Internal defect-search (cost page ref. 8) | 130 planted defects, 22M tokens, F1 | Haiku alone 0.577 $25; Sonnet alone 0.760 $103; Opus alone `medium` 0.827 $200, `high` 0.850 $236; Fable 5.2 `low` 0.866 $357, `high` 0.909 $563; Opus + Sonnet subagents 0.831 $139; Opus + Haiku subagents 0.677 $47 | 2026-10/11 | Anthropic-internal. Bug-finding by reading code, so the **nearest vendor figure to the reviewer and `lens`**, though on planted defects at a scale far above one diff |
| [CodeRabbit on Opus 5.5](https://www.coderabbit.ai/blog/opus-5-5-model-review) and [on Sonnet 5.5](https://coderabbit.ai/blog/sonnet-5-5-model-review) | Code review on real open-source PRs: 13 hard cases, and 85 known issues across 44 PRs | Known issues caught on the 13: Sonnet 5.5 6/13 at 41.2% precision; Opus 5.5 8/13 (66.7% precision) and 10/13 at Max (52%). 13 "is a small set", the authors say | 2026-09-22 and 09-28 | **Closest to the reviewer found.** A commercial reviewer's own pipeline, not the model alone. No Haiku 5.5, no Fable 5.2 |
| Customer quotes in launch posts | E.g. Opus 5.5 at low effort caught 72% of known bugs vs Opus 5's 56% at high | 2026-09 | Single-customer, undisclosed sets |
| [Microsoft BC-Bench code review](https://microsoft.github.io/BC-Bench/code-review.html) | PR review scoring | Opus and Sonnet of 4.x and 5; **no 5.5-generation entry** in the capture | fetched 2026-11-10 | Method is relevant; these models are not covered |

**No evaluation was found that compares these four models on classifying or routing
issues**, and none that puts Haiku 5.5 or Fable 5.2 through a code-review benchmark.

Third-party aggregators (BenchLM, gradually.ai, tech-insider and others) turned up in
searches and were not used: they mix estimated and supported scores and disagree with
each other. Treated as leads only.

## Gaps

Stated as gaps, not absences.

- **G1.** How any model other than Opus 5.5 performs on `read-it`, routing,
  `make-it`, `check-it`, the reviewer, `lens` or `ask-it` in this repository. The
  only cross-model data is the older Haiku and Sonnet pilot.
- **G2.** Numeric per-model weights on subscription limits. Only an order was found.
- **G3.** Whether an answer through the question tool ends an inline skill's `model`
  override. The doc says "your next prompt" and does not address that tool.
- **G4.** How a Fable usage-credits consent prompt, or a model-unavailable dialog,
  would appear to `hc wait` in a worker.
- **G5.** Whether `--model` through `hc run ... claude` behaves as the manual's
  analogous example does. Forbidden to run here.
- **G6.** Fable 5.2's launch post and system cards. The guessed URL returned 404;
  the system cards named in the posts were not read.
- **G7.** What the 298 `/thegraph` segments with no step call are, and whether the
  3,053 main-thread Opus 4.8 entries in history were a choice or a safety fallback.
  `requestedModel` on the entry should answer the second; not checked.
- **G8.** Qodo's code-review benchmark: the page returned 403. Its figures appeared
  only in a search summary and are not used here.
- **G9.** Token cost of `lens` itself. ADR-0095 records the reviewer only; the
  subagent files exist but were not separated by agent for this note.
- **G10.** Whether the private archive's issue #44 is reachable by later readers. It
  is cited because ADR-0057's "#44" refers to it, while `kihyun1998/skills#44` is a
  different issue with the same number.

## Questions only a measurement or the maintainer can settle

**Measurement.**

1. On the same issues, does `read-it`'s restatement and route come out the same on
   Sonnet 5.5 or Haiku 5.5 as on Opus 5.5? The seven existing cases measure this
   shape, but they run only where `/Volumes/T7` is mounted, and repeat runs have moved
   by as much as the effect being tested (A.2 row 2).
2. Do a Sonnet 5.5 reviewer or `lens` find what an Opus 5.5 one finds on past diffs?
   ADR-0095's replay method applies; "at what effort" is part of the same question,
   since Anthropic says to sweep effort first.
3. What does one real issue through a worker cost, by step, on each candidate, given
   that a worker starts with an empty context? No such run exists.
4. How much of a plan's weekly limit does a typical `thegraph-herdr` run use on each
   model? `/usage` is the only instrument named, and it is interactive.

**The maintainer.**

5. Does ADR-0087's *"조사는 낮은모델 판단은 opus가 하는게 맞는거아냐"* apply to
   production seats, or only to the eval judge it was said about? And if so, is a code
   review judging or searching in that sense?
6. Is `model: fable` in user settings intended to apply to every worker this skill
   starts?
7. What is the budget being protected: the weekly limit, the Fable half of it, time
   to a finished issue, or the person's attention at the stops? The published
   guidance optimises cost per completed task and none of the others.
8. Should the model choice be fixed per seat, decided per issue by something, or left
   to the session as it is now? ADR-0091 and ADR-0095 chose the last, before Fable 5.2
   existed. If per issue, a step that judges difficulty would have to be added; none
   exists.
