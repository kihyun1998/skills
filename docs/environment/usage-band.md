# usage-band — the line above the prompt, in place of the ccusage statusline

Usage is shown by the `usage-band` mod in [`mods/usage-band/`](../../mods/usage-band/),
one line drawn above the prompt. It replaced the ccusage statusline on
2026-10-07. Both live in the **global** `~/.claude/settings.json`, not in any
repo, so this note is the only record of why it looks the way it does.

## Current setting

There is no `statusLine` key. The mod is installed at user scope from this
repo's marketplace by `scripts/install-mods.ps1`, which leaves this in
`~/.claude/settings.json`:

```json
"enabledPlugins": { "usage-band@kihyun-skills": true },
"extraKnownMarketplaces": {
  "kihyun-skills": { "source": { "source": "directory", "path": "D:\\github\\skills" } }
}
```

A directory marketplace is read in place: `claude plugin list` shows
`Read from: D:\github\skills\mods\usage-band`, and an edit reaches a session
through `/reload-plugins`. It was first loaded through `CLAUDE_CODE_PLUGIN_DIRS`
instead; that is gone, because with both a mod loads twice, and the install
script warns if the variable still names a mod.

## What the band shows

```
opus 5.5 medium   +18%/h $80.97/h   today $80.72
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━──────────────────────────────── 47% ctx   5h ◔ 22%  wk ◔ 27%
```

Two rows. The top says who is working and how fast; the bottom is a runway that
fills with context across the band's width, the limits after it. Labels are dim
and each value has its own color: ANSI names (`green`, `cyan`, …) the terminal
paints from its own theme, the model the Claude Code theme key `claude`. Past 80%
a figure takes the theme's `warning` or `error` instead.

| Figure | Source | Loud when |
|---|---|---|
| model, effort | `$.session.model()`; the `effort` of each main-thread `turn.step` | effort is always colored by level |
| `%/h` | the 5-hour window's readings (below) | error when this pace reaches the limit before the reset, warning past 80% of that pace |
| `$/h` | `ccusage blocks --active --json --offline` → `burnRate.costPerHour` | dim beside `%/h`; it stands in, in yellow, where there is no 5-hour limit (an API key) |
| today | `ccusage daily --json --offline --since <yesterday UTC>` → last day's `totalCost` | bold at $100 or more |
| runway, ctx | `context.percent` | the runway's cells run teal → green → amber → red, hex colors that do not follow the theme; the number is loud past 80% |
| 5h, wk | `rateLimits` `five_hour`, `seven_day` | 80% (warning), 90% (error); 5h adds its reset time |

### %/h

`$/h` is what the session would cost on the API, which says nothing about
whether a subscription is about to run out. `%/h` is how fast the 5-hour limit
is going: the rise over the last hour, measured to now, so it falls while the
session sits idle. With under 15 minutes of history — a new session, a new
window, after `/clear` — it is the window's average so far (percent used over
the time since `resetsAt − 5h`), which needs no history. The readings live in
`$.state` and start over when the window does.

The verdict compares the pace with what the remaining hours allow,
`(100 − used) ÷ hours to reset`: above it, the limit comes first.

Effort is the value the request is **sent** with, after any downgrade for the
model. It changes on the next request after `/effort`, not at the command. Before
the session's first request it shows what settings name:
`modelSettings[<model>].effortLevel`, else `effortLevel`.

`/clear`, `/resume` and `/branch` reset every `$.state` value and do not fire
`session.start` again, so the mod fills the band again on `classic.SessionStart`
with those sources — ccusage too, past its 30 s gap. Without that the band went
blank until the next turn ended.

## Where it draws, and where it cannot

The band sits above the prompt with a blank row under it. That row is the
prompt's own margin, not the band's: no public mod removes it, and a negative
margin on the band made Claude Code draw nothing there. The two other places
tried on 2026-10-07:

- `PromptHint`, stacking the line over `await next(e)`: it lands under the
  permission-mode line (`bypass permissions on …`), which is drawn apart from
  the hint line.
- `$.ui.status`: it lands between the prompt and the permission-mode line, where
  the ccusage statusline was, but it takes plain text, prints ANSI color codes
  literally, and prefixes the line with `⚠ usage-band:`.

## Why ccusage is still installed

The engine reports this session's cost only. Burn rate and today's total need
every transcript on the machine, which is what ccusage reads, so the mod runs it
— every 2 minutes, and after a turn when 30 s have passed since the last run.

Measured on ccusage 20.0.26, offline: `blocks --active` 0.85 s, `daily` 0.51 s.
On Windows the mod starts it as `cmd /c ccusage`, because `$.process.run` uses no
shell and `ccusage` there is a `.cmd` shim.

## Why `--offline`

The old statusline ran `ccusage statusline --no-offline`. That flag drops
ccusage's bundled pricing table and downloads
`BerriAI/litellm/model_prices_and_context_window.json` instead — **1.7 MB per
run**, with a 1-second cache and nothing kept on disk between processes.
Measured on 20.0.18: ~1.3 s per run, every run a fresh download. Offline it is
0 B.

## Maintenance trigger

**A model missing from ccusage's bundled table costs $0, silently.** On 20.0.18
the table had no `claude-opus-5`, and the statusline read `$0.00` until an alias
was added; on 20.0.26 `claude-opus-5-5` is priced. When a new model ships the
same gap can open again. The band catches the visible half of it: a day at $0
while this session has spent shows `today $0 · model not priced in ccusage` in
warning color. The burn rate has no such check and reads low instead.

Two fixes, in order of preference:

1. Update ccusage (`npm i -g ccusage`); a release usually adds the model.
2. Alias the new model to an identically priced one, in the same `env` block:
   `"CCUSAGE_MODEL_ALIASES": "claude-opus-6=claude-opus-5-5"`. `=` joins a
   pair, `,` separates pairs; a `:` is accepted without error and does nothing.
   Confirm the prices match first — the alias asserts equality.

## Known gap

Until today's first response anywhere on the machine, `today` shows
yesterday's total. The mod's environment has no time zone, so it takes the
latest day ccusage reports rather than guessing the local date.
