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
  {dashboard,workouts,nutrition,progress,records,medals,friends,profile}.html
  404.html  sw.js  manifest.webmanifest  .nojekyll
  assets/brand/          logo.svg, wolf.svg, mark.svg, favicon.svg, maskable.svg
  assets/css/ferox.css   the whole design system, token-driven
  assets/js/core/        config, store, auth, ui, chart, icons, seed
  assets/js/pages/       one module per page + _log.js (shared session editor)
server/                  optional Express API
  index.js               app + static host        static.js  no-API dev server
  config.js  lib/{auth,store}.js  routes/{auth,data}.js
test/                    node:test suites (no runner to install)
scripts/check-web.js     link checker for web/
docs/google-oauth-setup.md
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
- **Module-level `const`s used by `render()` must be declared above the
  `bootPage()` call.** `bootPage` renders synchronously, so a const below it is
  in the temporal dead zone. This has bitten the project once already.

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
  friends:  [{ id, name, handle, streak, sessions, volume, medals }] }
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
