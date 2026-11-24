# check-it — a review on Codex

Read this where a review's row names Codex as its runner (*Each review's runner and model* in [SKILL.md](SKILL.md)).

**A review whose row's runner is Codex runs from the same prompt** a Claude
reviewer gets, through the script, which prints the report's path and its cost
line, and is awaited like any check:

```
node <check-it>/scripts/check-it.mjs run <review> --runner codex --model <model> --issue <issue> --run-folder <run folder> --ledger <ledger> [--sheet <run sheet>]
```

- **It is held read-only.** The exact `codex exec` call is `RUNNERS.codex` in
  [scripts/runners.mjs](scripts/runners.mjs): the read-only sandbox, approvals
  never asked, nothing kept after the run, the repository as its root, the
  events as JSONL, and the prompt on stdin. Codex writes the report through
  `-o`, so the model writes nothing. `--ignore-user-config` leaves out
  `config.toml`'s MCP servers, which run outside the sandbox, and drops its
  `[windows] sandbox` too, so the script sets it again (the #141 trial: without
  it every command was refused).
- **It reaches no network, and so starts no model run.** The sandbox sends
  outbound connections through a proxy at `127.0.0.1:9`, where nothing listens:
  measured on 2026-11-24 (#141), `curl.exe -I` to `api.openai.com` and
  `api.anthropic.com` from inside it printed *Failed to connect to 127.0.0.1
  port 9*, while `claude --version` ran (2.1.331). A program that ignores the
  proxy variables was not tried. The `check-it-reviewer` type and its hook do
  not apply to a Codex review.
- **It is a static review.** It cannot make the copy the brief offers for a
  probe, so every finding of a review run on Codex goes to the proving agent
  (11), the spec and rules reviewer's and `comment-it`'s included, which on
  Claude carry their own evidence (#141). Its report's first line, on `Agent`
  and `Skill`, says nothing about `check-it-reviewer` and is not read for it.
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
- **When it fails, it falls back without asking.** The script exits 3 when
  Codex says it is out of usage, and 4 on any other failure: no `codex` on
  PATH, a non-zero exit, the time limit, no report, no `turn.completed`. Either
  way the review runs again on its row's Claude model, with `Agent` as any
  Claude review, and the result names it as fallen back, with what the script
  said, so the floor review still runs (#141). Exit 1 is a call the script
  refused, such as a missing option: fix it and run it again. Out of usage is
  read from the error text Codex prints (its usage limit hit or reached, quota
  exceeded, out of credits, a spend cap), as found in codex-cli 0.171.0's
  binary; the state itself was not triggered, so its exit code and exact output
  are unverified, and a message not matched still falls back, as exit 4.
- **What it does not change**: `~/.codex/AGENTS.md` still loads under
  `--ignore-user-config`, so the report can come back in that file's language,
  and the repository's skills load as Codex skills, whose frontmatter errors on
  stderr are noise.

Another CLI is one more runner: an entry in the script's runner table, with how
it is found, started and read, and a value this table can name (#141).
