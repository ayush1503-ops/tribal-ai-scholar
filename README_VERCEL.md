# Tribal AI Scholar — Vercel Ready & Fully Functional

This repository contains **two fully functional applications** unified for Vercel deployment:

## 🌟 Apps Included

### 1. Certificate Check Desk (Flask + OpenCV + Tesseract)
- **Purpose**: Privacy-first SC/ST certificate screening assistant
- **Features**: Camera capture, OpenCV page detection, OCR extraction, QR decode, official verification workflow
- **Routes**: `/cert`, `/verify`, `/certificate`, `/api/health`, `/api/analyze`
- **Tech**: Flask, OpenCV, Pillow, pytesseract

### 2. Tribal Scholar Platform (FastAPI + React + ML)
- **Purpose**: AI-assisted, configurable scholarship management for ST applicants
- **Features**:
  - No-code scheme configurator (fields, documents, rules, scoring, workflow)
  - Deterministic eligibility engine
  - Document AI (OCR, quality checks, fuzzy matching, forensic photo scan)
  - Role-based workflows (Applicant, Officer, Admin, Committee, Finance, Auditor)
  - Chatbot (Bilingual Sahayak v2) + 5 ML models
  - Photo scan forensic (ELA, blur, noise, EXIF)
- **Frontend**: React + Vite + Tailwind, served at `/`
- **Backend**: FastAPI + SQLAlchemy, served at `/api/v1/*`
- **Routes**: `/`, `/schemes`, `/login`, `/applicant/*`, `/officer/*`, `/admin/*`, `/photo-scan`, `/ml-demo`, `/api/v1/*`, `/health`, `/api/docs`

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ayush1503-ops/tribal-ai-scholar)

### Steps:
1. Click Deploy button or import repo in Vercel dashboard
2. Vercel auto-detects `vercel.json`:
   - Build: `cd tribal-scholar/frontend && npm install && npm run build`
   - Output: `tribal-scholar/frontend/dist`
   - Functions: `api/index.py` (Flask) + `api/tribal.py` (FastAPI)
3. Set environment variables:
   ```
   SECRET_KEY=your-strong-32-char-secret
   DATABASE_URL=sqlite:////tmp/tribal_scholar.db  (or Postgres URL)
   FRONTEND_URL=https://your-app.vercel.app
   ```
4. Deploy — done!

**Test URLs after deploy:**
- `/` → Tribal Scholar landing
- `/health` → Tribal API health
- `/api/v1/health` → Tribal API health
- `/api/docs` → FastAPI Swagger docs
- `/api/health` → Certificate checker health
- `/cert` → Certificate checker UI

**Demo Logins (password: demo123, OTP: 123456 mock):**
- applicant@demo.local
- officer@demo.local
- admin@demo.local
- committee@demo.local

## 🛠️ Local Development

### Certificate Checker:
```bash
pip install -r requirements-full.txt
# Install Tesseract: https://github.com/tesseract-ocr/tesseract
# Ubuntu: sudo apt install tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin
python app.py  # http://localhost:8000
```

### Tribal Scholar:
```bash
# Backend
cd tribal-scholar/backend
pip install -r requirements-full.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # http://localhost:8000/docs

# Frontend
cd tribal-scholar/frontend
npm install
npm run dev  # http://localhost:5173
```

## 📦 Project Structure

```
├── api/
│   ├── index.py          # Flask certificate checker (Vercel function)
│   └── tribal.py         # FastAPI wrapper (Vercel function)
├── certificate_checker/  # Certificate logic
├── templates/            # Flask templates
├── static/               # Flask static
├── tribal-scholar/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/ (config, database, security)
│   │   │   ├── models/
│   │   │   ├── routes/ (auth, schemes, applications, documents, officer, etc.)
│   │   │   ├── services/ (AI, chatbot, ML)
│   │   │   └── workflow/
│   │   └── ml/ (fake_detector, classifiers, etc.)
│   └── frontend/
│       ├── src/
│       │   ├── pages/ (Landing, Schemes, Applicant, Officer, Admin, etc.)
│       │   ├── components/
│       │   └── services/api.ts
│       └── dist/ (built)
├── vercel.json           # Vercel config (builds, functions, rewrites)
├── requirements.txt      # Slim Python deps for Vercel (<250 MB)
├── requirements-full.txt # Full deps for local/Docker (OpenCV + ML)
└── VERCEL_DEPLOY.md      # Detailed deploy guide
```

## ✅ What Was Fixed for Vercel

- Slim `requirements.txt` for Vercel; `requirements-full.txt` adds OpenCV + ML for local use
- Fixed `.vercelignore` (was ignoring needed files)
- Created `api/tribal.py` wrapper with Mangum for FastAPI on Vercel
- Made `api/index.py` resilient to missing Tesseract
- Updated backend config to use `/tmp` on Vercel (ephemeral FS)
- Updated database.py for serverless pool settings
- Updated main.py for Vercel headers, error handling, docs URLs
- Fixed upload dirs to use `/tmp/uploads` on Vercel
- Made ML services fallback if sklearn/scipy missing
- Created proper `vercel.json` with rewrites for SPA + APIs
- Fixed frontend `vite.config.ts` and `api.ts` for production
- Added `.env.production` with `VITE_API_BASE=/api/v1`
- Frontend build tested: 842KB JS (229KB gz), 50KB CSS

## ⚠️ Vercel Limitations & Workarounds

- **Tesseract binary missing**: Certificate OCR returns 503 with helpful message. Solutions:
  - Use cloud OCR (Google Vision, AWS Textract)
  - Deploy certificate checker to Railway/Render/Fly.io (supports apt packages)
  - Docker deployment

- **SQLite ephemeral**: Data resets on cold start. Use Postgres:
  - Vercel Postgres, Neon, Supabase, Railway
  - Set `DATABASE_URL=postgresql://...`

- **Uploads ephemeral**: Files in `/tmp/uploads` not persisted. Use S3/Cloudinary for prod.

- **Function size**: If >250MB, remove `scikit-learn`/`scipy` (app has fallbacks).

## 🔒 Security

- bcrypt password hashing, JWT, RBAC, object-level checks
- File validation (MIME + signature + size)
- Audit logs, security headers, CORS
- No secrets in code, env vars only

## 📚 More Docs

- `VERCEL_DEPLOY.md` — Detailed deployment guide
- `tribal-scholar/README.md` — Tribal Scholar docs
- `tribal-scholar/docs/` — Architecture, API, Security, Demo, Chatbot ML
- Original `README.md` — Certificate checker details

## 🧪 Tests

```bash
pip install -r requirements-full.txt
python -m unittest discover -s tests -v  # Certificate checker
cd tribal-scholar/backend && pytest  # Tribal Scholar (if pytest installed)
```

## 📄 License

Prototype demo — not for production. Synthetic data only.

---

**Ready to deploy?** Push to GitHub and import in Vercel. See `VERCEL_DEPLOY.md` for full guide.
