#!/usr/bin/env bash

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
dry_prefix=''; if [ "$dry_run" -eq 1 ]; then dry_prefix='[dry-run] '; fi
skill_dirs=()
for dir in "$repo_root"/*/ "$repo_root"/ki-skills/*/; do
    if [ -f "${dir}SKILL.md" ]; then skill_dirs+=("${dir%/}"); fi
done
skill_source() {
    local dir
    for dir in ${skill_dirs[@]+"${skill_dirs[@]}"}; do [ "${dir##*/}" != "$1" ] || { printf '%s\n' "$dir"; return 0; }; done
    return 1
}
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
skill_state() {
    local source_dir status
    source_dir="$(skill_source "$1")" || { echo gone; return 0; }
    if should_install_skill "$source_dir" "$2"; then echo live; return 0; else status=$?; [ "$status" -eq 1 ] || return "$status"; fi
    echo excluded
}
prune_reason() {
    case "$1" in excluded) echo "excluded from $2" ;; gone) echo 'no longer a skill in this repo' ;; esac
}
sync_skills() {
    local skills_home="$1" agent="$2" backup_home="$3" source_dir linked=0 pruned=0 shadowed=0 differing=0 found=0 state
    run mkdir -p "$skills_home"
    for link in "$skills_home"/*; do
        [ -L "$link" ] || continue; local target name; target="$(readlink "$link")"
        case "$target" in "$repo_root"/*) ;; *) continue ;; esac
        name="$(basename "$link")"
        state="$(skill_state "$name" "$agent")" || return $?
        [ "$state" != live ] || continue
        echo "  prune $name - $(prune_reason "$state" "$agent")"
        run rm "$link"; pruned=$((pruned + 1))
    done
    for target in ${skill_dirs[@]+"${skill_dirs[@]}"}; do
        found=1
        local name link current verdict state detail stamp backup
        name="${target##*/}"; link="$skills_home/$name"
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
    [ "$found" -eq 1 ] || { echo 'No skills found (no top-level or ki-skills/ directory contains a SKILL.md).'; return; }
    local summary; summary="${dry_prefix}Done. $linked linked/relinked, $pruned pruned"; [ "$shadowed" -gt 0 ] && [ "$replace_copies" -eq 0 ] && summary="$summary, $shadowed SHADOWED ($differing differing from the repo)"; echo "$summary in $skills_home."
    [ "$shadowed" -eq 0 ] || [ "$replace_copies" -eq 1 ] || echo "Re-run with --replace-copies to move shadowed folders to $backup_home (never deleted)."
}
linked_in() {
    if [ "$dry_run" -eq 0 ]; then [ "$(readlink "$1" 2>/dev/null)" = "$2" ]; return; fi
    [ -L "$1" ] || [ ! -e "$1" ] || [ "$replace_copies" -eq 1 ]
}
retire_codex_skills_home() {
    local old_home="$1" new_home="$2" link target name source_dir verdict state pruned=0 kept=0 shadowed=0
    [ -d "$old_home" ] || return 0
    [ "$(cd "$old_home" && pwd -P)" != "$(cd "$new_home" 2>/dev/null && pwd -P)" ] || return 0
    for link in "$old_home"/*; do
        [ -e "$link" ] || [ -L "$link" ] || continue; name="$(basename "$link")"
        if [ -L "$link" ]; then
            target="$(readlink "$link")"
            case "$target" in
                "$repo_root"/*)
                    state="$(skill_state "$name" codex)" || return $?
                    if [ "$state" != live ]; then
                        echo "  prune $name - $(prune_reason "$state" codex)"
                    elif linked_in "$new_home/$name" "$(skill_source "$name")"; then
                        echo "  prune $name - moved to $new_home"
                    else
                        echo "  keep  $name - not linked in $new_home, so removing it here would lose it" >&2; kept=$((kept + 1)); continue
                    fi
                    run rm "$link"; pruned=$((pruned + 1)); continue ;;
            esac
            echo "  left  $name - a link to $target, not this repo's; Codex still reads it here" >&2
        elif source_dir="$(skill_source "$name")"; then
            verdict="$(compare_shadow "$link" "$source_dir")"; shadowed=$((shadowed + 1))
            echo "  shadow $name - a real folder of this repo's skill; Codex reads it beside $new_home" >&2; echo "         ${verdict#*$'\t'}"; echo '         left alone: move or delete it yourself'
        else
            echo "  left  $name - a real folder, not this repo's; Codex still reads it here" >&2
        fi
    done
    [ $((pruned + kept + shadowed)) -eq 0 ] || echo "${dry_prefix}$pruned pruned, $kept kept, $shadowed SHADOWED in $old_home, which Codex keeps only for backward compatibility."
}
# Git Bash makes a native file symlink only when asked to, and fails rather than copying; a
# failed link is reported and the run goes on.
link_file() {
    local target="$1" link="$2"
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*) MSYS=winsymlinks:nativestrict ln -s "$target" "$link" 2>/dev/null ;;
        *) ln -s "$target" "$link" 2>/dev/null ;;
    esac
    [ -L "$link" ] || { echo "  fail  $(basename "$link") - could not link it (on Windows, turn on Developer Mode); skipped" >&2; return 1; }
}
sync_file() {
    local source="$1" link="$2" backup_home="$3" name stamp
    name="$(basename "$link")"
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
sync_instructions() {
    local source="$repo_root/docs/environment/CLAUDE.md"
    [ -f "$source" ] || return 0
    sync_file "$source" "$1" "$2"
}
sync_agents() {
    local agents_home="$1/agents" backup_home="$1/skills-replaced" live=() link target skill agent kept
    for target in "$repo_root"/*/agents/*.md; do
        skill="$(dirname "$(dirname "$target")")"
        [ -f "$target" ] && [ -f "$skill/SKILL.md" ] || continue
        if should_install_skill "$skill" claude; then live+=("$target"); else status=$?; [ "$status" -eq 1 ] || return "$status"; fi
    done
    for link in "$agents_home"/*.md; do
        [ -L "$link" ] || continue; target="$(readlink "$link")"
        case "$target" in "$repo_root"/*) ;; *) continue ;; esac
        kept=0; for agent in ${live[@]+"${live[@]}"}; do [ "$agent" != "$target" ] || kept=1; done
        [ "$kept" -eq 0 ] || continue
        echo "  prune $(basename "$link") - no longer an agent in this repo"; run rm "$link"
    done
    for target in ${live[@]+"${live[@]}"}; do sync_file "$target" "$agents_home/$(basename "$target")" "$backup_home"; done
}
for agent in "${targets[@]}"; do
    case "$agent" in
        claude) agent_home="$HOME/.claude"; skills_home="$agent_home/skills" ;;
        # Codex reads user skills from ~/.agents/skills; $CODEX_HOME/skills is its deprecated root
        # (openai/codex 57b493a, codex-rs/ext/skills/src/host_roots.rs).
        codex) agent_home="${CODEX_HOME:-$HOME/.codex}"; skills_home="$HOME/.agents/skills" ;;
    esac
    echo "[$agent]"; sync_skills "$skills_home" "$agent" "$agent_home/skills-replaced"
    case "$agent" in
        claude)
            sync_instructions "$agent_home/CLAUDE.md" "$agent_home/skills-replaced"
            sync_agents "$agent_home" ;;
        codex)
            retire_codex_skills_home "$agent_home/skills" "$skills_home"
            sync_instructions "$agent_home/AGENTS.md" "$agent_home/skills-replaced"
            # Codex reads only the first non-empty of AGENTS.override.md and AGENTS.md here.
            [ ! -s "$agent_home/AGENTS.override.md" ] || echo "  note  AGENTS.override.md is non-empty, so Codex reads it instead of AGENTS.md" >&2 ;;
    esac
done
