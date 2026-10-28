#!/usr/bin/env bash
# Sync everything this repo installs: the skills, then the mods.
# Runs install-skills.sh and install-mods.sh in turn. --dry-run goes to both;
# --claude and --codex go to install-skills.sh, which syncs only that agent.

set -euo pipefail
pass=(); skills_only=()
for arg in "$@"; do
    case "$arg" in
        --dry-run|-n) pass+=(--dry-run) ;;
        --claude|--codex) skills_only+=("$arg") ;;
        *) echo "unknown option: $arg (run install-skills.sh or install-mods.sh for their own flags)" >&2; exit 2 ;;
    esac
done
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo '== skills'; "$script_dir/install-skills.sh" ${pass[@]+"${pass[@]}"} ${skills_only[@]+"${skills_only[@]}"}
echo '== mods'; "$script_dir/install-mods.sh" ${pass[@]+"${pass[@]}"}
