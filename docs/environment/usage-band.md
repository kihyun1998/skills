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

## What the line shows

```
opus 5.5 high  ·  context ◕ 68%  ·  5h ◑ 41%  ·  week ◔ 18%  ·  ◜ $83.67/h ↗  ·  today $59.40
```

Labels are dim; each value has its own color. Colors are ANSI names (`green`,
`cyan`, …) so the terminal paints them from its own theme, except the model,
which uses the Claude Code theme key `claude`. Past a threshold a value takes
the theme's `warning` or `error` instead:

| Figure | Source | Color | Loud when |
|---|---|---|---|
| model, effort | `$.session.model()`; the `effort` of each main-thread `turn.step` | `claude`; effort by level | — |
| context, 5h, week | `$.session.usage()` and `session.measure` | green, cyan, blueBright | 80% (warning), 90% (error); 5h adds its reset time |
| `$/h` | `ccusage blocks --active --json --offline` → `burnRate.costPerHour` | yellow | above 1.5× the average of the readings so far (error) |
| today | `ccusage daily --json --offline --since <yesterday UTC>` → last day's `totalCost` | magenta | bold at $100 or more |

Each percentage leads with a pie that steps by quarters (`○ ◔ ◑ ◕ ●`), so the
fill reads at a glance and the number gives the exact value.

The burn rate leads with a dial that turns a quarter per tick, one turn a second
at $80/h — faster as the money goes, held between 8 frames a second and one
every 2 s. Each tick redraws the band once. The arrow after it compares the last
reading with the one before: `↑` past +15%, `↗` past +3%, `→` within ±3%, and
mirrored down. The dial is drawn in open arcs (`◜◝◞◟`), not half discs: `◑` is
also the 50% pie, and the two side by side read as the same thing.

Effort is the value the request is **sent** with, after any downgrade for the
model. It changes on the next request after `/effort`, not at the command.

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
