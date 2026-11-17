#!/usr/bin/env bash
# Links every Herdr-app mod in herdr-mods/ into the Herdr app's home
# (${HERDR_APP_HOME:-~/.config/herdr-app}/mods/) and removes links into this repo whose source is
# gone, a layout link included. Prints how to open a mod that keeps a window, and never opens one.

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
# A folder is a junction on Windows, as in install-skills.sh; the link is checked after.
link_dir() {
    if windows; then MSYS2_ARG_CONV_EXCL='*' cmd /c mklink /J "$(cygpath -w "$2")" "$(cygpath -w "$1")" >/dev/null; else ln -s "$1" "$2"; fi
    [ -L "$2" ] || { echo "  fail  $(basename "$2") - not a link after linking" >&2; return 1; }
}
# One mod folder into mods/: linked, already linked, relinked, or a real one there left alone.
place() {
    local source="$1" target="$2" name; name="$(basename "$target")"
    if [ -L "$target" ]; then
        [ "$(readlink "$target")" = "$source" ] && { echo "  ok    $name - already linked"; return; }
        echo "  relink $name - was -> $(readlink "$target")"; run rm "$target"
    elif [ -e "$target" ]; then
        echo "  shadow $name - a real folder is there and is what Herdr loads; left alone" >&2; return 1
    else
        echo "  link  $name -> $source"
    fi
    run mkdir -p "$(dirname "$target")"
    run link_dir "$source" "$target"
}
# Links into this repo whose source is gone. A pruned layout may be the one the window shows.
prune() {
    local dir="$1" link target
    [ -d "$dir" ] || return 0
    for link in "$dir"/*; do
        [ -L "$link" ] || continue; target="$(readlink "$link")"
        case "$target" in "$source_root"/*) ;; *) continue ;; esac
        [ -e "$target" ] && continue
        echo "  prune $(basename "$link") - no longer in herdr-mods/"; run rm "$link"
        case "$link" in */layouts/*.json) echo "        If the window shows the $(basename "$link" .json) layout, switch to main: herdr-app do layout.switch --name main" ;; esac
    done
}

echo "[herdr-app] $app_home"
prune "$app_home/mods"; prune "$app_home/layouts"
kept=()
for dir in "$source_root"/*/; do
    [ -f "${dir}main.js" ] || continue
    name="$(basename "$dir")"
    place "${dir%/}" "$app_home/mods/$name" || continue
    # A mod whose mod.json keeps a window is opened once by the person.
    grep -q '"keep": *true' "${dir}mod.json" 2>/dev/null && kept+=("$name")
done
for name in ${kept[@]+"${kept[@]}"}; do
    echo "To open $name once, on the layout it should show on: herdr-app do mod.open --name $name"
    echo "  or bind a key in keys.json, for example \"alt-shift-s\": \"mod.open:$name\". It reopens by itself after that."
done
[ "$dry_run" -eq 0 ] || echo "[dry-run] nothing was linked."
