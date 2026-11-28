# What a process `hc run` starts finds on PATH

What this macOS machine's setup does so that a `thegraph-herdr` worker, or any
other process started with `hc run`, finds `node` and `codex`.

## A process `hc run` starts gets the daemon's environment

`hc run` starts its program with the environment of the `herdr-core` daemon, not
that of the terminal that ran `hc`, and it has no option to set one (`hc run
--help`). The daemon runs under launchd (`herdr-core --hc-launchd`, parent pid
1). Its `PATH` is `/etc/paths` and `/etc/paths.d`, then `~/.cargo/bin` and
`~/.local/bin`. It never reads `~/.zshrc`.

Measured on 2026-11-28 with `hc run /bin/sh -c 'echo $PATH; command -v node'`:

```
/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:…:/Library/Apple/usr/bin:/usr/local/go/bin:/opt/homebrew/bin:/Users/parkkihyun/.cargo/bin:/Users/parkkihyun/.local/bin
```

`hc run env "PATH=<x>" /bin/sh -c 'command -v node'` gives the child exactly
`<x>`, so the PATH a child sees is the daemon's unless the command line sets it.

## Why nvm's node and codex were missing

nvm puts `~/.nvm/versions/node/<version>/bin` on `PATH` from `~/.zshrc` only. A
session in a Herdr tab runs an interactive zsh and has `node` and `codex`; a
worker it starts with `hc run` had neither. The hooks that call `node` by name
with `onFailure: block` (the run's hooks file, `check-it-reviewer`'s) then
refused every call they matched, the brief's `node <check-it>/scripts/check-it.mjs`
commands failed, and a review on Codex fell back to Claude with `spawnSync codex
ENOENT` (#173, kubeckup#184).

The fix lives on the machine, not in a skill: #173 first ran each worker through
`env "PATH=$PATH"` (6ea0098) and took it out again (9b2c89f), since the cause is
this environment.

## The setup

- `~/.zshrc` sets `export NVM_SYMLINK_CURRENT=true` on the line before it loads
  `nvm.sh`. With it, `nvm use` points `~/.nvm/current` at the version in use
  (nvm v0.39.3, `nvm.sh` line 3642), so a version change follows. It is the last
  `nvm use` of any shell that wins.
- `~/.local/bin/node` links to `~/.nvm/current/bin/node`, and
  `~/.local/bin/codex` to `~/.nvm/current/bin/codex`. `~/.local/bin` is on the
  daemon's `PATH`.

Measured afterwards, 2026-11-28: a plain `hc run /bin/sh -c 'command -v node
codex; node -v; codex --version'` printed `~/.local/bin/node`,
`~/.local/bin/codex`, `v24.11.1` and `codex-cli 0.172.0`. #179's worker, started
without any `env` prefix, ran its three Codex reviews on Codex.

A program installed with `npm install -g` under nvm is reachable from a worker
only once it has a link of its own in `~/.local/bin`.

Not measured: Linux and Windows, and whether a Codex or Antigravity worker
started through `hc run` takes the same environment.
