# AGENTS.md — working on FEROX

FEROX is a free workout, nutrition and progress tracker. This file is the brief
for any agent (or human) picking the project up. Read it before changing code.

## The one rule that shapes everything

**The web app must keep working with no backend, no build step and no network.**

`web/` is plain HTML + ES modules + CSS. It is deployed straight to Firebase
Hosting, byte-for-byte, and must run correctly as a static site with no
Firebase project behind it at all. Anything that breaks that — a bundler, a
framework, a mandatory network call, a server-rendered template — is the wrong
change for this repo.

**Firebase is optional, and must stay optional.** With the placeholder config
in `core/config.js`, `googleReady()` is false, the SDK is never downloaded and
FEROX is a complete working app on local storage. Sign-in and Firestore sync
are what someone opts *into*. A change that makes the app require an account,
a network, or a Firebase project is the wrong change.

The Firebase SDK is imported dynamically from Google's CDN (`core/firebase.js`)
precisely so that this stays true: a guest downloads none of it.

## Layout

```
web/                     the app — this is what Firebase Hosting serves, as-is
  index.html             landing page
  {dashboard,workouts,nutrition,progress,seasons,records,medals,friends,profile}.html
  404.html  sw.js  manifest.webmanifest  .nojekyll
  assets/brand/          logo.svg, wolf.svg, mark.svg, favicon.svg, maskable.png
  assets/css/ferox.css   the whole design system, token-driven
  assets/js/core/        config, store, auth, ui, chart, icons, seed,
                         exercises + anatomy + musclemap (the 1,000-exercise
                         catalogue, the muscles, and the body map),
                         foods (450 foods), catalog (exercise search),
                         vision (photo meals — read it before touching them),
                         seasons + season-icons (the training year),
                         profile (calorie maths), split (week builder),
                         strength (what weight to put on the bar),
                         metabolism (measured maintenance + checkpoints),
                         plan (what the two of those say together),
                         themes (palettes), eggs (the secret console),
                         research (study summaries), knowledge (the searchable
                         hundred-question knowledge base), image (avatar resizing)
  assets/js/pages/       one module per page + _log.js (shared session editor),
                         _readiness.js (daily check-in), _weighin.js (weigh-ins),
                         _catalog.js (exercise browser), _plate.js (food search
                         and the meal builder), _photo.js (meal photos)
firebase.json            Hosting config. cleanUrls is OFF on purpose — see below.
firestore.rules          the entire access-control story. Read before changing.
.firebaserc              project alias (feroxfitness)
test/                    node:test suites (no runner to install)
scripts/check-web.js     link checker for web/
scripts/check-syntax.js  parses every module in web/ — the app has no build step
scripts/add-mascot.js    wires a generated mascot image into the app
scripts/make-icons.js    derives every square app icon from the mascot
scripts/lib/png.js       a very small PNG decode/resize/pad/encode, no deps
scripts/gen-exercises.js builds core/exercises.js from data/families.js
scripts/gen-foods.js     builds core/foods.js from data/foods.js, checking macros
docs/guide/              the guides, written for the person *using* the app
docs/firebase-setup.md   project setup, deploys, emulators, the free-tier maths
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
npm run web        # Hosting emulator on :5173 — exactly what Hosting serves
npm run dev        # hosting + auth + firestore emulators, plus the emulator UI
npm test           # node:test, 143 checks, no network
npm run check      # web/ link checker + parses every module in web/
npm run deploy     # firebase deploy (hosting + rules)
```

FEROX has **no dependencies**. `npm install` installs nothing; if you find
yourself adding a package, that is a decision worth justifying in the PR.

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

**`emptyData()` must stay storable in Firestore.** Firestore is stricter than
localStorage was and rejects the *whole write*, not the offending field, if it
meets an `undefined`, an array directly inside an array, or a key starting with
`__`. `test/store.test.js` walks a fresh document looking for all three, so an
innocuous-looking new default cannot silently break every save. The adapter
also round-trips through JSON before writing, which is what drops `undefined`.

**The log is one Firestore document, at `users/{uid}`.** One document, not a
collection per list, because the client is offline-first and writes the whole
log on every change — one atomic write means no merge protocol and no
half-saved state. The cost is Firestore's 1 MiB per-document ceiling;
`FirestoreAdapter.save` checks for it and fails with a sentence. If anyone ever
reaches it, move `sessions` and `meals` into subcollections and leave the rest.

`core/seed.js` is the front door to the shared catalogue — the single source of
truth for exercises, routines, foods and medals.

## Volume is the check the builder cannot do alone

`buildSession` sees one day; the evidence is weekly. `VOLUME` in `core/split.js`
holds per-group landmarks in **hard sets per muscle per week** — MEV, MAV, MRV —
and `buildWeek` runs three things against them:

- `weeklyVolume(week)` counts sets, giving the working muscle full credit and
  each secondary muscle **half**. Counting a bench press as nothing for triceps
  understates arms badly on a push/pull/legs split; counting it in full
  overstates it just as badly.
- `capVolume(week)` trims back inside MRV, accessories first and never below
  two sets, so what gets cut is the fourth set of leg extensions rather than
  the squat the session is built around. Before it existed a five-day mass
  block prescribed **34 sets of legs a week**, which is not a hard week — it is
  a week nobody finishes.
- `auditVolume(week, season)` reports what survived the cap, and the workouts
  page shows it.

**The cap cannot always win, and that is correct.** A mass block routinely
leaves arms and shoulders a few sets over because most of that number is
secondary credit from pressing — there is barely any direct arm work left to
cut, and cutting the bench press to protect the triceps is the wrong trade.
`test/plan.test.js` asserts the distinction: over MRV is only allowed when
every reachable set is already at the two-set floor.

`isDeloadWeek` makes every fifth week a deload at **half the sets and 92% of
the load**. That way round is deliberate — keeping the bar heavy preserves the
strength adaptation, and cutting the sets is what actually sheds the fatigue.

## The generated catalogues

**`core/exercises.js` and `core/foods.js` are generated. Never edit them.**
Change `scripts/data/families.js` or `scripts/data/foods.js` and re-run
`node scripts/gen-exercises.js` / `node scripts/gen-foods.js`.

They are generated because a thousand hand-written rows drift — the same
movement ends up with two different muscle lists depending on which afternoon it
was added — and because the generator is where the checking lives.

### Exercises

A family expands to `implements × angles × grips` plus its `extras`. **The rule
for an axis is that every combination it produces must be a real exercise.**
That rule has been broken once and it is worth knowing how: a single grid on the
squat produced "Goblet Barbell Squat" and "Back Dumbbell Squat". A family whose
angles depend on its implement therefore declares several `grids`, one per
implement group, and `plain` names the value that is the *default* form of the
movement rather than a variation (a back squat is *the* barbell squat).

`variant` — 0 for the plain movement, one per modifier — is what makes searching
"bench" return the bench press. Search ranking took three attempts:

- Ranking on where the word appeared in the name put "Bench Dip" on top, because
  the canonical movement almost always carries a qualifier and so never *starts*
  with the word you typed.
- Adding a name-length tiebreak put "Dead Bench Press" on top instead.
- Weighting `variant` decisively is what works.

The catalogue ships as **columns of dictionary indices**, decoded on import: 322
KB of JSON objects becomes 73 KB that decodes in 7 ms. `id` is not stored at
all — it is the slug of the name, derived by the same function that made it.

**`LEGACY_IDS` in seed.js maps the 53 pre-catalogue ids onto the new ones.**
Every logged session references exercises by id, so an old id that stops
resolving turns a year of logged benches into a history of blanks. A test
asserts every entry still points at something real.

### Foods

Macros are **per serving**, not per 100 g, and every row carries what a serving
weighs so it can still be scaled. The generator checks calories against macros
and **refuses to write the file** if any row is more than 12% out — a typo in a
food database is a calorie target that is quietly wrong for months.

Two things that check got wrong before it was right: fibre is priced at 2 kcal/g
rather than 4 (it is a carbohydrate the body does not fully metabolise, and the
full four flagged every vegetable), and alcohol rows are tagged and exempted
because alcohol is 7 kcal/g and appears in no macro column.

## Anatomy and the body map

`core/anatomy.js` holds 28 fine muscles, each rolling into exactly one of the 7
coarse `GROUPS`. An exercise's `muscle` is **derived** from its primary movers,
so it cannot disagree with them.

`core/musclemap.js` draws a front and back figure with the worked muscles lit,
primaries solid and helpers faded. A thousand exercises cannot each have an
illustration drawn, and a stock photo of a stranger mid-rep teaches nobody
anything — what people want to know is what a movement works. It is inline SVG
from shared region paths, so it costs no request, works offline and follows the
theme. Every colour is a token.

## Meal photos

**Read the comment at the top of `core/vision.js` before touching this.**

Food recognition does not fit inside the no-backend rule: the smallest useful
vision models are many times the size of this app and would have to be
downloaded before the first photo. So the photo path reads and shrinks the image
**on the device** and keeps it with the meal (useful on its own), and offers an
estimate *only* where `config.visionEndpoint` is set — off by default, with the
athlete told the photo is leaving the device and where it goes, before it goes.
Anything an estimator returns opens in the plate builder to be corrected, never
logged silently.

If you are tempted to make this work offline, or to quietly default the endpoint
to something, do not. The honesty is the feature.

## Meals that save themselves

Every combination logged together is fingerprinted (sorted food ids — the same
plate with the portions nudged is still the same plate) and counted in
`mealPatterns`. Nothing is saved and nothing is asked on the first sighting; the
second time the same combination appears, `suggestibleMeal()` surfaces it.

Being asked to name your breakfast the first time you eat it is an interruption.
Being asked the second time is a shortcut. Do not lower the threshold to one.

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
1. Every major muscle group is trained **2–3 times a week**, at every day count
   and in every season — except `endurance`, which drops lifting to twice a week
   deliberately and is asserted as the one exception.
2. Week one runs ~15% above steady state and settles by week four.
Both are tested. It also filters exercises by equipment and by the joints
someone listed as problems, and backfills a session if those filters leave it
too thin.

**`pick()` ranks candidates, it does not filter them**, so a preference that
would empty the pool loses to the next one down instead of leaving a slot blank.
The order has been wrong twice and both failures are worth knowing about:

- Ranking by *position* in the day's focus list, rather than in/out of it as a
  yes-or-no, made an upper day that listed Chest first fill its overhead-press
  slot with a dip and finish with no shoulder work.
- Preferring an uncovered muscle *above* the day's focus let an upper day spend
  its last isolation slot on a leg curl.

The order that satisfies both is: in-focus, then uncovered, then focus position,
then not-used-this-week, then the mode's preferred lifts, then the best kit the
athlete has. That last one matters more than it sounds — `availableExercises`
returns everything at or *below* someone's tier, so without it a full-gym lifter
was handed push-ups as their main chest movement about as often as a bench press.

Exercises are tracked at two scopes: `inSession` is a hard exclusion (never the
same lift twice in one day) and `used` is a week-wide soft preference (so the
accessory slots rotate instead of prescribing the same pushdown four times).

## Training modes

A season already carried `repRange` and `restSec`, which say how hard each set
is. `MODES` in `core/split.js` adds the half that was missing — how *many* —
and the two move in opposite directions. A block of triples needs five sets to
accumulate anything; a block of fifteens needs three or it is junk volume. That
axis runs from `strength` (1–5 reps × 5 sets, heavy) to `metabolic` (10–15 × 3,
light), and `intensity` scales the prescribed weight on top of it.

Each mode also carries a `shape`, which *transforms* the week's template rather
than replacing it: `compound` strips trailing accessories, `accessory` adds one,
`explosive` leads with jumps, `conditioned` finishes on conditioning, `aerobic`
rebuilds the week as two lifting days plus runs, `restorative` swaps power work
for unilateral and mobility work. Transforming rather than hand-writing twenty
templates is deliberate — the base templates already satisfy the frequency rule,
so a transformation inherits it instead of having to re-prove it.

Adding a mode means adding it to `MODES` and pointing at least one season's
`mode` field at it. Tests assert every season names a real mode, every mode's
`prefer` list names real exercises, and the sets-versus-reps axis runs the way
the modes claim it does.

## What weight goes on the bar

`core/strength.js`. Three cases, in order of how much is actually known:

1. **Never done this lift.** Estimate a 1RM from bodyweight × a per-exercise
   standard × experience × sex × age, then **undershoot by 15%**.
2. **Done this lift.** Use the best set logged, and add to it when the last
   session hit every prescribed rep. Lower-body barbell lifts climb twice as
   fast; missing by more than two reps backs the weight off.
3. **Done this *muscle*.** Carry the group's measured ratio across to a lift
   never performed — clamped to `CARRY_RANGE`, because a deadlift at double the
   estimate is real information about your back and is *not* permission to open
   an untried pulldown at double the textbook.

**The undershoot is the load-bearing decision, and it is not timidity.** A first
session 10 kg light costs thirty seconds to fix. A first session 10 kg heavy
costs a failed rep, a tweaked shoulder, or a person who quietly decides this app
is not for them. Every default leans the same way: estimates are conservative,
rounding is always *down* to a loadable increment, and progression is earned.

Two things run in opposite directions on purpose: a muscle group that is **ahead
earns heavier weight**, one that is **behind earns an extra set**. A lagging
group needs more work, not a heavier version of work it is already failing.

The muscle ratio is a **median**, so one mistyped weight cannot drag a whole
group's prescription with it, and nothing is acted on below two logged lifts —
one lift is an anecdote. Adding an exercise that is logged in kg means adding it
to `STANDARDS`; a test fails if you forget, because the logger would open that
field at zero.

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
the code does. There is no undo: a reset overwrites the Firestore document too,
and there is no backup to restore from — which is the whole reason for the
typed phrase.

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

`CONFIG.firebase` ships as a placeholder. `googleReady()` gates the UI, so an
unconfigured deployment shows a disabled Google button and the guest path
rather than a broken one. See `docs/firebase-setup.md`.

Two paths, and the distinction is load-bearing:

- **Google** — Firebase Auth. A real verified account with a uid, and that uid
  is what `firestore.rules` keys the log on. The only path trusted for data.
- **Guest** — no account, no document, no network. Deliberately *not* Firebase
  anonymous auth, which would mean creating a record in a datacentre for
  someone who was promised the opposite, and would quietly falsify "nothing is
  sent anywhere by default" — the first claim on the landing page.

`store.init({ uid })` takes the uid and nothing else, so "signed in" and
"synced" cannot disagree: there is one condition, not two code paths that have
to be kept in step. `bootPage` awaits `auth.restore()` before loading, because
Firestore rules key on a restored session and reading too early is refused.

**`cleanUrls` is off in `firebase.json` on purpose.** Every link in `web/` is
written with an explicit `.html`, and cleanUrls answers those with a 301 — a
redirect on every navigation, and a service-worker cache keyed on URLs the
pages never ask for. If you turn it on, rewrite every link first.

## Scope

These instructions apply to the whole repository.
