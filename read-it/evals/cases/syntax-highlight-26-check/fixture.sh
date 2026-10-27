#!/bin/bash
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
. "$here/../_fixture.sh"
rebuild /Volumes/T7/GitHub/flutter_syntax_highlight e51c35d "$here" 26
