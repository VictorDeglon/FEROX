# Privacy and your data

## The short version

By default, **nothing you enter leaves your device**. Not your weight, not your
food, not your training, not your photos.

## Where it actually lives

FEROX is a static site. There is no FEROX server holding your account, because
there is no account. Everything you log is one JSON document in your browser's
local storage, on the device you logged it on.

That has a consequence worth understanding: **clearing your browser data deletes
your log.** Export it now and again — Profile → Export JSON — and keep the file
somewhere. It is a plain text file you can read.

## What does leave your device

Three things, all of them optional and all of them visible:

| | When |
|---|---|
| **Google Fonts** | On every page load, to fetch the typefaces. Google sees your IP address, as with any site using them |
| **Google sign-in** | Only if you choose to sign in, and only if this deployment has configured it. It adds a name and a picture to your profile and nothing else |
| **A meal photo** | Only if this deployment has configured an estimator, and only after you are told and press the button. See [Food and meals](nutrition.md#photographs) |

There is no analytics, no tracking, no error reporting, no advertising and no
third-party scripts beyond the two above.

## The optional server

FEROX has an optional API you can run yourself, which adds verified Google
sign-in and a log that follows you between devices. It is genuinely optional —
the app falls back to local storage mid-session if it is unreachable, without an
error — and it is your server, holding your data.

If you are using a copy of FEROX that somebody else deployed with a server
configured, your log is on their server. That is worth knowing.

## Signing in without a server

Where no server is configured, the Google token is decoded in your browser for
your name and picture, and proves nothing. It is display only. That is fine,
because there is nothing to protect — the data is on your device either way.

## Export and delete

- **Export** — Profile → Export JSON. Everything, in one readable file.
- **Import** — the same file, on any device.
- **Start over** — clears stats, medals and meals, keeps your measurements.
- **Erase everything** — empties the account completely.

Both destructive actions make you type a phrase first, because there is no undo
and no server-side backup to restore from.
