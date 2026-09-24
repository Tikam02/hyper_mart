# Deploying Hylo Hub

Local development is covered in [README.md](README.md). This document covers
staging and production.

Everything here was checked against the code rather than written from a
template — where a constraint is enforced by a specific file, that file is
named so you can verify it yourself.

---

## 1. Blockers you must clear before a public launch

Read this section first. Two of these will stop the app dead, and both fail in
ways that look like something else.

### 1.1 Nobody can log in yet — SMS OTP is not implemented

`app/services/otp.py` sends nothing:

```python
if settings.otp_provider == "msg91":
    raise NotImplementedError("MSG91 integration is a V1.1 item — see PRD §8")
```

Meanwhile `app/config.py` refuses to boot with the dev stub outside local:

```python
if settings.otp_provider == "stub" and settings.environment != "local":
    raise RuntimeError("OTP_PROVIDER=stub is not allowed outside ENVIRONMENT=local. ...")
```

Those two together mean there is **no working login path in staging or
production**: `stub` won't boot, `msg91` raises on the first OTP request. The
fail-closed guard is deliberate — it exists so a build that accepts any OTP code
can never reach real users — but it means implementing the MSG91 call in
`send_otp()` is a hard prerequisite, not a nice-to-have.

Until that lands, the app can only be exercised with `ENVIRONMENT=local`.

### 1.2 HTTPS is mandatory, and failing it looks like a broken login

`app/services/security.py` sets the auth cookie with `secure=settings.environment != "local"`.
Over plain HTTP in staging or production the browser silently discards the
cookie: the OTP appears to succeed, then the user is still signed out. There is
no error message anywhere.

The PWA service worker also only registers over HTTPS (or `localhost`), so
installability and offline shell are off until TLS is in place.

### 1.3 Frontend and backend must share a registrable domain

The auth cookie is `samesite="lax"`. A browser sends a Lax cookie only on
same-site requests, and "same site" means the same registrable domain:

| Layout | Cookie sent? |
| --- | --- |
| `hylohub.in` + `api.hylohub.in` | Yes — same site |
| `hylohub.in` + `hylohub.in/api` (one origin, reverse proxy) | Yes — same origin |
| `hylo.vercel.app` + `hylo-api.fly.dev` | **No** — different sites, login silently fails |

Splitting across two unrelated PaaS domains is the most common way to break
this. Either put both behind one domain (recommended — see §5), or change the
cookie to `samesite="none"` with `secure=True` and accept the CSRF surface that
opens up.

---

## 2. What runs where

Three processes plus storage:

```
                      ┌──────────────────────────────┐
  browser  ──HTTPS──▶ │ Next.js (node, port 3000)    │
                      │  · SSR + PWA shell           │
                      │  · proxies /uploads ─────────┼──┐
                      └──────────────┬───────────────┘  │
                                     │ /api/* (from the │
                                     │ browser, direct) │
                                     ▼                  ▼
                      ┌──────────────────────────────────┐
                      │ FastAPI (uvicorn, port 8000)     │
                      │  · serves /uploads from disk     │
                      └──────────────┬───────────────────┘
                                     ▼
                      ┌──────────────────────────────────┐
                      │ PostgreSQL 16                    │
                      └──────────────────────────────────┘
```

Two things about that diagram are easy to get wrong:

- **`/api/*` is called from the browser**, not proxied through Next. So
  `NEXT_PUBLIC_API_URL` must be an address the *user's phone* can reach, and the
  backend's `CORS_ORIGINS` must list the frontend's public origin.
- **`/uploads/*` _is_ proxied through Next**, via the rewrite in
  `next.config.ts`. Image URLs are deliberately stored and rendered as bare
  paths (`/uploads/x.jpg`). Do not "fix" them to absolute backend URLs: that
  resolves differently during SSR than in the browser, which breaks every image
  for anyone not on the dev machine and desynchronises the two renders into a
  React hydration error.

---

## 3. Environment variables

### Backend (`backend/.env`, or your platform's config)

| Variable | Required | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | **yes, no default** | `local` \| `staging` \| `production`. The app refuses to start if unset — this is intentional, see `app/config.py`. |
| `DATABASE_URL` | **yes** | `postgresql+psycopg://user:pass@host:5432/hylo_hub`. Note the `+psycopg` driver (psycopg 3), not `psycopg2`. |
| `JWT_SECRET` | **yes** | Generate with `openssl rand -hex 32`. Rotating it signs every user out. |
| `OTP_PROVIDER` | **yes, no default** | `msg91` outside local. See §1.1 — not yet implemented. |
| `UPLOAD_DIR` | no (`./uploads`) | Must point at persistent storage. See §4. |
| `CORS_ORIGINS` | no (`http://localhost:3000`) | Comma-separated. Must include the frontend's public origin exactly, scheme included. |

The private-network CORS allowance in `app/main.py` (which lets a phone on the
same Wi-Fi hit a dev machine) is gated on `environment == "local"` and is
inactive in staging and production. Nothing to do.

### Frontend (`frontend/.env.local`, or platform config)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | **yes in prod** | Public backend origin, e.g. `https://hylohub.in/api` host. Baked into the client bundle at build time — changing it needs a rebuild, not a restart. |
| `NEXT_PUBLIC_SITE_URL` | **yes in prod** | Public frontend origin. Used for share links and OpenGraph image URLs. |
| `BACKEND_INTERNAL_URL` | recommended | Where the Next *server* reaches FastAPI for the `/uploads` proxy — often an internal address like `http://backend:8000`. Falls back to `NEXT_PUBLIC_API_URL`, then `http://localhost:8000`. |

`allowedDevOrigins` in `next.config.ts` only affects `next dev`. It is ignored
by production builds.

---

## 4. Uploaded images

Uploads are written to `UPLOAD_DIR` on local disk and served by FastAPI's
`StaticFiles` mount. Two consequences:

- **Most PaaS filesystems are ephemeral.** On Heroku-style dynos, Fly machines
  without a volume, or any container that gets replaced on deploy, every shop
  photo disappears on the next restart. Attach a persistent volume, or move to
  object storage.
- **It does not survive horizontal scaling.** Two backend instances have two
  separate disks, so an image uploaded to one 404s on the other.

PRD §9 calls for S3-compatible object storage (Cloudflare R2 — cheap egress).
That is the right long-term answer. `app/routers/uploads.py` already does the
expensive part — validation, EXIF-orientation correction, downscale to 1920px,
re-encode — so moving to R2 only means swapping the final `image.save(...)` for
an upload call and returning the object URL.

The upload endpoint accepts JPEG, PNG, WEBP, HEIC/HEIF, MPO and a few others,
which matters because phone cameras rarely produce plain JPEG. `pillow-heif` is
a hard dependency for the iPhone case; make sure it installs in your image.

---

## 5. Recommended topology: one domain, reverse proxy

This sidesteps §1.3 entirely and keeps CORS trivial.

```
https://hylohub.in/          → Next.js  :3000
https://hylohub.in/api/      → FastAPI  :8000
https://hylohub.in/uploads/  → FastAPI  :8000   (or let Next's rewrite handle it)
```

Caddy makes the TLS part a non-event:

```caddy
hylohub.in {
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle /uploads/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
```

With this layout:

- `NEXT_PUBLIC_API_URL=https://hylohub.in`
- `NEXT_PUBLIC_SITE_URL=https://hylohub.in`
- `BACKEND_INTERNAL_URL=http://backend:8000`
- `CORS_ORIGINS=https://hylohub.in`

---

## 6. Deploy steps

### Backend

```bash
cd backend
uv pip install -r requirements.txt --python .venv/bin/python
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Run `alembic upgrade head` as a release step, before the new code starts
serving. Migrations are additive so far, but `80e186e7c2f8` rewrites
`products.category_id` to point at the new `product_categories` table — take a
database backup before first deploying it. Its `downgrade()` deliberately
raises rather than silently orphaning products that sit in owner-created
sections with no global equivalent.

**Workers:** keep it at one for now. `app/services/rate_limit.py` is an
in-process sliding window, so the OTP throttle (3 requests per phone per 10
minutes) is per-worker — four workers means four times the allowance. Move it to
Redis before scaling out.

First deploy to a fresh database also needs the reference data:

```bash
.venv/bin/python -m app.seed   # categories + pilot-region pincodes
```

Pincodes in `app/seed.py` are an approximate starter set for Kondagaon/Bastar.
Import a real India Post dataset before expanding past the pilot region.

### Frontend

```bash
cd frontend
npm ci
npm run build
npm run start   # or your platform's node server
```

`NEXT_PUBLIC_*` values are inlined at build time. Changing them requires a
rebuild — restarting the server will not pick them up.

### Database

Postgres 16. The local `docker-compose.yml` maps it to host port **5433** (not
5432) because a native Postgres already occupied the default on the dev
machine — production has no reason to inherit that.

Back up before every migration. Nightly `pg_dump` to object storage is the
minimum; the coupon-claim and product-request tables are the ones you cannot
reconstruct.

---

## 7. Post-deploy smoke test

In order. Each step catches a distinct failure from §1.

```bash
# 1. Backend is up and talking to Postgres
curl -s https://hylohub.in/api/health

# 2. Reference data loaded (should not be [])
curl -s https://hylohub.in/api/categories

# 3. Listing endpoint works for the pilot pincode
curl -s "https://hylohub.in/api/shops?pincode=494226"

# 4. Images are served as same-origin paths, NOT absolute backend URLs
curl -s https://hylohub.in/shops/1 | grep -o 'src="[^"]*uploads[^"]*"' | head
#    expect: src="/uploads/....jpg"     — a "http://localhost:8000/..." here
#    means the rewrite is misconfigured and every photo will be broken on phones
```

Then in a real browser, on a phone if possible:

- [ ] Request an OTP — confirms §1.1 is actually resolved
- [ ] Enter it and stay signed in after a refresh — confirms §1.2 and §1.3
- [ ] Shop photos render on the listing and shop page
- [ ] Open DevTools console on a shop page: no hydration warnings
- [ ] Owner dashboard: toggle open/closed, confirm the status line changes
- [ ] Install the PWA from the browser menu — confirms HTTPS + service worker

---

## 8. Operational notes

**Timezone.** Shop open/closed is derived in `app/services/hours.py` against an
explicit `ZoneInfo("Asia/Kolkata")`, so the server's own timezone does not
matter and you do not need to set `TZ`. Do not "simplify" it to naive local
time — on a UTC host, a 9 AM–9 PM shop would read as closed until 2:30 PM.

**Logs worth watching.** OTP failures and 429s from the rate limiter are the
early signal that SMS delivery is broken. `app/services/events.py` writes an
append-only `events` table — that is the data behind any future shop analytics,
so include it in backups.

**Secrets.** `.env` and `.env.*` are gitignored (`.env.example` is the tracked
template). The only credential in version control is the local Docker Postgres
password in `docker-compose.yml`, which is a dev-container credential and not
used anywhere else. Generate a fresh `JWT_SECRET` per environment.

**Rollback.** The app is stateless apart from uploads, so rolling back the
container is safe. Rolling *back* a migration is not always — see the note on
`80e186e7c2f8` in §6.
