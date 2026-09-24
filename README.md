# Hylo Hub

Hyperlocal shop discovery PWA. Product spec and rationale: [PRD.md](PRD.md).
Staging/production setup: [DEPLOYMENT.md](DEPLOYMENT.md).

Stack: FastAPI + SQLAlchemy/Alembic + Postgres (backend), Next.js App Router PWA (frontend).

## Prerequisites

- Python 3.12, [uv](https://docs.astral.sh/uv/)
- Node 20+
- Docker (for local Postgres)

If `docker ps` fails with a permission error, your user isn't in the `docker` group:

```bash
sudo usermod -aG docker $USER && newgrp docker
```

## First-time setup

```bash
# 1. Start Postgres
docker compose up -d db

# 2. Backend
cd backend
uv venv .venv && uv pip install -r requirements.txt --python .venv/bin/python
cp .env.example .env   # then set a real JWT_SECRET
.venv/bin/alembic revision --autogenerate -m "init"
.venv/bin/alembic upgrade head
.venv/bin/python -m app.seed   # seeds categories + pilot-region pincodes

# 3. Frontend (in a new terminal)
cd frontend
npm install
```

## Running

```bash
# backend, from backend/
.venv/bin/uvicorn app.main:app --reload --port 8000

# frontend, from frontend/
npm run dev
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

In dev (`OTP_PROVIDER=stub`), OTP codes are logged server-side and also returned in the
`/api/auth/otp/request` response body (`dev_code`) so the frontend can display them —
this path refuses to run outside `ENVIRONMENT=local` (see `app/config.py`).

## Layout

```
backend/app/
  models/     SQLAlchemy models (§7 of the PRD, plus an Event table for view/search tracking)
  schemas/    Pydantic request/response models
  routers/    API endpoints, one file per resource
  services/   OTP, JWT/cookies, rate limiting, geo lookup, event logging
frontend/src/
  app/        Next.js routes (customer-facing + /dashboard for shop owners)
  components/ Shared UI (coupon/shop cards, auth modal, forms)
  lib/        API client, auth + pincode context, formatting helpers
```

## Known MVP limitations

- Rate limiting and the OTP store are in-process — fine for one backend worker, not for
  multiple (swap for Redis before scaling out, see `app/services/rate_limit.py`).
- `PincodeLookup` is seeded with a handful of Bastar/Kondagaon-area rows for the pilot
  region (`app/seed.py`), not a full India Post import.
- Uploaded images are written to local disk (`UPLOAD_DIR`); swap for S3/R2 before deploying
  anywhere without a persistent disk.
