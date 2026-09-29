# ccusage statusline — offline with a model alias

The Claude Code statusline runs `ccusage` on every refresh. It is configured in
the **global** `~/.claude/settings.json`, not in any repo, so this note is the
only record of why it looks the way it does.

## Current setting

```json
"statusLine": {
  "type": "command",
  "command": "CCUSAGE_MODEL_ALIASES='claude-opus-5=claude-opus-4-8' ccusage statusline",
  "padding": 0
}
```

## Why not `--no-offline`

The statusline previously ran `ccusage statusline --no-offline`. That flag turns
off ccusage's bundled pricing data and fetches
`BerriAI/litellm/model_prices_and_context_window.json` instead — **1.7 MB per
refresh**. The internal cache has a 1-second TTL, so any refresh more than a
second after the last one re-downloads the whole file.

Measured on ccusage 20.0.18 (cold, `--no-cache`):

| | network | wall time |
|---|---|---|
| `--no-offline` | 1.7 MB / refresh | ~1.3 s |
| offline + alias | 0 B | ~0.19 s |

Four calls spaced 2 s apart under `--no-offline` took 1.31 / 2.15 / 1.09 s —
every one a fresh download. There is no pricing cache on disk between processes.

## Why the alias is needed

Dropping `--no-offline` alone is wrong: it reports **$0.00**. ccusage's bundled
pricing table has `claude-sonnet-5` and `claude-fable-5` but **not
`claude-opus-5`**, which is the model behind the `opus[1m]` setting. A model
missing from the table costs nothing, silently.

`claude-opus-5` and `claude-opus-4-8` are priced identically — input $5, output
$25, cache-write $6.25, cache-read $0.50 per MTok — and Opus 5's 1M context
carries no above-200k premium, so there is no tier where the two diverge.
Aliasing one to the other is exact, not an approximation.

Verified by diffing `ccusage daily --json` both ways across all history:
`totalCost` matched to full float precision (`2381.8907392500014`), with zero
disagreement on any day or any token field.

## The one behavioural difference

The alias renames the model, so per-model breakdowns **merge the two into one
row**:

```
online : {claude-opus-5: 218.154, claude-opus-4-8: 0.529}
offline: {claude-opus-4-8: 218.683}
```

Totals are unaffected. This only shows up in `ccusage --breakdown`; the
statusline does not use breakdowns.

## Maintenance trigger

**When a new Opus model ships, the statusline silently reads $0.00 again** —
same failure as before, no error. Add a pair to the alias list:

```
CCUSAGE_MODEL_ALIASES='claude-opus-5=claude-opus-4-8,claude-opus-6=claude-opus-5'
```

Confirm the prices actually match first (`model_prices_and_context_window.json`),
since the alias asserts equality.

Note the separator: `=` between the pair, `,` between pairs. A `:` is accepted
without error and silently does nothing — it yields $0.00.

## Alternative, if the alias upkeep is unwanted

`ccusage statusline --no-offline --refresh-interval 300` keeps live pricing and
needs no alias, at 1.7 MB per 5 minutes instead of per refresh. It self-corrects
for new models; it does not eliminate the traffic.
