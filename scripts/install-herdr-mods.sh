#!/usr/bin/env bash
# Links every Herdr-app mod in herdr-mods/ and every layout in herdr-mods/layouts/ into the
# Herdr app's home (${HERDR_APP_HOME:-~/.config/herdr-app}). Prints the layout switch command and
# never runs it. Warns when Herdr's version differs from a clone's (each mod's clones.json).

set -euo pipefail
dry_run=0
for arg in "$@"; do
    case "$arg" in
        --dry-run|-n) dry_run=1 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; repo_root="$(dirname "$script_dir")"
source_root="$repo_root/herdr-mods"
app_home="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
run() { [ "$dry_run" -eq 1 ] || "$@"; }
windows() { case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 0 ;; *) return 1 ;; esac; }
# A folder is a junction on Windows and a file a native symlink, as in install-skills.sh; every
# link is checked after.
link_dir() {
    if windows; then MSYS2_ARG_CONV_EXCL='*' cmd /c mklink /J "$(cygpath -w "$2")" "$(cygpath -w "$1")" >/dev/null; else ln -s "$1" "$2"; fi
    [ -L "$2" ] || { echo "  fail  $(basename "$2") - not a link after linking" >&2; return 1; }
}
link_file() {
    if windows; then MSYS=winsymlinks:nativestrict ln -s "$1" "$2" 2>/dev/null || true; else ln -s "$1" "$2" 2>/dev/null || true; fi
    [ -L "$2" ] || { echo "  fail  $(basename "$2") - could not link it (on Windows, turn on Developer Mode)" >&2; return 1; }
}
# One source into one place: linked, already linked, relinked, or a real one there left alone.
place() {
    local kind="$1" source="$2" target="$3" name; name="$(basename "$target")"
    if [ -L "$target" ]; then
        [ "$(readlink "$target")" = "$source" ] && { echo "  ok    $name - already linked"; return; }
        echo "  relink $name - was -> $(readlink "$target")"; run rm "$target"
    elif [ -e "$target" ]; then
        echo "  shadow $name - a real $kind is there and is what Herdr loads; left alone" >&2; return 1
    else
        echo "  link  $name -> $source"
    fi
    run mkdir -p "$(dirname "$target")"
    if [ "$kind" = folder ]; then run link_dir "$source" "$target"; else run link_file "$source" "$target"; fi
}
# Links into this repo whose source is gone.
prune() {
    local dir="$1" link target
    [ -d "$dir" ] || return 0
    for link in "$dir"/*; do
        [ -L "$link" ] || continue; target="$(readlink "$link")"
        case "$target" in "$source_root"/*) ;; *) continue ;; esac
        [ -e "$target" ] || { echo "  prune $(basename "$link") - no longer in herdr-mods/"; run rm "$link"; }
    done
}

echo "[herdr-app] $app_home"
prune "$app_home/mods"; prune "$app_home/layouts"
for dir in "$source_root"/*/; do
    [ -f "${dir}main.js" ] || continue
    place folder "${dir%/}" "$app_home/mods/$(basename "$dir")" || true
done
layouts=()
for layout in "$source_root"/layouts/*.json; do
    [ -f "$layout" ] || continue
    # Only a layout that is linked gets the switch command.
    place file "$layout" "$app_home/layouts/$(basename "$layout")" && layouts+=("$(basename "$layout" .json)")
done

# clones.json: { "<label>": { "file", "from", "version" }, ... }, one field per line.
herdr_version="$(herdr-app --version 2>/dev/null | awk '{print $NF}')" || true
for clones in "$source_root"/*/clones.json; do
    [ -f "$clones" ] || continue
    if [ -z "$herdr_version" ]; then echo "  note  herdr-app is not on PATH; clone versions not compared"; break; fi
    read_any=0
    while IFS=$'\t' read -r label from version; do
        read_any=1
        [ "$version" = "$herdr_version" ] && continue
        echo "  drift $label - copied from Herdr $version's $from; Herdr is $herdr_version. Compare the clone with the shipped file." >&2
    done < <(awk -F'"' '/^  "[^"]+": \{/ {label=$2} /"from":/ {from=$4} /"version":/ {print label "\t" from "\t" $4}' "$clones")
    [ "$read_any" -eq 1 ] || echo "  note  $clones lists no clone in the one-field-per-line form; versions not compared" >&2
done
for name in ${layouts[@]+"${layouts[@]}"}; do echo "To show it: herdr-app do layout.switch --name $name    (ctrl-shift-l cycles back)"; done
[ "$dry_run" -eq 0 ] || echo "[dry-run] nothing was linked."
