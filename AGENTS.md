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
  assets/brand/          logo.svg, wolf.svg, mark.svg, favicon.svg, maskable.png
  assets/css/ferox.css   the whole design system, token-driven
  assets/js/core/        config, store, auth, ui, chart, icons, seed,
                         seasons + season-icons (the training year),
                         profile (calorie maths), split (week builder),
                         metabolism (measured maintenance + checkpoints),
                         plan (what the two of those say together),
                         themes (palettes), eggs (the secret console),
                         research (study summaries), image (avatar resizing)
  assets/js/pages/       one module per page + _log.js (shared session editor),
                         _readiness.js (daily check-in), _weighin.js (weigh-ins)
server/                  optional Express API
  index.js               app + static host        static.js  no-API dev server
  config.js  lib/{auth,store}.js  routes/{auth,data}.js
test/                    node:test suites (no runner to install)
scripts/check-web.js     link checker for web/
scripts/add-mascot.js    wires a generated mascot image into the app
scripts/make-icons.js    derives every square app icon from the mascot
scripts/lib/png.js       a very small PNG decode/resize/pad/encode, no deps
docs/google-oauth-setup.md
docs/skywalker-deploy.md tunnelled self-hosting for the optional API
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
  `[data-theme='light']` and each palette remapping them again under
  `[data-palette='<id>']`. Never hard-code a hex value in a page or a module —
  a literal colour is a colour that will be wrong in three of the four themes.
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
npm test           # node:test, ~106 checks, no network
npm run check      # syntax check + web/ link checker
```

Run `npm test && npm run check` before committing. Both are fast and both run in CI.

## Data model

One document per athlete, defined in `core/store.js` (`emptyData()`), currently
at **version 3**:

```js
{ version, profile: { name, handle, unit, heightCm, weightKg, goals: {...} },
  onboarded, layout, planStart,
  sessions: [{ id, date, name, durationMin, entries: [{ ex, sets: [{reps, weight}] }] }],
  meals:    [{ id, date, meal, foodId, name, qty, kcal, p, c, f }],
  weights:  [{ date, kg }],
  checkIns: [{ id, date, weightKg, bodyFat, leanKg, waistCm, restingHr, sleepH, energy, note }],
  customFoods: [{ id, name, per, kcal, p, c, f, custom: true }],
  water:    { '2026-09-29': 2000 },        // millilitres per day
  readiness:{ '2026-09-29': 8 },           // 1-10 per day
  medals:   ['m-first', ...],
  friends:  [{ id, name, handle, streak, sessions, volume, medals }],
  seasons:  { summer: 'greek-fire', winter: 'winter-fire', ... },
  settings: { weighInEvery, checkpointEvery, palette, lastWeighInPrompt },
  unlocks:  ['theme-pack', ...] }
```

Everything else — streaks, volume, personal records, medal eligibility, the
charts, the metabolism estimate — is **derived** from that document at read
time. Do not persist derived values; add a getter to `Store` instead.

**`weights` stays the single source of truth for bodyweight.** A check-in is a
richer way of writing the same fact, so `logCheckIn` mirrors its weight into
`weights` and into `profile.weightKg`. Never write a bodyweight to one and not
the others.

**The server must agree with `emptyData()`.** `server/lib/store.js` has its own
copy of the shape and `test/store.test.js` asserts the two have not drifted —
an account that looks different depending on whether an API happens to be
running is the bug that test exists to catch. The API's `PUT /api/data` keeps
the *whole* document and only coerces the collections it knows about; it used
to rebuild from a whitelist, which silently deleted onboarding, seasons and
readiness on every save.

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

## Onboarding and the plan

A new account starts genuinely empty — there is no demo data. `bootPage` sends
anyone without `data.onboarded` to `onboarding.html`, which collects name, sex,
age, height, weight, goal, experience, days per week, activity and equipment,
then writes a real plan.

`core/profile.js` owns the maths: Mifflin–St Jeor for BMR, an activity
multiplier for maintenance, a per-season calorie shift and protein per kg.
**The deficit is floored** so intake never drops below resting expenditure or
the conventional 1,200/1,500 kcal minimum — a percentage cut applied to a small
sedentary person otherwise lands near 1,080 kcal, which is not a number to
prescribe. There is a test for it.

`core/split.js` builds the week. Two rules it must keep:
1. Every major muscle group is trained **2–3 times a week**, at every day count.
2. Week one runs ~15% above steady state and settles by week four.
Both are tested. It also filters exercises by equipment and by the joints
someone listed as problems, and backfills a session if those filters leave it
too thin.

`_readiness.js` asks how today feels, 1–10, and scales sets and load. A wrecked
day loses about half the volume; a primed day gains a set and a finisher.

## Weigh-ins, metabolism and checkpoints

`_weighin.js` asks for a weigh-in on a schedule the athlete sets in their
profile — **every other day** by default, `0` to turn it off. `weighInDue()`
decides; `lastWeighInPrompt` makes sure a dismissal is not re-asked the same
day. Weight is the only required field, and that is deliberate: someone with a
tape measure and no calipers must not be blocked from logging a waist.

`core/metabolism.js` is the maths, and it is pure — it takes the data document
and returns numbers, so it is tested in node with no DOM. Four things matter:

1. **The trend is a regression, not first-minus-last.** Bodyweight swings a kilo
   on water alone, so two endpoints can show a gain across a fortnight of real
   loss. `weightTrend()` fits a least-squares slope through every reading.
2. **Maintenance is measured, not predicted, once there is data.** `energy out =
   energy in − energy stored`, at 7,700 kcal per kg. It needs 14 days of
   weigh-ins and 8 logged food days before it will say anything at all, it is
   clamped to ±30% of the Mifflin prediction, and a low-confidence estimate is
   blended back toward that prediction. **Never let it answer with confidence it
   has not earned** — a confidently wrong calorie target is worse than "not yet".
3. **Adherence scales everything.** A 500 kcal deficit kept half the time is a
   250 kcal deficit, and the checkpoints are built from the scaled figure.
4. **Checkpoints are recomputed on every read, never frozen.** A goal set six
   weeks ago from a metabolism estimate that has since been corrected should not
   still be the goal.

`core/plan.js` is the thin layer where the prediction and the measurement meet,
so the dashboard, progress and nutrition pages all read the same numbers instead
of each computing their own slightly different version.

**Adjustments are always offered, never applied.** `suggestAdjustment` caps a
single checkpoint's correction at 250 kcal and rounds it to something a person
can act on. Someone who set their calories deliberately must not find them
quietly rewritten because a fortnight of data disagreed.

## Themes and the secret console

Two independent axes. `data-theme` on `<html>` is still just `dark` or `light`,
so every existing `[data-theme='light']` rule works untouched; `data-palette`
rides alongside and remaps the same tokens. That is why three extra palettes
cost a block of CSS rather than a rewrite.

Palettes other than `ember` are **locked**. They unlock from `core/eggs.js` —
a hidden prompt opened with the backtick key, or five taps on the page title in
the top bar. (Not the wolf mark beside it: that mark is a link to the dashboard,
so the first tap would navigate away before the fifth landed.) Phrase matching
ignores case, spaces and punctuation, so someone half-remembering a code from a
friend still gets in. Unlocks live on the athlete's document, so they follow a
signed-in account between devices.

Adding a palette means adding it to `PALETTES` in `core/themes.js` *and* adding
both `[data-palette='<id>']` and `[data-palette='<id>'][data-theme='light']`
blocks to `ferox.css`. A test asserts both exist for every palette.

## Destructive actions

There are two, and both demand a typed phrase rather than a click:

- **Full reset** (`store.resetProgress()`) — clears sessions, meals, medals,
  readiness, water and custom foods, and restarts the plan clock. Keeps
  measurements, the training year, friends, settings and unlocks. The split is
  the point: numbers you *earned* go, numbers you *are* stay.
- **Erase everything** (`store.reset()`) — empties the account and sends you
  back through onboarding.

`RESET_CLEARS` and `RESET_KEEPS` are exported from `core/store.js` and the
dialog renders them directly, so the list someone reads cannot drift from what
the code does. There is no undo and, on a static deployment, no server-side copy
to restore from — which is the whole reason for the typed phrase.

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

**The square icons are fitted, never cropped.** `icon.*`, `apple-touch-icon`,
`favicon-32` and `maskable` are all derived from the mascot by
`node scripts/make-icons.js`, which pads the head into a square rather than
cutting it to one. They used to be centre crops, which took the wolf's ears off
the top and its ruff off the sides at every size in the app — the head is
portrait, the icon is square, and cropping is the one operation that cannot
square a portrait without losing something. Re-run that script whenever the
mascot changes, and bump `CACHE` in `sw.js` so installed clients pick it up.

Two related rules, both of which have been broken before:

- `brandMark(size)` emits its own `width`/`height`. `ferox.css` sizes only
  marks that have none (`.brand img:not([width])`), because a blanket `30px`
  there silently rendered every larger mark at nav-bar size.
- The mascot raster is **4:5**. Anything that hands it a square box has to
  letterbox rather than squash — `.mascot-art` declares the aspect ratio so
  `object-fit: contain` can enforce it.

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
