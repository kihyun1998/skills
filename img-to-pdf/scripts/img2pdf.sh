#!/usr/bin/env bash
# img2pdf.sh — combine a folder of images (or a list of image files) into one
# PDF, in natural-sort order.
#
# DEFAULT: a SEARCHABLE PDF — each page is the original image with an invisible,
# selectable/searchable text layer from macOS Vision OCR (Korean + English).
# Use --image-only for a plain lossless image PDF (no text layer, no macOS deps).
#
# Usage:
#   img2pdf.sh <dir>                  # searchable PDF -> <dir>/output.pdf
#   img2pdf.sh <dir> -o out.pdf       # custom output path
#   img2pdf.sh a.jpg b.png c.heic     # explicit files, in the given order
#   img2pdf.sh <dir> --image-only     # plain lossless image PDF (no OCR)
#
# Notes:
#   - OCR (default) is macOS-only (Vision framework + swiftc). Vision reads
#     JPEG/PNG/HEIC/TIFF directly — no pre-conversion needed. The OCR helper is
#     compiled once and cached at ~/.cache/img-to-pdf/ocrpdf.
#   - --image-only embeds JPEG/PNG losslessly via img2pdf (auto-installed into a
#     cached venv if absent); HEIC/HEIF/WEBP are pre-converted via macOS sips.

set -euo pipefail

OUT=""
MODE="ocr"          # ocr (default) | image
ARGS=()
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- parse args ----------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output) OUT="${2:-}"; shift 2 ;;
    --image-only|--no-ocr) MODE="image"; shift ;;
    --ocr) MODE="ocr"; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | sed '1d'
      exit 0 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done

if [[ ${#ARGS[@]} -eq 0 ]]; then
  echo "error: no input given. Pass a directory or image files." >&2
  exit 1
fi

# --- collect input files (natural-sorted) -------------------------------------
IMG_EXT_RE='\.(jpe?g|png|heic|heif|webp|tiff?|gif|bmp)$'
FILES=()

if [[ ${#ARGS[@]} -eq 1 && -d "${ARGS[0]}" ]]; then
  DIR="${ARGS[0]%/}"
  while IFS= read -r f; do
    [[ -n "$f" ]] && FILES+=("$f")
  done < <(find "$DIR" -maxdepth 1 -type f | grep -iE "$IMG_EXT_RE" | sort -V)
  [[ -z "$OUT" ]] && OUT="$DIR/output.pdf"
else
  for f in "${ARGS[@]}"; do
    [[ -f "$f" ]] || { echo "error: not a file: $f" >&2; exit 1; }
    FILES+=("$f")
  done
  [[ -z "$OUT" ]] && OUT="output.pdf"
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "error: no images found." >&2
  exit 1
fi

# ==============================================================================
# OCR mode (default): searchable PDF via macOS Vision
# ==============================================================================
if [[ "$MODE" == "ocr" ]]; then
  if [[ "$(uname)" != "Darwin" ]]; then
    echo "error: OCR mode is macOS-only. Re-run with --image-only on this platform." >&2
    exit 1
  fi
  if ! command -v swiftc >/dev/null 2>&1; then
    echo "error: swiftc not found (install Xcode command line tools: xcode-select --install)." >&2
    echo "       Or run with --image-only for a plain image PDF." >&2
    exit 1
  fi

  CACHE="$HOME/.cache/img-to-pdf"
  BIN="$CACHE/ocrpdf"
  SRC="$SELF_DIR/ocrpdf.swift"
  mkdir -p "$CACHE"
  # (re)compile if the binary is missing or older than the source
  if [[ ! -x "$BIN" || "$SRC" -nt "$BIN" ]]; then
    echo "compiling OCR helper (one-time) ..." >&2
    swiftc -O "$SRC" -o "$BIN"
  fi

  "$BIN" "$OUT" "${FILES[@]}"
  exit 0
fi

# ==============================================================================
# image-only mode: lossless image PDF via img2pdf
# ==============================================================================
# resolve img2pdf
IMG2PDF=""
if command -v img2pdf >/dev/null 2>&1; then
  IMG2PDF="img2pdf"
else
  VENV="$HOME/.cache/img-to-pdf-venv"
  if [[ ! -x "$VENV/bin/img2pdf" ]]; then
    echo "img2pdf not found — setting up a cached venv at $VENV ..." >&2
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install -q --upgrade pip >/dev/null 2>&1 || true
    "$VENV/bin/pip" install -q img2pdf
  fi
  IMG2PDF="$VENV/bin/img2pdf"
fi

# convert HEIC/HEIF/WEBP to PNG (img2pdf can't embed them)
TMPDIR_CONV=""
cleanup() { [[ -n "$TMPDIR_CONV" ]] && rm -rf "$TMPDIR_CONV"; return 0; }
trap cleanup EXIT

PREPPED=()
idx=0
for f in "${FILES[@]}"; do
  ext="${f##*.}"
  shopt -s nocasematch
  if [[ "$ext" =~ ^(heic|heif|webp)$ ]]; then
    if ! command -v sips >/dev/null 2>&1; then
      echo "error: '$f' needs conversion but macOS 'sips' is unavailable." >&2
      exit 1
    fi
    [[ -z "$TMPDIR_CONV" ]] && TMPDIR_CONV="$(mktemp -d)"
    out_png="$TMPDIR_CONV/$(printf '%04d' "$idx").png"
    sips -s format png "$f" --out "$out_png" >/dev/null
    PREPPED+=("$out_png")
  else
    PREPPED+=("$f")
  fi
  shopt -u nocasematch
  idx=$((idx + 1))
done

"$IMG2PDF" "${PREPPED[@]}" -o "$OUT"
echo "Created: $OUT (${#FILES[@]} pages)"
