---
name: img-to-pdf
disable-model-invocation: true
description: "Combine images into one PDF, searchable by default (macOS OCR, Korean and English), or a plain image PDF with --image-only. /img-to-pdf."
---

# img-to-pdf

Turn images into one PDF using the bundled script. Pages follow **natural sort** order (`2.jpg` before `10.jpg`).

Two modes:
- **Searchable PDF (default)** — page image + an invisible, selectable/searchable text layer via **macOS Vision OCR** (ko + en). The page looks identical to the photo, but you can select, copy, and Cmd+F the text. *macOS only.*
- **Image-only** (`--image-only`) — JPEG/PNG embedded **losslessly** (no text layer, no macOS dependency).

## Quick start

```bash
# Searchable PDF (default) -> <folder>/output.pdf
bash scripts/img2pdf.sh path/to/folder

# Custom output path
bash scripts/img2pdf.sh path/to/folder -o ~/Desktop/result.pdf

# Plain lossless image PDF (no OCR)
bash scripts/img2pdf.sh path/to/folder --image-only

# Explicit files, in the exact order given
bash scripts/img2pdf.sh a.jpg b.png c.heic -o out.pdf
```

## How to use

1. **Identify the input.** A directory → all images inside it, natural-sorted. A list of files → kept in the user's given order.
2. **Pick the mode.** Default = searchable (OCR). Add `--image-only` only when the user explicitly wants a picture-only PDF or is not on macOS.
3. **Run the script** (see Quick start). It prints the output path and page count (and OCR line count in searchable mode).
4. **Verify** from what the script printed and what the PDF holds, without opening it:
   - the page count it printed matches the number of images given;
   - in searchable mode, the OCR line count is above 0 for pages that carry text, and the PDF's text layer holds the text, Korean included. Read the layer with a tool the machine has: `pdftotext <out.pdf> -` where poppler is installed, or else PDFKit through the Swift that OCR mode already needs, `swift -e 'import PDFKit; let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!; print(d.pageCount); print(d.string ?? "")' <out.pdf>`.

   Opening the PDF in Preview takes the person's screen, so offer it and run `open <out.pdf>` only when they say yes.

## What the script handles

- **OCR (default)** — macOS Vision, languages `ko-KR` + `en-US`, accurate level. Vision reads JPEG/PNG/HEIC/TIFF directly (no pre-conversion). The Swift helper (`scripts/ocrpdf.swift`) is compiled **once** and cached at `~/.cache/img-to-pdf/ocrpdf`. Requires macOS + `swiftc` (Xcode command line tools).
- **Image-only** — `img2pdf` from PATH if present, else auto-installed into a cached venv at `~/.cache/img-to-pdf-venv`. HEIC/HEIF/WEBP are pre-converted to PNG via macOS `sips`.
- **Natural sort** — folder input ordered with `sort -V`, so `1,2,…,10` not `1,10,2`.
- **Supported extensions** — jpg, jpeg, png, heic, heif, webp, tif, tiff, gif, bmp.

## Notes

- On non-macOS (or without `swiftc`), OCR mode errors with a hint; use `--image-only`.
- See `scripts/img2pdf.sh -h` for the full usage text.
