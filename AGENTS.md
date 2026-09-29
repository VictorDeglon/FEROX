# AGENTS.md — working on FEROX

FEROX is a free workout, nutrition and progress tracker. This file is the brief
for any agent (or human) picking the project up. Read it before changing code.

## The one rule that shapes everything

**The web app must keep working with no backend, no build step and no network.**

`web/` is plain HTML + ES modules + CSS. It is deployed straight to GitHub Pages
and must run correctly when opened from a static host with the API switched off.
Anything that breaks that — a bundler, a framework, a mandatory API call, a
server-rendered template — is the wrong change for this repo.

The server in `server/` is *optional*. It adds verified Google sign-in and a log
that follows you between devices. It must never become required.

## Layout

```
web/                     the app — this is what GitHub Pages serves
  index.html             landing page
  {dashboard,workouts,nutrition,progress,seasons,records,medals,friends,profile}.html
  404.html  sw.js  manifest.webmanifest  .nojekyll
  assets/brand/          logo.svg, wolf.svg, mark.svg, favicon.svg, maskable.svg
  assets/css/ferox.css   the whole design system, token-driven
  assets/js/core/        config, store, auth, ui, chart, icons, seed,
                         seasons (the training year), season-icons (animated SVG)
  assets/js/pages/       one module per page + _log.js (shared session editor)
server/                  optional Express API
  index.js               app + static host        static.js  no-API dev server
  config.js  lib/{auth,store}.js  routes/{auth,data}.js
test/                    node:test suites (no runner to install)
scripts/check-web.js     link checker for web/
scripts/add-mascot.js    wires a generated mascot image into the app
docs/google-oauth-setup.md
docs/mascot-prompts.md   image-gen prompts matched to the brand palette
```

## Conventions

- **ES modules everywhere.** `package.json` is `"type": "module"`. No CommonJS,
  no transpiler. Node 20+.
- **No runtime dependencies in `web/`.** Icons, charts and the design system are
  all in-repo. The only external requests are Google Fonts and, when you
  configure it, Google Identity Services.
- **All colour goes through CSS custom properties** defined on `:root` in
  `ferox.css`, with the light theme remapping the same tokens under
  `[data-theme='light']`. Never hard-code a hex value in a page or a module.
- **Every read and write of athlete data goes through `core/store.js`.** Pages
  do not touch `localStorage` or `fetch` directly. That indirection is what lets
  the same UI run against local storage, the API, or a future native shell.
- **Escape anything interpolated into HTML** with `esc()` from `core/ui.js`.
  Pages build markup with template strings, so this is the XSS boundary.
- **Declare module-level `const`s above the `bootPage()` call.** `bootPage`
  now defers its first paint to a macrotask precisely so a const below it is not
  read while still in the temporal dead zone — but keeping declarations above the
  call is clearer, and it is how every page is written.

## Commands

```bash
npm install        # only needed for the server and tests
npm run web        # static server on :5173 — exactly what Pages will serve
npm start          # API + web on :4000
npm run dev        # same, with --watch
npm test           # node:test, 24 suites, no network
npm run check      # syntax check + web/ link checker
```

Run `npm test && npm run check` before committing. Both are fast and both run in CI.

## Data model

One document per athlete, defined in `core/store.js` (`emptyData()`):

```js
{ version, profile: { name, handle, unit, heightCm, goals: {...} },
  sessions: [{ id, date, name, durationMin, entries: [{ ex, sets: [{reps, weight}] }] }],
  meals:    [{ id, date, meal, foodId, name, qty, kcal, p, c, f }],
  weights:  [{ date, kg }],
  medals:   ['m-first', ...],
  friends:  [{ id, name, handle, streak, sessions, volume, medals }],
  seasons:  { summer: 'greek-fire', winter: 'winter-fire', ... } }
```

Everything else — streaks, volume, personal records, medal eligibility, the
charts — is **derived** from that document at read time. Do not persist
derived values; add a getter to `Store` instead.

`core/seed.js` holds the shared catalogue (exercises, routines, foods, medals).
The server imports the same file, so it is the single source of truth.

## Adding things

- **An exercise or food:** append to the arrays in `core/seed.js`. The tests
  check ids are unique, muscles and units are known, and food macros roughly
  match their calories.
- **A medal:** add to `MEDALS` with a `test(stats)` predicate, and add its
  progress pair to `progressFor()` in `pages/medals.js` so the locked card shows
  a bar. Tests assert no medal is earned on an empty log and all are reachable.
- **A page:** create `web/<name>.html` from an existing one, add
  `assets/js/pages/<name>.js`, add an entry to `NAV` in `core/ui.js`, and add
  the files to `SHELL` in `sw.js`.
- **A chart:** add a pure string-builder to `core/chart.js`. It must escape its
  labels and return a sensible message for empty input — both are tested.
- **A season:** add it to `SEASONS` in `core/seasons.js` with the blocks it is
  eligible for, an accent pair, and an `icon` that exists in
  `core/season-icons.js`. Tests assert every field is present, the time split
  totals 100, the icon renders with an animated part, and gradient ids stay
  unique. A season eligible for all four blocks is treated as year-round.

## Seasons

The year is four blocks — spring and autumn are two months, summer and winter
are four. A season's calendar window is *derived* from the blocks it lists in
`slots`, so dates and eligibility cannot drift apart. `FEROX Recomp` lists all
four, which is exactly what makes it the year-round default.

A test asserts the four blocks tile all 365 days with no gap and no overlap, so
`currentSlot()` always resolves. The winter block wraps the new year (Nov 1 →
Mar 1); `slotContains` handles that and is tested on both sides of the wrap.

Season icons are animated SVGs. Their keyframes live in `ferox.css` under
`.fx-*`, never inline, so the global `prefers-reduced-motion` block switches
every one of them off in one place. The same applies to the `.glow-*` effects.

## Brand art

`web/assets/brand/` holds the SVG mark in five forms. It is responsible for the
nav bar, favicon, tab bar and anything under ~48px.

`mascot.webp` / `mascot.png` is the illustrated mascot — art, not chrome. Add or
replace it with `node scripts/add-mascot.js <image>`, which unwraps an
SVG-wrapped raster (what image generators usually hand you), trims transparent
padding, caps the long edge at 1024, encodes a WebP with lossless alpha,
registers both in the service worker and bumps the cache. The landing and 404
pages probe for it at runtime via `firstImage()` in `core/ui.js`, so there is
never a broken `<img>` when no mascot is present.

**Use the mascot big and sparingly, and never below ~48px.** Measured: it is
sharp at 128 and 64px, mushy at 32 and illegible at 20, where the SVG mark stays
crisp. The mark owns the nav bar, favicon, tab bar and topbar; the mascot owns
the closing panel, the 404 page and the share card. Prompts that match the
palette are in `docs/mascot-prompts.md`.

`og.jpg` is the 1200×630 social share card. It must stay a **raster referenced
by an absolute URL** — Slack, Discord, X and iMessage all silently ignore an SVG
`og:image`, which is what this used to be. Regenerate it whenever the mascot or
the tagline changes.

## Auth

`config.googleClientId` ships as a placeholder. `googleReady()` gates the UI, so
an unconfigured deployment shows a disabled Google button and the guest path
rather than a broken one. See `docs/google-oauth-setup.md`.

In static mode the Google ID token is decoded **for display only** and is never
treated as proof of identity — there is nothing to protect, since the data is
device-local. When `apiBase` is set, the token is verified server-side against
Google's keys and exchanged for a FEROX session. Keep that distinction intact.

## Scope

These instructions apply to the whole repository.
