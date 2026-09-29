<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="web/assets/brand/logo.svg">
  <img src="web/assets/brand/logo-onlight.svg" alt="FEROX" width="420">
</picture>

**A free workout, diet and progress tracker. No subscription, no ads, no data harvesting.**

[Open the app](https://victordeglon.github.io/FEROX/) · [Google sign-in setup](docs/google-oauth-setup.md) · [Contributing notes](AGENTS.md)

</div>

---

## What it does

| | |
|---|---|
| **Seasons** | Eight structured training seasons across four blocks of the year. Greek Fire through summer, Winter Fire through winter, FEROX Recomp any month you like — each with its own animated icon, calorie approach and time split. |
| **Workouts** | Six ready-made routines or build your own. Sets, reps and weight captured per exercise, with live volume as you go. |
| **Diet tracker** | A food database across four meals a day, with a live macro ring against your calorie, protein, carb and fat targets. |
| **Progress** | Volume, bodyweight, calories and training focus charted over 14, 30 or 90 days, plus a consistency heatmap. |
| **Records** | Every lift's best set, with an estimated one-rep max (Epley) and a per-exercise trend line. |
| **Medals** | Twelve, earned automatically from streaks, tonnage, records and hitting your macros. |
| **Friends** | A leaderboard for streak, sessions, volume and medals. |

Dark and light themes, a mobile tab bar, offline support via a service worker,
and one-click JSON export of everything you have logged.

**No account needed.** Use it as a guest and the whole thing runs offline with
your log saved on the device. Google sign-in is optional and only adds a name
and picture to your profile.

## Running it

The app is static — no build step, no bundler, no framework.

```bash
git clone https://github.com/VictorDeglon/FEROX.git
cd FEROX
npm install          # only needed for the server and the tests
npm run web          # http://localhost:5173
```

That is exactly what GitHub Pages serves. You can also just open `web/index.html`
from disk, though the service worker and Google sign-in need a real origin.

### With the optional API

```bash
cp .env.example .env    # set JWT_SECRET, and GOOGLE_CLIENT_ID if you want sign-in
npm start               # http://localhost:4000 — API + web on one origin
```

The API adds verified Google sign-in and a log that follows you between devices.
It is genuinely optional: the frontend falls back to local storage if the API is
unreachable, mid-session and without an error.

## Architecture

```
web/      the app. Plain HTML + ES modules + CSS. This is what ships to Pages.
server/   optional Express API. Verified Google auth, JSON file storage.
test/     node:test suites — no test runner to install.
```

Everything an athlete logs is one document. Streaks, volume, personal records,
medal eligibility and every chart are **derived from it at read time**, never
stored. Pages never touch storage directly — they go through `core/store.js`,
which picks a local or remote adapter at boot. That one indirection is why the
same UI can run on GitHub Pages today and against a server (or a native shell)
tomorrow.

```
 pages ──▶ core/store.js ──┬──▶ LocalAdapter   (localStorage)
                           └──▶ RemoteAdapter  (FEROX API)
```

## Google sign-in

`config.googleClientId` ships as a placeholder, so sign-in renders disabled and
the guest path is used instead. Create your own OAuth client and paste the id in
— five minutes, walked through in [docs/google-oauth-setup.md](docs/google-oauth-setup.md).

Without a server, the Google token is decoded for your name and picture only and
proves nothing — which is fine, because your data never leaves the device. With
the API running, it is verified against Google's keys and exchanged for a FEROX
session token.

## Development

```bash
node scripts/add-mascot.js <image>   # wire a generated mascot into the app
```

```bash
npm test         # 36 suites: catalogue integrity, the season calendar, chart escaping, API contract
npm run check    # syntax check + verifies every local link in web/ resolves
```

Both run on every push. See [AGENTS.md](AGENTS.md) for conventions — chiefly:
the app must keep working with no backend, no build step and no network.

## Licence

MIT.
