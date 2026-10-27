#!/bin/bash
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
. "$here/../_fixture.sh"
rebuild /Volumes/T7/GitHub/x509_cert_store 1b63caa "$here" 43
