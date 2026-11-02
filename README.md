# SnipURL

A small URL shortener with click stats, built as a zero-dependency Node.js app
(built-in `node:http` + `node:sqlite`) that is ready to deploy to [Fly.io](https://fly.io).

- Shorten any http(s) URL, optionally with a custom code
- 302 redirects with per-link click counts
- Dashboard with recent links, search-free browsing and delete
- Per-link stats page: total clicks, distinct referrers, first/last click, latest hits
- JSON API (see `/api/docs`)
- SQLite on a Fly volume — data survives deploys and machine restarts
- No npm runtime dependencies, no native modules, no build step beyond `npm ci`

## Local development

Requires **Node.js 22+** (uses the built-in, experimental `node:sqlite` module).

```sh
npm install        # installs nothing at runtime; keeps the lockfile honest
npm run dev        # starts with --watch on http://localhost:3000
npm test           # end-to-end tests against a real spawned server
```

Useful environment variables (all optional locally):

| Variable        | Default       | Meaning                                   |
| --------------- | ------------- | ----------------------------------------- |
| `PORT`          | `3000`        | Listen port                               |
| `HOST`          | `0.0.0.0`     | Listen host                               |
| `DATABASE_PATH` | `:memory:`    | SQLite file path (`:memory:` = in-memory) |
| `ADMIN_TOKEN`   | *(unset)*     | Required `x-admin-token` header for DELETE when set |
| `BASE_URL`      | *(auto)*      | Override the public base URL in the UI    |

## API

Full docs are served at **`/api/docs`** once deployed. Summary:

```sh
# create (code is optional)
curl -X POST https://<host>/api/links -H 'content-type: application/json' \
  -d '{"url":"https://example.com","code":"demo"}'

# list
curl 'https://<host>/api/links?limit=50&offset=0'

# stats for one link
curl 'https://<host>/api/links/demo/stats'

# delete (requires x-admin-token header if ADMIN_TOKEN is set)
curl -X DELETE 'https://<host>/api/links/demo' -H 'x-admin-token: <token>'

# health
curl 'https://<host>/health'
```

## Deploy to Fly.io

1. **Push this repo to GitHub** (already done if you cloned it from there).

2. **Sign in to Fly locally** (needs a free Fly account):

   ```sh
   flyctl login
   ```

3. **Deploy from this folder:**

   ```sh
   flyctl launch --no-deploy
   ```

   Review the generated `fly.toml` (this repo already ships one — keep it;
   it configures the `data` volume, port 3000, HTTPS and region).

4. **Create the persistent volume** (required for the app to start):

   ```sh
   flyctl volumes create data --size 1
   ```

   (If `flyctl launch` already created it for you, this step is a no-op that
   reports the volume exists.)

5. **Deploy:**

   ```sh
   flyctl deploy
   ```

6. **Optional hardening:** require a token for deletions:

   ```sh
   flyctl secrets set ADMIN_TOKEN=$(openssl rand -hex 16)
   ```

   Then include `x-admin-token: <token>` on any `DELETE /api/links/:code` call.

7. **Open it:**

   ```sh
   flyctl open
   ```

   Your short links are now `https://<app>.fly.dev/<code>`.

### Updating later

```sh
git push && flyctl deploy
```

Data on the volume is untouched.

### Tearing down

```sh
flyctl apps destroy snipurl   # asks for confirmation; deletes app + volume
```

## Project layout

```
Dockerfile          node:22-slim image, npm ci, runs as unprivileged user
fly.toml            Fly machine app: http service on 3000, /data volume
src/server.js       HTTP server + routing (health, pages, API, redirects)
src/db.js           SQLite store (node:sqlite), prepared statements, WAL
src/pages.js        HTML pages (home, dashboard, stats, API docs, 404)
src/styles.js       Inline CSS + client JS (no external assets)
src/http.js         Small helpers (json/html responses, body parsing, esc)
test/server.test.js End-to-end tests: boots the server, hits every endpoint
```
