# Generating a FEROX mascot

The mark in `web/assets/brand/` is a geometric icon — built to stay legible at
16px in a nav bar. A **mascot** is a different job: a character with a face and
a posture, used big on the landing page, on merch and as a social avatar. The
two should live side by side, not replace each other.

These prompts are tuned to the palette already in `ferox.css`, so whatever comes
back will sit next to the existing UI rather than fight it.

## Brand constraints to keep in every prompt

| Token | Hex | Use |
|---|---|---|
| `--ember-hi` | `#FF8A3D` | highlights, the lit side |
| `--ember` | `#FF3D2E` | the primary red |
| `--ember-lo` | `#C40F2E` | shadow, the deep side |
| `--bg` | `#07080A` | background |
| `--text` | `#F4F6FA` | any light detail |

Always ask for: **no text, no watermark, transparent or flat `#07080A`
background, 1:1, centred, strong readable silhouette.**

Always exclude: cute, chibi, fox, husky, photorealistic fur, busy background,
drop shadows, lens flare.

---

## A — Head mascot (the safe one)

> Mascot logo of a snarling grey wolf head in three-quarter view, aggressive
> sports-team style, bold thick dark outlines, flat cel-shaded vector
> illustration, limited palette of ember orange #FF8A3D, crimson #FF3D2E and
> deep crimson #C40F2E against near-black #07080A, sharp angular fur shapes,
> narrowed glowing amber eyes, bared fangs, powerful readable silhouette,
> centred, generous negative space, no text, no watermark

Best for: social avatar, app icon at large sizes, the hero of the landing page.

## B — Full-body athlete (the actual mascot)

> Full-body sports mascot character: a lean muscular anthropomorphic grey wolf
> athlete in a matte black training vest and shorts, standing in a confident
> grounded stance with arms crossed, fierce focused expression, ember orange and
> crimson accent detailing on the kit, bold clean vector cartoon style with thick
> outlines and flat cel shading, near-black background, full figure visible head
> to feet, centred, no text

Best for: the landing hero, merch, an empty-state illustration. Ask for a second
pass in a **running** and a **lifting** pose to build a small set.

## C — Crest / badge

> Circular athletic crest emblem built around a snarling wolf head, ember orange
> to crimson gradient on matte black, bold geometric linework, thin double ring
> border, subtle inner glow, team badge, vector illustration, symmetrical, high
> contrast, no text inside the badge

Best for: medals, season badges, a printed patch. Note this deliberately echoes
the original 2026 logo in `docs/logo-legacy.png`.

## D — Icon-scale variant

> Minimal geometric wolf head icon, side profile facing right, built from sharp
> angular flat planes, ember orange to crimson gradient fill, solid #07080A
> background, app icon, extremely clean, high contrast, no texture, centred,
> must stay readable at 16 pixels

Best for: a raster fallback if you ever need PNG icons. The existing SVG mark
already covers this, so only generate it if a store listing demands PNG.

---

## Dropping the result into the app

1. Save it to `web/assets/brand/mascot.png` (or `.webp` — smaller, and every
   browser FEROX targets supports it).
2. Export at **1024×1024** or larger. Transparent background if the generator
   offers it, so it works on both themes.
3. Keep it under ~300 KB. `sips -Z 1024 mascot.png` then run it through
   `cwebp -q 82` if it is heavy.
4. Add it to the `SHELL` array in `web/sw.js` so it is cached offline, and bump
   `CACHE`.
5. Reference it with explicit `width`/`height` so it does not shift the layout
   while loading.

A raster mascot is **art, not chrome** — use it big and sparingly. The SVG mark
stays responsible for the nav bar, favicon, tab bar and anywhere it renders
below about 48px, because a PNG will look soft there and a mascot's detail turns
to mud at that size.

## If you want it in SVG instead

Most generators produce raster. To get vector: generate the image, then trace it
(Illustrator Image Trace, or `potrace` on a thresholded bitmap) and clean up the
paths. Expect to redraw the face by hand — traced curves are usually too noisy
to scale down well.
