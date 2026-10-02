<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="web/assets/brand/logo.svg">
  <img src="web/assets/brand/logo-onlight.svg" alt="FEROX" width="420">
</picture>

**A workout, diet and progress tracker. The whole trainer is free forever — no ads, no data harvesting.**

[Open the app](https://victordeglon.github.io/FEROX/) · [Guides](docs/guide/) · [Firebase setup](docs/firebase-setup.md) · [Contributing notes](AGENTS.md)

</div>

---

## What it does

| | |
|---|---|
| **Seasons** | Eight structured training seasons across four blocks of the year. Greek Fire through summer, Winter Fire through winter, FEROX Recomp any month you like — each with its own animated icon, calorie approach and time split. |
| **Workouts** | Six ready-made routines or build your own, from a catalogue of 1,369 movements. Sets, reps and weight captured per exercise, with live volume as you go. |
| **Volume** | Weekly hard sets per muscle group, checked against evidence-based landmarks. The plan is capped at what is actually recoverable, and every fifth week is a deload. |
| **Diet tracker** | A searchable food database across four meals a day, foods of your own, water, a live macro ring, weekly averages, protein hit-rate and where your calories actually come from. |
| **Weigh-ins** | A prompt on your own schedule — every other day by default — taking weight plus optional body fat, lean mass, waist, resting heart rate and sleep. Each one gets its own chart. |
| **Checkpoints** | Fortnightly weight goals that adjust to *your* metabolism, measured from your weigh-ins and food log rather than predicted from an equation, and scaled by how consistently you actually follow the plan. |
| **Progress** | Volume, bodyweight with a trend line, body composition, calories and training focus charted over 14, 30 or 90 days, plus a consistency heatmap. |
| **Records** | Every lift's best set, with an estimated one-rep max (Epley) and a per-exercise trend line. |
| **Medals** | Twelve, earned automatically from streaks, tonnage, records and hitting your macros. |
| **Friends** | A leaderboard for streak, sessions, volume and medals. |

Dark and light themes, a mobile tab bar, offline support via a service worker,
and one-click JSON export of everything you have logged. There are a few more
colour schemes in there than the two you can see. FEROX is not going to tell you
where they are.

**No account needed.** Use it as a guest and the whole thing runs offline with
your log saved on the device, and nothing sent anywhere. Google sign-in is
optional; it syncs your log to your account so it follows you between devices.

## Running it

The app is static — no build step, no bundler, no framework.

```bash
git clone https://github.com/VictorDeglon/FEROX.git
cd FEROX
npm run web          # http://localhost:5173 — the Hosting emulator
```

There are no dependencies to install: FEROX has none. `npm run web` needs the
Firebase CLI (`brew install firebase-cli`), and serves `web/` exactly as
Hosting will. You can also just open `web/index.html` from disk, though the
service worker and sign-in need a real origin.

### With Auth and Firestore

```bash
npm run dev          # hosting + auth + firestore emulators, plus the emulator UI
```

Sign-in and cloud sync need a Firebase config in
`web/assets/js/core/config.js` — five minutes, walked through in
[docs/firebase-setup.md](docs/firebase-setup.md). Until it is filled in, FEROX
runs guest-only on local storage, which is a fully working app.

## Architecture

```
web/      the app. Plain HTML + ES modules + CSS. This is what ships, as-is.
test/     node:test suites — no test runner to install.
scripts/  catalogue generators and the static checks CI runs.
```

There is no server. The app is static files plus Firebase: Hosting serves
`web/`, Auth identifies people, and Firestore holds one document per athlete.
`firestore.rules` is the whole of the access control, and worth reading.

Everything an athlete logs is one document. Streaks, volume, personal records,
medal eligibility, every chart and the whole metabolism estimate are **derived
from it at read time**, never stored. Pages never touch storage directly — they
go through `core/store.js`, which picks an adapter at boot based on one thing:
whether there is a signed-in uid. That single switch is why "signed in" and
"synced" can never disagree, and why the same UI ran against a file-backed
server before and will run in a native shell later.

```
 pages ──▶ core/store.js ──┬──▶ LocalAdapter       (localStorage — guests, and
                           │                        the fallback when offline)
                           └──▶ FirestoreAdapter   (users/{uid} — one document)
```

## Google sign-in

`CONFIG.firebase` ships as a placeholder, so sign-in renders disabled and the
guest path is used instead. Paste in your own project's config to switch it on
— see [docs/firebase-setup.md](docs/firebase-setup.md).

Signing in is a real, verified account: Firebase checks the credential with
Google and hands back a uid, and that uid is what `firestore.rules` keys the
log on. The guest path is deliberately *not* anonymous auth — a guest creates
no account and no document anywhere, because that is what they were promised.

## Development

```bash
node scripts/add-mascot.js <image>   # wire a generated mascot into the app
node scripts/make-icons.js           # re-derive every square app icon from it
```

```bash
npm test         # 143 checks: catalogue integrity, the season calendar, chart
                 # escaping, the metabolism maths, weekly volume, Firestore safety
npm run check    # syntax check + verifies every local link in web/ resolves
```

Both run on every push. See [AGENTS.md](AGENTS.md) for conventions — chiefly:
the app must keep working with no backend, no build step and no network.

The catalogues are generated, not hand-written:

```bash
node scripts/gen-exercises.js   # 1,369 exercises from scripts/data/families.js
node scripts/gen-foods.js       # 450 foods, with the macro arithmetic checked
```

## Guides

Written for the person using the app rather than the person changing it —
[docs/guide/](docs/guide/) covers [getting started](docs/guide/getting-started.md),
[what weight to lift](docs/guide/weights.md),
[your training plan](docs/guide/training-plan.md),
[seasons](docs/guide/seasons.md),
[food and meals](docs/guide/nutrition.md),
[weigh-ins and checkpoints](docs/guide/progress.md),
[privacy](docs/guide/privacy.md) and [themes](docs/guide/themes.md).

## Licence

MIT.
