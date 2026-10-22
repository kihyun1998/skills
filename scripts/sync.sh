#!/usr/bin/env bash
# Sync everything this repo installs: the skills, then the mods.
# Runs install-skills.sh and install-mods.sh in turn. --dry-run goes to both;
# a flag only one of them takes is passed to that script directly.

set -euo pipefail
pass=()
for arg in "$@"; do
    case "$arg" in
        --dry-run|-n) pass+=(--dry-run) ;;
        *) echo "unknown option: $arg (run install-skills.sh or install-mods.sh for their own flags)" >&2; exit 2 ;;
    esac
done
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo '== skills'; "$script_dir/install-skills.sh" ${pass[@]+"${pass[@]}"}
echo '== mods'; "$script_dir/install-mods.sh" ${pass[@]+"${pass[@]}"}
