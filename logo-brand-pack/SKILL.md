---
name: logo-brand-pack
description: Turn approved master logo artwork into a repository-ready brand asset pack. Use when a finalized logo needs transparent PNGs, SVGs, light/dark variants, project icons, favicons, README banners, social previews, or horizontal lockups; preserve the original logo geometry and identity.
---

# Logo Brand Pack

Create a production-ready `brand/` directory from approved master artwork.

## Input

Identify the master logo and the **project name** before creating assets. The project name is required: it supplies every `{project}` filename and the lockup wordmark. Use the name explicitly supplied by the user.

If the project name is missing, ask one concise question before writing anything: “What project name should I use for the asset directory, filenames, and lockup?” Do not derive it from the current repository name; a repository may be a collection of unrelated brand packs. If no usable approved artwork is available, ask for it before creating assets.

Treat the supplied logo as master artwork. Preserve its geometry, proportions, silhouette, spacing, negative space, alignment, and visual identity. Use the supplied vector or raster directly; do not recreate an existing logo from a text prompt. Prefer deterministic vector/image processing. A small-icon simplification is permitted only when technically necessary for legibility and must retain the original identity.

## Visual system

Default to monochrome: black or near-black for light surfaces, white for dark surfaces, and neutral gray only when technically necessary. Add colour, gradients, shadows, glow, texture, 3D effects, decoration, or new symbol elements only when the user requests them.

Read [the asset specification](references/asset-spec.md) before producing assets.

## Deliverables

Use lowercase, hyphenated filenames with `{project}` replaced by the project name:

```text
brand/
├── README.md
├── svg/
│   ├── {project}-symbol-black.svg
│   ├── {project}-symbol-white.svg
│   ├── {project}-logo-light.svg
│   ├── {project}-logo-dark.svg
│   ├── {project}-lockup-black.svg
│   └── {project}-lockup-white.svg
├── png/
│   ├── {project}-symbol-black.png
│   ├── {project}-symbol-white.png
│   ├── {project}-logo-light.png
│   ├── {project}-logo-dark.png
│   ├── {project}-lockup-black.png
│   └── {project}-lockup-white.png
├── icons/
│   └── {project}-icon-{light|dark}-{size}.png
├── readme/
│   ├── {project}-readme-light.png
│   └── {project}-readme-dark.png
├── social/
│   ├── {project}-social-light.png
│   └── {project}-social-dark.png
└── favicon/
    ├── favicon-16.png
    ├── favicon-32.png
    ├── favicon-48.png
    └── favicon.ico
```

For a single-project repository, create this at `brand/`. When the destination repository is a multi-brand collection, create the self-contained pack at `brand/{project}/` instead.

The symbol files are the standalone mark. Light/dark logo files are artwork suitable for their named background. Horizontal lockups combine the unmodified symbol with the project name. README banners and social previews use the same minimal horizontal composition with generous whitespace. Create both light and dark square icon variants at every standard size.

SVGs must contain scalable vector geometry when the master is vector; never wrap an available raster inside an SVG. PNGs with no intentional background must have real alpha transparency, clean antialiasing, and no matte fringe. Render each size from the best master source rather than repeatedly upscaling a smaller export.

## Validate and document

Before delivery, inspect the outputs to confirm:

- the master artwork is uncropped and undistorted;
- transparent PNGs contain alpha;
- light/dark assets remain legible on their intended backgrounds;
- SVGs render and are vector where possible;
- icon padding and aspect ratios are consistent, including recognizable 16 px and 32 px icons;
- banner and social-preview dimensions and readability are correct; and
- filenames and output structure match this skill.

When practical, add a contact sheet for visual review. Create `brand/README.md` identifying light and dark usage, the recommended README banner, favicon files, social-preview files, and the rule not to distort or recolour the mark. Package `{project}-brand-pack.zip` only when useful or requested.
