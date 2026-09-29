#!/usr/bin/env bash
# Sync every top-level SKILL.md directory into Claude Code and/or Codex.
# Default destinations: ~/.claude/skills and ${CODEX_HOME:-~/.codex}/skills.

set -euo pipefail
dry_run=0; replace_copies=0; targets=()
for arg in "$@"; do
    case "$arg" in
        --dry-run|-n) dry_run=1 ;;
        --replace-copies) replace_copies=1 ;;
        --claude) targets+=(claude) ;;
        --codex) targets+=(codex) ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done
[ "${#targets[@]}" -gt 0 ] || targets=(claude codex)
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; repo_root="$(dirname "$script_dir")"
run() { [ "$dry_run" -eq 1 ] || "$@"; }
compare_shadow() {
    local installed="$1/SKILL.md" source="$2/SKILL.md"
    if [ ! -f "$installed" ]; then printf 'no-skill\tholds no SKILL.md\n'; return; fi
    if diff -q <(tr -d '\r' < "$installed") <(tr -d '\r' < "$source") >/dev/null 2>&1; then printf 'identical\tsame content -- a redundant copy\n'; return; fi
    printf 'differs\tinstalled %s lines, repo %s -- THEY DIFFER, and the installed one is what loads\n' "$(wc -l < "$installed" | tr -d ' ')" "$(wc -l < "$source" | tr -d ' ')"
}
should_install_skill() {
    local skill_dir="$1" agent="$2" targets_file="$1/agents/install-targets" target declared=0
    [ -f "$targets_file" ] || return 0
    while IFS= read -r target || [ -n "$target" ]; do
        target="$(printf '%s' "$target" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')"
        [ -z "$target" ] && continue
        case "$target" in \#*) continue ;; claude|codex) ;; *) echo "unsupported install target '$target' in $targets_file" >&2; return 2 ;; esac
        declared=1
        [ "$target" = "$agent" ] && return 0
    done < "$targets_file"
    [ "$declared" -eq 1 ] || { echo "no install targets declared in $targets_file" >&2; return 2; }
    return 1
}
sync_skills() {
    local agent_home="$1" agent="$2" skills_home="$1/skills" backup_home="$1/skills-replaced" linked=0 pruned=0 shadowed=0 differing=0 found=0
    mkdir -p "$skills_home"
    for link in "$skills_home"/*; do
        [ -L "$link" ] || continue; local target name; target="$(readlink "$link")"
        case "$target" in "$repo_root"/*) ;; *) continue ;; esac
        name="$(basename "$link")"
        if [ -f "$repo_root/$name/SKILL.md" ]; then
            if should_install_skill "$repo_root/$name" "$agent"; then
                continue
            else
                status=$?; [ "$status" -eq 1 ] || return "$status"
            fi
            echo "  prune $name - excluded from $agent"
        else
            echo "  prune $name - no longer a skill in this repo"
        fi
        run rm "$link"; pruned=$((pruned + 1))
    done
    for dir in "$repo_root"/*/; do
        [ -f "${dir}SKILL.md" ] || continue; found=1
        local name link target current verdict state detail stamp backup
        name="$(basename "$dir")"; link="$skills_home/$name"; target="${dir%/}"
        if should_install_skill "$target" "$agent"; then
            :
        else
            status=$?; [ "$status" -eq 1 ] || return "$status"; continue
        fi
        if [ -L "$link" ]; then current="$(readlink "$link")"; if [ "$current" = "$target" ]; then echo "  ok    $name - already linked"; else echo "  relink $name - was -> $current"; run rm "$link"; run ln -s "$target" "$link"; linked=$((linked + 1)); fi; continue; fi
        if [ -e "$link" ]; then
            verdict="$(compare_shadow "$link" "$target")"; state="${verdict%%$'\t'*}"; detail="${verdict#*$'\t'}"; shadowed=$((shadowed + 1)); [ "$state" = identical ] || differing=$((differing + 1))
            if [ "$replace_copies" -eq 0 ]; then echo "  shadow $name - a real folder shadows the repo skill" >&2; echo "         $detail"; echo '         your edits in this repo are NOT live for this skill'; continue; fi
            stamp="$(date -u +%Y%m%d-%H%M%S)"; backup="$backup_home/$name-$stamp"; echo "  replace $name - $detail"; echo "         moving the folder to $backup (not deleted)"; run mkdir -p "$backup_home"; run mv "$link" "$backup"; run ln -s "$target" "$link"; linked=$((linked + 1)); continue
        fi
        echo "  link  $name -> $target"; run ln -s "$target" "$link"; linked=$((linked + 1))
    done
    [ "$found" -eq 1 ] || { echo 'No skills found (no top-level directory contains a SKILL.md).'; return; }
    local prefix='' summary; [ "$dry_run" -eq 1 ] && prefix='[dry-run] '; summary="${prefix}Done. $linked linked/relinked, $pruned pruned"; [ "$shadowed" -gt 0 ] && [ "$replace_copies" -eq 0 ] && summary="$summary, $shadowed SHADOWED ($differing differing from the repo)"; echo "$summary in $skills_home."
    [ "$shadowed" -eq 0 ] || [ "$replace_copies" -eq 1 ] || echo "Re-run with --replace-copies to move shadowed folders to $backup_home (never deleted)."
}
for agent in "${targets[@]}"; do
    case "$agent" in claude) agent_home="$HOME/.claude" ;; codex) agent_home="${CODEX_HOME:-$HOME/.codex}" ;; esac
    echo "[$agent]"; sync_skills "$agent_home" "$agent"
done
