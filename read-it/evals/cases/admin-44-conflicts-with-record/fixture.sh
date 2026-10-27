#!/bin/bash
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
. "$here/../_fixture.sh"
rebuild /Volumes/T7/GitHub/just-admin-page e67bb82 "$here" 44
