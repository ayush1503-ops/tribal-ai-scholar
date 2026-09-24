# Vercel Deployment Guide — Tribal AI Scholar (Fully Functional)

This repo contains **two apps** unified for Vercel deployment:

1. **Certificate Checker** (Flask) — SC/ST certificate screening assistant
   - Routes: `/cert`, `/certificate`, `/verify`, `/api/health`, `/api/analyze`, `/static/*`
   - Requires OpenCV + Tesseract. On Vercel, Tesseract binary is missing, so health will show OCR unavailable, but UI still loads. For full OCR, deploy to Railway/Render or add cloud OCR.

2. **Tribal Scholar Platform** (FastAPI + React Vite)
   - Frontend: `tribal-scholar/frontend` → built to `dist`, served at `/`
   - Backend: `tribal-scholar/backend/app/main.py` → wrapped by `api/tribal.py`
   - Routes: `/api/v1/*`, `/health`, `/api/docs`, `/docs`, `/api/redoc`, `/api/openapi.json`

## Vercel Configuration (vercel.json)

We use modern Vercel config:

- **buildCommand**: `cd tribal-scholar/frontend && npm install && npm run build`
- **outputDirectory**: `tribal-scholar/frontend/dist`
- **installCommand**: installs both Python and Node deps
- **functions**: two Python serverless functions with 30s maxDuration, 1024MB
- **rewrites**: API routes → python functions, all else → frontend SPA (`/index.html`)

Key rewrites:
```
/api/v1/*          → /api/tribal.py   (Tribal Scholar API)
/api/docs, /docs   → /api/tribal.py
/health            → /api/tribal.py
/api/health        → /api/index.py    (Certificate checker health)
/api/analyze       → /api/index.py
/cert, /verify    → /api/index.py
/(.*)             → /index.html      (React SPA fallback)
```

## Requirements

Root `requirements.txt` is unified for both apps:
- Flask, FastAPI, SQLAlchemy, Pydantic, etc.
- opencv-python-headless, Pillow, pytesseract
- scikit-learn, scipy (optional, with fallback)
- mangum (Vercel ASGI adapter)

If Vercel size limit (250MB) is hit, you can:
- Remove `scikit-learn` and `scipy` — app has fallback heuristics
- Or split into two Vercel projects (one for each app)

## Environment Variables on Vercel

Set in Vercel Dashboard → Settings → Environment Variables:

```
SECRET_KEY=your-strong-random-32-char-secret
DATABASE_URL=sqlite:////tmp/tribal_scholar.db   # auto-detected if VERCEL env present
FRONTEND_URL=https://your-project.vercel.app
BACKEND_URL=https://your-project.vercel.app
UPLOAD_DIR=/tmp/uploads
ENVIRONMENT=production
# Optional
VITE_API_BASE=/api/v1
```

For production DB, use PostgreSQL:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Database on Vercel

- **SQLite** (`/tmp/tribal_scholar.db`) is ephemeral — resets on cold start. OK for demo.
- Seed runs automatically on startup, creates demo users:
  - applicant@demo.local / demo123
  - officer@demo.local / demo123
  - admin@demo.local / demo123
  - committee@demo.local / demo123
  - etc. OTP: 123456 (mock)

For persistent data, use:
- Vercel Postgres
- Neon, Supabase, or Railway Postgres
- Set `DATABASE_URL` to postgres URL

## Frontend Build

Vercel auto-detects Vite:
- Install: `cd tribal-scholar/frontend && npm install`
- Build: `npm run build` → `dist/`
- Env: `VITE_API_BASE=/api/v1` (same origin)

Local dev:
```bash
cd tribal-scholar/frontend
npm install
npm run dev  # http://localhost:5173, proxies /api to localhost:8000
```

Backend local:
```bash
cd tribal-scholar/backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Deployment Steps

1. Push to GitHub
2. Import project in Vercel (https://vercel.com/new)
3. Framework Preset: Vite (auto) — but we override with vercel.json
4. Root Directory: `./` (repo root)
5. Build Command: (from vercel.json) `cd tribal-scholar/frontend && npm install && npm run build`
6. Output Directory: `tribal-scholar/frontend/dist`
7. Install Command: `pip install -r requirements.txt && cd tribal-scholar/frontend && npm install`
8. Add env vars (see above)
9. Deploy

Vercel will:
- Install Python deps from root requirements.txt
- Install Node deps and build frontend
- Deploy two python functions (`api/index.py`, `api/tribal.py`)
- Serve static frontend with SPA fallback

## Testing Deployment

After deploy, check:

- `https://your-app.vercel.app/` → Tribal Scholar landing
- `https://your-app.vercel.app/health` → Tribal API health (should be ok)
- `https://your-app.vercel.app/api/v1/health` → same
- `https://your-app.vercel.app/api/docs` → FastAPI docs
- `https://your-app.vercel.app/api/health` → Certificate checker health (OCR may show unavailable on Vercel)
- `https://your-app.vercel.app/cert` → Certificate checker UI

Login with demo accounts:
- applicant@demo.local / demo123
- officer@demo.local / demo123
- admin@demo.local / demo123

## Known Limitations on Vercel

- ❌ Tesseract binary not available → Certificate OCR will return 503 with helpful message. Workaround: integrate cloud OCR (Google Vision, AWS Textract) or deploy certificate checker to Railway/Render/Fly.io where you can `apt install tesseract-ocr`.
- ⚠️ SQLite ephemeral → data resets on cold start. Use Postgres for persistence.
- ⚠️ File uploads stored in `/tmp/uploads` → ephemeral, not persisted. Use S3/Cloudinary for production.
- ✅ All other features work: auth, schemes, applications, eligibility engine, workflow, chatbot, ML advisory, photo scan forensic (OpenCV works on Vercel), admin dashboards.

## Alternative Deployments

For full OCR support:
- **Railway**: `railway up`, add `tesseract-ocr` to Dockerfile
- **Render**: Connect repo, add `apt-get install tesseract-ocr` in build command
- **Fly.io**: `fly launch`, Dockerfile with tesseract
- **Docker**: Use included `tribal-scholar/docker-compose.yml`

## Troubleshooting

- **Function size exceeds 250MB**: Remove sklearn/scipy from requirements.txt, app has fallbacks.
- **500 on API**: Check Vercel logs → Functions → View logs. Usually DB path or missing env.
- **Frontend 404 on refresh**: Ensure rewrites `/(.*) → /index.html` is present.
- **CORS errors**: We allow `*` in CORS middleware. Check `api.ts` base URL is `/api/v1`.
- **Database locked**: SQLite on serverless can have concurrency issues. Use Postgres.

## Security Notes

- All secrets in env vars, not code
- `SECRET_KEY` must be strong random in production
- File validation (MIME + size + signature) implemented
- Audit logs for all transitions
- RBAC + object-level checks
- Security headers set

## What Was Fixed for Vercel

- Unified `requirements.txt` with all deps
- Fixed `.vercelignore` (was ignoring needed files)
- Created `api/tribal.py` wrapper for FastAPI on Vercel
- Made `api/index.py` resilient to missing Tesseract/OpenCV
- Updated `tribal-scholar/backend/app/core/config.py` to use `/tmp` on Vercel
- Updated `database.py` to handle ephemeral FS
- Updated `main.py` for Vercel headers and error handling
- Updated `documents.py` and `applications.py` to use `/tmp/uploads`
- Made ML services resilient with fallback if sklearn missing
- Created proper `vercel.json` with builds, functions, rewrites, headers
- Fixed frontend `vite.config.ts` and `api.ts` for production base URL
- Added `.env.production` with `VITE_API_BASE=/api/v1`

Ready to deploy! 🚀
