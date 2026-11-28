# check-it — a review on Codex

Read this where a review's row names Codex as its runner (*Each review's runner and model* in [SKILL.md](SKILL.md)): from Claude Code the rows that say so, and from Codex every row, the decision model's and the proving agent's included.

**A review whose row's runner is Codex runs from the same prompt** a Claude
reviewer gets, through the script, which prints the report's path and its cost
line, and is awaited like any check:

```
node <check-it>/scripts/check-it.mjs run <review> --caller <claude or codex> --runner codex --model <model> [--effort <effort>] --issue <issue> [--issue-file <issue file>] --run-folder <run folder> --ledger <ledger> [--findings <report> ...] [--change <file>] [--sheet <run sheet>]
```

- **`--caller` is the product running this skill**, `claude` from Claude Code
  and `codex` from Codex, and the model and the effort are its column's row
  (an effort only where the row names one). `proving` takes `--findings` and
  `pick-confirm` takes `--change`, as their `prompt` does, and in a cluster
  `pick-confirm` takes `--child` with `--sheet`, as `name` does.
- **The model is checked before anything starts** (#158). The script reads
  `codex debug models`, Codex's own listing, and stops with exit 1, starting
  nothing, where the model is not in it or the effort is not one of that
  model's levels. No other model or effort is put in its place, so that review
  is not run, and the result names the row and what the listing named. A
  listing Codex could not give is a failure of the run (exit 4, below).

- **It is held read-only, with the network on** (#146). The exact `codex
  exec` call is `RUNNERS.codex` in [scripts/runners.mjs](scripts/runners.mjs):
  the `unelevated` Windows sandbox with a permission profile that extends
  `:read-only` and turns command network on, approvals never asked, nothing
  kept after the run, the repository as its root, the events as JSONL, and the
  prompt on stdin. Codex writes the report through `-o`, so the model writes
  nothing. `--ignore-user-config` leaves out `config.toml`'s MCP servers,
  which run outside the sandbox, and its `[windows] sandbox`, which the script
  sets itself (#141). Measured on 2026-11-24 in a real run: `gh issue view`
  read the issue with the person's keyring login, `git diff` ran, and a write
  in the tree was refused.
- **Its commands get no token variables, and it has no sub-agent or app tool.**
  `shell_environment_policy.inherit="core"` passes only the core environment,
  since under `--ignore-user-config` Codex would pass a `GH_TOKEN` or any
  other token variable (measured: 109 variables without it, 38 with it, none
  named for a token or key); `gh` and `glab` still log in through the keyring
  and `glab`'s config file. `--disable multi_agent` and `--disable apps`
  take away Codex's own sub-agent tool and its connectors, which no shell hook
  sees and whose traffic is outside the sandbox's network rules.
- **`check-it-reviewer`'s decision script runs as its hook** (#146): a
  `PreToolUse` hook on every shell command, through
  [scripts/codex-hook.mjs](scripts/codex-hook.mjs), refuses what that agent
  type's hook refuses in a shell: an AI CLI, a kill by image name, a non-read inside the
  repository or naming a path inside it from anywhere (#147), any `gh` or `glab` command but a tracker read, and a rewrite of
  the run's ledger
  ([SKILL.md](SKILL.md), *Briefing the fresh agents*). On
  Windows it reads the command as PowerShell, which Codex runs it in though it
  names it `Bash`. The hook is passed with `-c` and runs only with
  `--dangerously-bypass-hook-trust`, since Codex skips a hook nobody trusted
  through `/hooks`; it refuses through its JSON answer, since an exit 2 did
  not stop the command. Codex does not run a hook whose command is quoted, so
  where the path of `node` or of the script holds a space or a quote the
  script falls back before Codex starts.
- **What nothing holds**: a command or a script that reads a stored credential,
  such as `gh auth token` reached through a variable or another interpreter,
  and calls a model API or a tracker's write API itself. The network is open
  and the hook reads only the command's text; ADR-0102 records the gap as
  accepted. Not measured: macOS and Linux.
- **A hook in the reviewed tree does not load.** Under `--ignore-user-config`
  Codex reads no saved project trust, so the tree's `.codex` layer stays
  disabled and hook discovery passes over it, `--dangerously-bypass-hook-trust`
  or not (codex-cli 0.171.0 source: `config/src/loader/mod.rs`,
  `config/src/state.rs` `layers_low_to_high`). Measured on 2026-11-24: in a
  temporary repository listed as trusted, its `.codex/hooks.json` hooks wrote
  nothing during a review run.
- **The issue's text is in the prompt** where the caller gives
  `--issue-file`, as for a Claude review (*Briefing the fresh agents* in
  [SKILL.md](SKILL.md)).
- **It is a static review.** It cannot make the copy the brief offers for a
  probe, so every finding of a review run on Codex goes to the proving agent
  (11), the spec and rules reviewer's and `comment-it`'s included, which on
  Claude carry their own evidence (#141). Its report's first line, on `Agent`
  and `Skill`, says nothing about `check-it-reviewer` and is not read for it.
- **The proving agent on Codex is the one review that writes, and only in a
  copy** (#158). Before Codex starts, the script copies the files `git
  ls-files -co --exclude-standard` lists to `<run folder>/proving/tree`, with
  a line in the ledger, and adds that folder as the profile's one `write`
  path; the repository stays read-only in the sandbox and the hook still
  refuses a write into it. Its prompt gains
  [reviewers/proving-copy.md](reviewers/proving-copy.md), naming the copy. The
  script deletes the folder once Codex ends, passed or failed, and writes its
  size in the ledger as `du -sh` counts it; a folder it cannot delete is
  named in what it prints, on a `left:` line after the cost line or at the end
  of the failure, its ledger line left open. The script makes the folder
  itself as its check, so a folder already there, another proving run's or
  one left behind, stops the run before anything starts. Measured on 2026-11-28 with `codex sandbox` on macOS (codex-cli
  0.172.0, no model run): with that profile a write in the folder and `git
  init` there ran, and a write in the repository, the run folder and `/tmp`
  was refused. Not measured: Windows, whose `unelevated` sandbox refuses a
  split read and write rule it cannot enforce (Codex's permissions
  documentation), which would make the run fail.
- **Its report is saved** where `name` puts it, beside `--sheet` where given,
  only once Codex finished and wrote one in this run; a `.part` an earlier run
  left is removed before Codex starts.
- **It is stopped after 30 minutes.** The #141 runs took 23 to 67 s. On
  Windows the script starts the npm install's `codex.js` with `node`, and
  `codex.exe`, its child, ends with it (a test holds that a timed-out run leaves
  no process behind).
- **Its cost line** is the `turn.completed` events' `input_tokens`,
  `cached_input_tokens` and `output_tokens`, with the wall time. No dollar
  figure is given.
- **When it fails from Claude Code, it falls back without asking.** The
  script exits 3 when Codex says it is out of usage, and 4 on any other
  failure: no `codex` on PATH, a model listing it could not give, a hook
  command that would need quoting, a non-zero exit, the time limit, no report,
  no `turn.completed`. Either way the review runs again on its row's Claude
  model, with `Agent` as any Claude review, and the result names it as fallen
  back, with what the script said, so the floor review still runs (#141).
  **From Codex there is no other product to fall back to**: the same exits
  mean the review did not run, the script says so, and the result reports it
  as not run with what the script said, never as passed. A floor review not
  run leaves the check incomplete, and the result says that too. Exit 1 is a
  call the script refused, such as a missing option or a model (above): fix
  the call and run it again. Out of usage is
  read from the error text Codex prints (its usage limit hit or reached, quota
  exceeded, out of credits, a spend cap), as found in codex-cli 0.171.0's
  binary. Seen once on 2026-11-24 (#146): an `error` and a `turn.failed`
  event saying *You’ve hit your usage limit. Upgrade to Pro (…), visit … or
  try again at 1:52 PM.*, and exit 1, which the first pattern matches. A
  message not matched still falls back, as exit 4.
- **What it does not change**: `~/.codex/AGENTS.md` still loads under
  `--ignore-user-config`, so the report can come back in that file's language,
  and the repository's skills load as Codex skills, whose frontmatter errors on
  stderr are noise.

## From Codex

Where [SKILL.md](SKILL.md) says to start a review or the decision model with
`Agent`, a Codex caller runs it with `run --caller codex` above, the decision
model as `pick` or `pick-confirm`; it waits for each, reads the report the
script saved, and puts the cost line it printed in the result. A row the
person changed to a runner other than Codex is reported as not applied,
since from Codex the script reaches Codex only. Where SKILL.md says to call
`make-it` or `check-it` again with `Skill`, a Codex caller opens that skill's
`SKILL.md`, in the folder that holds this skill's folder, and follows it. What
SKILL.md says about `check-it-reviewer`, the agent list and an `Agent` call
started in the background is Claude Code's, and does not apply.

Another CLI is one more runner: an entry in the script's runner table, with how
it is found, started and read, a calling product in its product table, and a
column this table can name (#141, #158).
