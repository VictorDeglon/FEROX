# Privacy and your data

## The short version

**As a guest, nothing you enter leaves your device.** Not your weight, not your
food, not your training, not your photos.

**If you sign in with Google, your log is stored in the cloud** — in Google's
Firestore, under your account, readable only by you. That is the whole point of
signing in: it is what lets you log a session on your phone and see it on your
laptop. It is a real trade, and you make it deliberately.

Nothing moves between the two without you choosing it, and the app says which
one you are in: Profile → Storage shows either *This device* or
*Your Google account*.

## Where it actually lives

### As a guest

Everything you log is one JSON document in your browser's local storage, on the
device you logged it on. There is no account anywhere, and no record of you on
any server — FEROX does not create an anonymous account behind your back.

That has a consequence worth understanding: **clearing your browser data
deletes your log.** Export it now and again — Profile → Export JSON — and keep
the file somewhere. It is a plain text file you can read.

### Signed in

Your log becomes one document in Firestore, the database behind this app, keyed
to your Google account. The rules governing it are in `firestore.rules` in the
repository, they are twenty lines long, and they say one thing: a person can
read and write the document whose name is their own account id, and nothing
else. There is no admin path and no sharing.

Google operates that database and can technically access what is in it, under
[their privacy policy](https://policies.google.com/privacy). If that is not a
trade you want to make, stay a guest — the app is complete either way, and
nothing is withheld from guests.

Your browser also keeps a local copy, so the app still works offline and
syncs when you are back.

## What does leave your device

| | When |
|---|---|
| **Google Fonts** | On every page load, to fetch the typefaces. Google sees your IP address, as with any site using them |
| **Google sign-in** | Only if you choose to sign in. Firebase verifies you with Google and gives the app your name, email and picture |
| **Your whole log** | Only while signed in, to Firestore, as described above |
| **The Firebase SDK** | Downloaded from Google's CDN the first time you use sign-in. A guest never fetches it |
| **A meal photo** | Only if this deployment has configured an estimator, and only after you are told and press the button. See [Food and meals](nutrition.md#photographs) |

There is no analytics, no tracking, no error reporting, no advertising and no
third-party scripts beyond those above.

## Signing out, and changing your mind

Signing out stops the syncing and returns you to this device's own log. It does
**not** delete the copy in your account — sign back in and it is there.

To remove the cloud copy, use **Erase everything** while signed in. That empties
the document in Firestore, not just the one on this device.

## Export and delete

- **Export** — Profile → Export JSON. Everything, in one readable file.
- **Import** — the same file, on any device.
- **Start over** — clears stats, medals and meals, keeps your measurements.
- **Erase everything** — empties the account completely.

Both destructive actions make you type a phrase first, because there is no undo
and no backup to restore from — including no backup of the cloud copy.
