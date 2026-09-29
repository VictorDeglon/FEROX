# Running the FEROX API on skywalker

The web app does not need this. It adds verified Google sign-in and a log that
follows you between devices. Everything below assumes the app keeps working
without it — if the tunnel is down, the frontend falls back to local storage
mid-session and nobody notices.

## Why a tunnel, and not port forwarding

GitHub Pages is public, so the browser has to reach the API over the internet.
Forwarding a port on your router would publish your home IP address to anyone
who looks up the DNS record — and that IP also fronts the Minecraft servers,
the SMB shares and everything else on 192.168.1.0/24.

`cloudflared` avoids that entirely. It makes an **outbound** connection from
skywalker to Cloudflare and traffic flows back down it. There is no inbound
port, no firewall rule, and nothing to find: visitors resolve a Cloudflare IP
and the origin is never disclosed.

## What is still true afterwards

Be clear-eyed about this, because a tunnel is not a force field:

- It is still a machine on your LAN. If the API process is compromised, the
  attacker is inside your home network. That is why it runs in Docker below,
  with no host mounts beyond its own data directory.
- Your site's API goes down when your power or your internet does.
- Some ISP contracts prohibit running services on a residential line. Worth
  reading yours.
- The tunnel hides your IP from visitors. It does not hide it from Cloudflare.

## What you need first

1. A domain on Cloudflare (about £8/year). Any registrar works, but the
   nameservers must point at Cloudflare.
2. A Google OAuth client id — see `docs/google-oauth-setup.md`.

## Setup

```bash
# on skywalker
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

cloudflared tunnel login                 # opens a browser, pick your domain
cloudflared tunnel create ferox-api
cloudflared tunnel route dns ferox-api api.yourdomain.com
```

Then `~/.cloudflared/config.yml`:

```yaml
tunnel: ferox-api
credentials-file: /home/vdeglon/.cloudflared/<TUNNEL-UUID>.json
ingress:
  - hostname: api.yourdomain.com
    service: http://127.0.0.1:4000
  - service: http_status:404
```

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Running the API

```bash
cd ~/ferox
cp .env.example .env
```

`.env` on skywalker:

```bash
GOOGLE_CLIENT_ID=<the same id the browser uses>
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
CORS_ORIGIN=https://victordeglon.github.io
FEROX_DATA_DIR=/var/lib/ferox
PORT=4000
NODE_ENV=production
```

`NODE_ENV=production` matters: the server refuses to start with the default
JWT secret when it is set, which is the guard against shipping the dev value.

Containerised, so a compromise cannot reach the rest of the box:

```bash
docker run -d --name ferox-api --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  --env-file .env \
  -v /var/lib/ferox:/data \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  --memory 512m --pids-limit 256 \
  node:22-alpine sh -c "cd /app && npm ci --omit=dev && node server/index.js"
```

Note `-p 127.0.0.1:4000:4000` — the port binds to loopback only, so the API is
unreachable from the LAN. The only way in is the tunnel.

## Point the app at it

In `web/assets/js/core/config.js`:

```js
apiBase: 'https://api.yourdomain.com',
```

Test before committing: `https://victordeglon.github.io/FEROX/?api=https://api.yourdomain.com`

## Hardening worth doing

- **Rate limit** `/api/auth/google` at the Cloudflare edge — it is the only
  unauthenticated endpoint that does real work.
- **Cloudflare WAF** managed rules, free tier, one toggle.
- **Back up** `/var/lib/ferox` somewhere off the box. It is one JSON file per
  user; a nightly rsync to baerdisk3 is plenty.
- **Watch the logs** for a while: `docker logs -f ferox-api`.
- Keep `cloudflared` and the base image updated. A tunnel to an unpatched
  service is still an unpatched service.

## Checks

```bash
curl https://api.yourdomain.com/api/health
# {"ok":true,"version":2,"googleConfigured":true}

curl -s -o /dev/null -w '%{http_code}\n' https://api.yourdomain.com/api/data
# 401 — good, it refuses unauthenticated reads

dig +short api.yourdomain.com
# Cloudflare addresses only. If your home IP appears here, stop and fix it.
```

That last check is the one that matters. Run it after any DNS change.
