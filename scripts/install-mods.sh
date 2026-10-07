#!/usr/bin/env bash
# Sync every mod in this repo's mods/ into Claude Code as a user-scope plugin.
# Runs install-mods.mjs, which holds the logic; see its header. --uninstall, --dry-run.
# install-mods.ps1 is this file's twin: both only pass their options through.

set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$script_dir/install-mods.mjs" "$@"
