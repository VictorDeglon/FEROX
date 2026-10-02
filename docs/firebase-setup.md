# Firebase setup

FEROX is hosted on Firebase Hosting, signs people in with Firebase Auth and
keeps each athlete's log in one Firestore document. None of it is required to
run the app — with the placeholder config in `web/assets/js/core/config.js`
the site works exactly as it always has: guest only, everything in
localStorage, sign-in button visibly disabled and honest about why.

The live project is **`feroxfitness`**
([console](https://console.firebase.google.com/project/feroxfitness/overview)).
Everything below assumes you are setting up your own.

## What runs where

| Piece | Service | Notes |
|---|---|---|
| `web/` | Firebase Hosting | Deployed byte-for-byte; there is no build step. |
| Sign-in | Firebase Auth, Google provider | The only trusted identity path. |
| Athlete log | Firestore, `users/{uid}` | One document each. See `firestore.rules`. |

There is no server. The Express API that used to live in `server/` was retired
when the app moved to Firebase — the client talks to Firestore directly, and
`firestore.rules` is what keeps one athlete out of another's log.

## 1. Create the project

```bash
brew install firebase-cli        # or: npm install -g firebase-tools
firebase login
firebase projects:create ferox-yourname     # or use an existing one
```

## 2. Turn on Auth and Firestore

Both need one click each in the console, and neither can be done from the CLI:

1. **Build → Authentication → Get started → Google → Enable.** Set a support
   email and save.
2. **Build → Firestore Database → Create database.** Pick a region close to
   you and start in **production mode** — the rules in this repo replace the
   defaults on the first deploy, and starting in test mode would leave the
   database world-readable in the window before that happens.

## 3. Register the web app and copy its config

```bash
firebase apps:create web FEROX --project <your-project>
firebase apps:sdkconfig web --project <your-project>
```

Paste the result into the `firebase` block in `web/assets/js/core/config.js`.

That config is **not a secret**. A web API key identifies the project; it does
not authorise anything, and it is visible to anyone who loads the page by
design. Committing it is correct. What actually protects the data is
`firestore.rules` — read that file before changing it, because it is the only
thing between one athlete's log and another's.

## 4. Authorised domains

**Authentication → Settings → Authorised domains.** Firebase adds
`<project>.firebaseapp.com`, `<project>.web.app` and `localhost` for you. Add
any custom domain you serve the app from, or sign-in will fail there with
`auth/unauthorised-domain`.

## 5. Deploy

```bash
npm test && npm run check
firebase deploy
```

Or piecemeal: `npm run deploy:hosting`, `npm run deploy:rules`.

## Running it locally

```bash
npm run web      # hosting emulator alone, on http://localhost:5173
npm run dev      # hosting + auth + firestore emulators, with the emulator UI
```

`npm run web` serves `web/` the way Hosting will, with no Auth or Firestore
behind it — which is the right way to check the guest path, since that is
exactly what a guest gets.

## Deploying from CI

`.github/workflows/firebase.yml` deploys `main` after the tests pass. It needs
one repository secret:

- **`FIREBASE_SERVICE_ACCOUNT`** — the full JSON key for a service account with
  *Firebase Hosting Admin* and *Cloud Datastore Owner*. Generate it with:

  ```bash
  firebase init hosting:github
  ```

  which creates the account, grants the roles and writes the secret for you.

## Costs

Everything above is inside the Firebase free (Spark) tier, and no billing card
is required:

| | Free tier | FEROX uses |
|---|---|---|
| Hosting | 10 GB storage, 360 MB/day transfer | ~5 MB of assets |
| Firestore reads | 50,000/day | one per page load per athlete |
| Firestore writes | 20,000/day | one per logged set, meal or weigh-in |
| Stored data | 1 GiB | ~50 KB per athlete |

The one real ceiling is Firestore's **1 MiB per document**. Each athlete's
whole log is one document, so that caps a single account at roughly a decade of
daily meals and five sessions a week. `FirestoreAdapter.save` checks before
writing and fails with a sentence rather than letting Firestore reject it; if
anyone ever reaches it, the fix is to move `sessions` and `meals` into
subcollections.
