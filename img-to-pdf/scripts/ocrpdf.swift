// ocrpdf.swift — build a SEARCHABLE PDF from images using macOS Vision OCR.
// Each page = the original image with an invisible, selectable/searchable text
// layer on top. macOS only (uses the Vision framework). Vision reads JPEG/PNG/
// HEIC/TIFF/etc. directly, so no pre-conversion is needed.
//
// Usage: ocrpdf <out.pdf> <img1> <img2> ...
import Foundation
import Vision
import CoreGraphics
import CoreText
import ImageIO
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: ocrpdf <out.pdf> <img...>\n".data(using: .utf8)!)
    exit(2)
}
let outPath = args[1]
let imagePaths = Array(args.dropFirst(2))

func loadCGImage(_ path: String) -> CGImage? {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
    return img
}

// Recognize text, returns observations (normalized boundingBox, bottom-left origin).
func recognize(_ cg: CGImage) -> [VNRecognizedTextObservation] {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    req.recognitionLanguages = ["ko-KR", "en-US"]
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([req]) } catch {
        FileHandle.standardError.write("OCR error: \(error)\n".data(using: .utf8)!)
        return []
    }
    return req.results ?? []
}

let outURL = URL(fileURLWithPath: outPath)
var mediaBox = CGRect.zero
guard let ctx = CGContext(outURL as CFURL, mediaBox: &mediaBox, nil) else {
    FileHandle.standardError.write("cannot create PDF context\n".data(using: .utf8)!)
    exit(1)
}

var pageCount = 0
var totalLines = 0
for path in imagePaths {
    guard let cg = loadCGImage(path) else {
        FileHandle.standardError.write("skip (cannot load): \(path)\n".data(using: .utf8)!)
        continue
    }
    let w = CGFloat(cg.width), h = CGFloat(cg.height)
    var box = CGRect(x: 0, y: 0, width: w, height: h)
    let obs = recognize(cg)

    ctx.beginPage(mediaBox: &box)
    // draw the page image
    ctx.draw(cg, in: box)

    // overlay invisible text per recognized line (clear color = selectable but unseen)
    for o in obs {
        guard let cand = o.topCandidates(1).first else { continue }
        let s = cand.string
        if s.isEmpty { continue }
        let bb = o.boundingBox // normalized, bottom-left origin
        let rect = CGRect(x: bb.origin.x * w, y: bb.origin.y * h,
                          width: bb.size.width * w, height: bb.size.height * h)
        if rect.width <= 1 || rect.height <= 1 { continue }

        let fontSize = max(rect.height * 0.8, 4)
        let font = CTFontCreateWithName("Helvetica" as CFString, fontSize, nil)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: font,
            .foregroundColor: NSColor.clear.cgColor
        ]
        let attr = NSAttributedString(string: s, attributes: attrs)
        let line = CTLineCreateWithAttributedString(attr)
        let measured = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
        let scaleX = measured > 0 ? rect.width / measured : 1.0

        ctx.saveGState()
        ctx.textMatrix = CGAffineTransform(scaleX: scaleX, y: 1.0)
        ctx.textPosition = CGPoint(x: rect.origin.x, y: rect.origin.y + rect.height * 0.15)
        CTLineDraw(line, ctx)
        ctx.restoreGState()
        totalLines += 1
    }
    ctx.endPage()
    pageCount += 1
}

ctx.closePDF()
print("Created: \(outPath) (\(pageCount) pages, \(totalLines) text lines)")
