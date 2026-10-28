#!/usr/bin/env bash
# Sync every top-level SKILL.md directory into Claude Code and/or Codex, and link
# docs/environment/CLAUDE.md as each one's user-level instructions file.
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
# Git Bash's `ln -s` deep-copies the directory unless MSYS asks for native links, and
# exits 0 either way; a copy then reads as a shadow on every later run. On Windows the
# link is a junction, and every link is checked after.
link_dir() {
    local target="$1" link="$2"
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*) MSYS2_ARG_CONV_EXCL='*' cmd /c mklink /J "$(cygpath -w "$link")" "$(cygpath -w "$target")" >/dev/null ;;
        *) ln -s "$target" "$link" ;;
    esac
    [ -L "$link" ] || { echo "  fail  $(basename "$link") - not a link after linking" >&2; return 1; }
}
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
        if [ -L "$link" ]; then current="$(readlink "$link")"; if [ "$current" = "$target" ]; then echo "  ok    $name - already linked"; else echo "  relink $name - was -> $current"; run rm "$link"; run link_dir "$target" "$link" && linked=$((linked + 1)); fi; continue; fi
        if [ -e "$link" ]; then
            verdict="$(compare_shadow "$link" "$target")"; state="${verdict%%$'\t'*}"; detail="${verdict#*$'\t'}"; shadowed=$((shadowed + 1)); [ "$state" = identical ] || differing=$((differing + 1))
            if [ "$replace_copies" -eq 0 ]; then echo "  shadow $name - a real folder shadows the repo skill" >&2; echo "         $detail"; echo '         your edits in this repo are NOT live for this skill'; continue; fi
            stamp="$(date -u +%Y%m%d-%H%M%S)"; backup="$backup_home/$name-$stamp"; echo "  replace $name - $detail"; echo "         moving the folder to $backup (not deleted)"; run mkdir -p "$backup_home"; run mv "$link" "$backup"; run link_dir "$target" "$link" && linked=$((linked + 1)); continue
        fi
        echo "  link  $name -> $target"; run link_dir "$target" "$link" && linked=$((linked + 1))
    done
    [ "$found" -eq 1 ] || { echo 'No skills found (no top-level directory contains a SKILL.md).'; return; }
    local prefix='' summary; [ "$dry_run" -eq 1 ] && prefix='[dry-run] '; summary="${prefix}Done. $linked linked/relinked, $pruned pruned"; [ "$shadowed" -gt 0 ] && [ "$replace_copies" -eq 0 ] && summary="$summary, $shadowed SHADOWED ($differing differing from the repo)"; echo "$summary in $skills_home."
    [ "$shadowed" -eq 0 ] || [ "$replace_copies" -eq 1 ] || echo "Re-run with --replace-copies to move shadowed folders to $backup_home (never deleted)."
}
# The user-level instructions file (docs/environment/CLAUDE.md) is linked where each agent
# reads its global instructions. A real file there is never overwritten: it is reported, and
# moved aside only with --replace-copies. Git Bash makes a native file symlink only when
# asked to, and fails rather than copying; a failed link is reported and the run goes on.
link_file() {
    local target="$1" link="$2"
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*) MSYS=winsymlinks:nativestrict ln -s "$target" "$link" 2>/dev/null ;;
        *) ln -s "$target" "$link" 2>/dev/null ;;
    esac
    [ -L "$link" ] || { echo "  fail  $(basename "$link") - could not link it (on Windows, turn on Developer Mode); skipped" >&2; return 1; }
}
sync_instructions() {
    local link="$1" backup_home="$2" source="$repo_root/docs/environment/CLAUDE.md" name stamp
    name="$(basename "$link")"
    [ -f "$source" ] || return 0
    if [ -L "$link" ]; then
        [ "$(readlink "$link")" = "$source" ] && { echo "  ok    $name - already linked"; return; }
        echo "  relink $name - was -> $(readlink "$link")"; run rm "$link"; run link_file "$source" "$link" || true; return
    fi
    if [ -e "$link" ]; then
        if [ "$replace_copies" -eq 0 ]; then
            echo "  shadow $name - a real file is there, and it is what loads" >&2
            echo "         re-run with --replace-copies to move it to $backup_home (not deleted)"; return
        fi
        stamp="$(date -u +%Y%m%d-%H%M%S)"; echo "  replace $name - moving it to $backup_home/$name-$stamp (not deleted)"
        run mkdir -p "$backup_home"; run mv "$link" "$backup_home/$name-$stamp"
    fi
    echo "  link  $name -> $source"; run mkdir -p "$(dirname "$link")"; run link_file "$source" "$link" || true
}
for agent in "${targets[@]}"; do
    case "$agent" in claude) agent_home="$HOME/.claude" ;; codex) agent_home="${CODEX_HOME:-$HOME/.codex}" ;; esac
    echo "[$agent]"; sync_skills "$agent_home" "$agent"
    case "$agent" in
        claude) sync_instructions "$agent_home/CLAUDE.md" "$agent_home/skills-replaced" ;;
        codex)
            sync_instructions "$agent_home/AGENTS.md" "$agent_home/skills-replaced"
            # Codex reads only the first non-empty of AGENTS.override.md and AGENTS.md here.
            [ ! -s "$agent_home/AGENTS.override.md" ] || echo "  note  AGENTS.override.md is non-empty, so Codex reads it instead of AGENTS.md" >&2 ;;
    esac
done
