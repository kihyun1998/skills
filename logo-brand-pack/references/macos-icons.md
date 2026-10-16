# macOS app icons

## Default output: static app icons

Every brand pack includes light and dark macOS app icons. Keep these separate from the general square icons in `icons/`. Under the pack's `macos/` directory, produce:

- `{project}-macos-light-1024.png` and `{project}-macos-dark-1024.png`: RGBA masters for the static workflow.
- `{project}-macos-light.iconset/` and `{project}-macos-dark.iconset/`: complete named representations below.
- `{project}-macos-light.icns` and `{project}-macos-dark.icns`: actual multi-resolution ICNS containers built from their respective iconsets.

The two appearances are separate selectable assets; a pair of ICNS files does not automatically switch with system appearance. Document which file to install, with light as the default unless the project specifies otherwise.

## Shape and composition

Use Apple's app icon production template appropriate to the static macOS target for the rounded-square container, optical scale, and transparent outer margin. Consult [Apple Design Resources](https://developer.apple.com/design/resources/) and the [app icon HIG](https://developer.apple.com/design/human-interface-guidelines/app-icons) at production time. Use the pre-Tahoe/static export when exporting a legacy-compatible icon from Icon Composer.

Place the approved symbol inside the container, preserving its silhouette and negative space. Default to a white container with a black symbol for light and a near-black container with a white symbol for dark. The platform container and transparent outside padding are part of the app icon composition. Follow the template's geometry rather than assigning an arbitrary rounded-rectangle radius or treating the general icon padding percentage as a macOS specification. If the official template cannot be obtained, document the approximation and avoid claiming exact template conformance.

Keep the source symbol unchanged. Add no decorative effects by default; apply platform rendering effects only through the chosen Apple workflow. Judge the symbol's optical size inside the container and the container's size against neighboring Dock icons separately.

## Static iconset representations

Render each representation from the best master source. Names below are required by the iconset format and are exceptions to project-prefixed filenames.

| Filename | Pixel dimensions |
| --- | --- |
| `icon_16x16.png` | 16 × 16 |
| `icon_16x16@2x.png` | 32 × 32 |
| `icon_32x32.png` | 32 × 32 |
| `icon_32x32@2x.png` | 64 × 64 |
| `icon_128x128.png` | 128 × 128 |
| `icon_128x128@2x.png` | 256 × 256 |
| `icon_256x256.png` | 256 × 256 |
| `icon_256x256@2x.png` | 512 × 512 |
| `icon_512x512.png` | 512 × 512 |
| `icon_512x512@2x.png` | 1024 × 1024 |

Use `iconutil -c icns <path-to.iconset> -o <path-to.icns>` on macOS. On other platforms, use an ICNS encoder that supports the required resolutions and inspect its decoded contents. Renaming a PNG to `.icns` is not packaging. If encoding is unavailable, deliver the complete iconsets and an exact conversion command, and explicitly report the missing ICNS deliverable.

Source: [Apple — Optimizing for High Resolution](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html).

## Icon Composer workflow

When the user requests a modern layered icon or the consuming app uses Icon Composer, additionally prepare named foreground layers on a 1024 × 1024 canvas. Use genuine SVG geometry where available or transparent PNG layers from a raster master. Leave layers square and unmasked: the system applies the final rounded corners. Keep blurs, shadows, specular highlights, and translucency out of the input artwork; configure those in Icon Composer. Configure background colors there as well.

Save layers under `macos/composer/`. Include a real `.icon` document when Icon Composer is available and validate its appearances there. Otherwise label the output as Composer input layers and document the remaining import step; do not present them as a completed `.icon`. Retain the default static deliverables unless the user explicitly requests Composer-only output.

The pre-rounded static PNG and unmasked Composer layers are different inputs. Use each with its intended workflow to avoid applying corner masks or padding twice.

Source: [Apple — Creating your app icon using Icon Composer](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer).

## Validation

- Check both appearances against light and dark surroundings: transparent margins, uncropped silhouette, template alignment, and consistent optical size.
- Inspect the 16 px and 32 px representations at native size as well as a larger preview.
- Check all ten iconset filenames, their pixel dimensions, and RGBA transparency outside the container.
- Decode each ICNS and check representations at 16, 32, 64, 128, 256, 512, and 1024 px. Repeated pixel dimensions in the iconset may share an ICNS representation.
- On macOS, preview the installed icon in Finder or the Dock when available. Otherwise report that this native visual check was not run.
- Document the selected template/workflow and any unavailable deliverables in the pack README.
