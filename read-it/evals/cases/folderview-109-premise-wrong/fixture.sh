#!/bin/bash
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
. "$here/../_fixture.sh"
rebuild /Volumes/T7/GitHub/flutter_folderview 9036ab2 "$here" 109
# What the original run also read: the parent issue, and the template's 0.3.0
# source where pub puts it. $HOME here is the run's own temporary home.
cp "$here/parent-98.md" .scratch/issues/98.md
mkdir -p "$HOME/.pub-cache/hosted/pub.dev"
cp -R /Users/parkkihyun/.pub-cache/hosted/pub.dev/flutter_example_template-0.3.0 "$HOME/.pub-cache/hosted/pub.dev/"
