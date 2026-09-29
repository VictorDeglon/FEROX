# Setting up Google Sign-In

FEROX ships with a placeholder client id, so sign-in is visibly disabled until
you create your own credential. Nothing else in the app depends on this — the
guest path works either way.

## 1. Create an OAuth client

1. Open the [Google Cloud Console](https://console.cloud.google.com/), and create
   a project (or pick an existing one).
2. **APIs & Services → OAuth consent screen.** Choose **External**, fill in the
   app name, your support email and developer email. You do not need to submit
   for verification to sign in yourself — while the app is in *Testing*, add your
   own Google account under **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
   - Application type: **Web application**
   - **Authorised JavaScript origins** — add every origin you will load FEROX from:
     ```
     http://localhost:5173          # npm run web
     http://localhost:4000          # npm start
     https://<your-user>.github.io  # GitHub Pages (origin only, no path)
     ```
   - You can leave **Authorised redirect URIs** empty. Google Identity Services
     uses the JavaScript origin, not a redirect.
4. Copy the client id. It ends in `.apps.googleusercontent.com`.

> GitHub Pages serves your whole account from one origin
> (`https://<user>.github.io`), so that single origin covers every project site.

## 2. Point the web app at it

Edit `web/assets/js/core/config.js`:

```js
googleClientId: '1234567890-abcdefg.apps.googleusercontent.com',
```

A client id is **not a secret** — it is visible in any browser that loads the
page, by design. Committing it is fine. The client *secret* is a different thing
and FEROX never uses one.

To try a client id without editing the file, append `?gid=...` to any URL.

## 3. (Optional) Verify tokens on the server

Static mode decodes the Google token in the browser for the name and picture
only; it proves nothing, which is fine because the data never leaves the device.

Once you run the API, tokens get verified properly against Google's keys:

```bash
cp .env.example .env     # then fill it in
export $(grep -v '^#' .env | xargs)
npm start
```

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Must be the **same** id as in `config.js`, or the audience check fails |
| `JWT_SECRET` | Signs FEROX session tokens. Use a long random string; the server refuses to start in production with the default |
| `PORT` | Defaults to `4000` |
| `FEROX_DATA_DIR` | Where user logs are written. Defaults to `.data/` |
| `CORS_ORIGIN` | Comma-separated allowed origins, or `*` for development |

Then set `apiBase` in `config.js` (or load the page with `?api=http://localhost:4000`).

The flow becomes: browser gets a Google ID token → `POST /api/auth/google`
verifies it and returns a FEROX JWT → every `/api/data` call carries that JWT.
The Google token is never stored.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Button renders but nothing happens on click | The current origin is not in **Authorised JavaScript origins**. It must match scheme, host and port exactly. |
| `idpiframe_initialization_failed` | Same as above, or third-party cookies are blocked for the site. |
| Button is greyed out | `config.js` still has the `REPLACE_ME` placeholder. |
| Server returns 401 on `/api/auth/google` | `GOOGLE_CLIENT_ID` on the server does not match the one the browser used. |
| Server returns 501 | `GOOGLE_CLIENT_ID` is not set on the server at all. |
| Works locally, fails on Pages | `https://<user>.github.io` is missing from the origins list. |

## Deploying the API

GitHub Pages is static, so it cannot host `server/`. Run it anywhere that takes
a Node process (Render, Fly.io, Railway, a VPS), set the environment variables
above with `CORS_ORIGIN=https://<your-user>.github.io`, and set `apiBase` in
`config.js` to the deployed URL.
