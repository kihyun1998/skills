#!/usr/bin/env bash
# Links every Herdr-app mod in herdr-mods/ into the Herdr app's home
# (${HERDR_APP_HOME:-~/.config/herdr-app}/mods/) and removes links into this repo whose source is
# gone, a layout link included. Opens a mod that keeps a window when the window shows main and the
# mod is not kept there yet; otherwise says why and prints how to open it. Never switches layouts.

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
# A path as node, a Windows program on Windows, reads it.
native() { if windows; then cygpath -w "$1"; else printf '%s\n' "$1"; fi; }
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
# Where a kept mod stands on the window: closed or open on main, noapp, nonode, nowindow,
# layout <name>, or unreadable. Open is either on screen (status "overlays") or recorded as
# kept.<layout>.<mod> in windows.json.
chip_state() {
    local name="$1" status_file state
    command -v herdr-app >/dev/null 2>&1 || { echo noapp; return; }
    command -v node >/dev/null 2>&1 || { echo nonode; return; }
    status_file="$(mktemp)"
    if ! HERDR_APP_HOME="$(native "$app_home")" herdr-app status >"$status_file" 2>/dev/null; then rm -f "$status_file"; echo nowindow; return; fi
    state="$(node -e '
        const fs = require("fs");
        const [statusFile, windowsFile, name] = process.argv.slice(1);
        let status;
        try { status = JSON.parse(fs.readFileSync(statusFile, "utf8")); } catch { status = undefined; }
        if (!status || typeof status.layout !== "string") { console.log("unreadable"); process.exit(); }
        if (status.layout !== "main") { console.log("layout " + status.layout); process.exit(); }
        if (Array.isArray(status.overlays) && status.overlays.includes(name)) { console.log("open"); process.exit(); }
        if (!fs.existsSync(windowsFile)) { console.log("closed"); process.exit(); }
        try {
            const windows = JSON.parse(fs.readFileSync(windowsFile, "utf8"));
            const kept = windows.kept === undefined ? {} : windows.kept;
            const main = kept.main === undefined ? {} : kept.main;
            if (!main || typeof main !== "object" || Array.isArray(main)) throw 0;
            console.log(Object.hasOwn(main, name) ? "open" : "closed");
        } catch { console.log("unreadable"); }
    ' "$(native "$status_file")" "$(native "$app_home/windows.json")" "$name")" || state=unreadable
    rm -f "$status_file"
    echo "$state"
}
how_to_open() {
    echo "  To open $1 once, on main: herdr-app do mod.open --name $1"
    echo "  or bind a key in keys.json, for example \"alt-shift-s\": \"mod.open:$1\". It reopens by itself after that."
}

echo "[herdr-app] $app_home"
prune "$app_home/mods"; prune "$app_home/layouts"
kept=()
for dir in "$source_root"/*/; do
    [ -f "${dir}main.js" ] || continue
    name="$(basename "$dir")"
    place "${dir%/}" "$app_home/mods/$name" || continue
    # A mod whose mod.json keeps a window.
    grep -q '"keep": *true' "${dir}mod.json" 2>/dev/null && kept+=("$name")
done
for name in ${kept[@]+"${kept[@]}"}; do
    state="$(chip_state "$name")"
    case "$state" in
        closed)
            if [ "$dry_run" -eq 1 ]; then echo "  open  $name - would open: the window shows main and $name is not open there"; continue; fi
            echo "  open  $name - the window shows main and $name is not open there"
            HERDR_APP_HOME="$(native "$app_home")" herdr-app do mod.open --name "$name" || { echo "  fail  $name - mod.open failed" >&2; how_to_open "$name"; } ;;
        open) echo "  ok    $name - already open on main" ;;
        noapp) echo "  skip  $name - herdr-app is not on PATH"; how_to_open "$name" ;;
        nonode) echo "  skip  $name - node is not on PATH, and reading windows.json needs it"; how_to_open "$name" ;;
        nowindow) echo "  skip  $name - no Herdr window answers"; how_to_open "$name" ;;
        layout*) echo "  skip  $name - the window shows the ${state#layout } layout, not main; the script does not switch"; how_to_open "$name" ;;
        *) echo "  skip  $name - windows.json or herdr-app status is not in a form this script reads"; how_to_open "$name" ;;
    esac
done
[ "$dry_run" -eq 0 ] || echo "[dry-run] nothing was linked."
