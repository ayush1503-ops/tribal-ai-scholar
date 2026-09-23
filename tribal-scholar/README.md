# TribalScholar AI — Prototype

**AI-assisted, configurable scholarship management platform for ST applicants. Prototype with synthetic data only. AI provides evidence, humans decide.**

> **Prototype Banner:** Prototype / Demonstration System — Synthetic Data Only • AI assists, Human decides • No real Aadhaar/bank/government integration.

## What this is
- **No-Code Scheme Configurator** — admin creates income limits, age, categories, dynamic fields (text/textarea/number/date/dropdown/radio/checkbox/file/email/phone), required/optional documents, validity rules, seats, dates, merit weights (must total 100), workflow states & transitions. Applicant form auto-generates from `scheme_fields` + `scheme_documents` + `scheme_rules`.
- **Deterministic eligibility engine** — rules evaluated transparently (expected vs actual → PASS/FAIL) with explanations. No AI final decision.
- **Document AI (advisory)** — file validation (MIME + signature), preprocessing, OCR (Tesseract if available, else mock heuristic), field extraction with confidence, quality checks (blurry/cropped/blank/wrong-doc/duplicate/expired), fuzzy consistency (RapidFuzz), duplicate indicators, verification priority 0–100 (Low/Medium/High) — never says “Fraud confirmed”.

## Stack
Frontend: React + Vite + TS + Tailwind + React Router + Axios + React Hook Form + Recharts + Lucide  
Backend: Python FastAPI + SQLAlchemy + Pydantic + Alembic + SQLite (PostgreSQL via DATABASE_URL)  
AI: Pillow + pytesseract + RapidFuzz

## Folder Structure
See spec — `frontend/`, `backend/app/{core,models,routes,services,workflow}`, `ai-service/`, `database/`, `docs/`.

## Installation & Run

### 1. Environment
```bash
cp .env.example .env   # adjust DATABASE_URL, SECRET_KEY, FRONTEND_URL
# Backend
cd backend
pip install -r requirements.txt
# Frontend
cd ../frontend
npm install
```

### 2. Database
SQLite auto-creates at `backend/tribal_scholar.db`. For Postgres: `DATABASE_URL=postgresql://user:pass@localhost:5432/tribalscholar`
```bash
# Tables auto-created on startup via Base.metadata.create_all
# Seed runs automatically
```

### 3. Start Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Docs: http://localhost:8000/docs
# Health: http://localhost:8000/health
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
# http://localhost:5173
```

## Demo Accounts (password: demo123, OTP: 123456 mock)
- Applicant: applicant@demo.local
- Officer: officer@demo.local (district/scheme officer)
- Admin: admin@demo.local (super_admin)
- Committee: committee@demo.local
- Institute: institute@demo.local
- Finance: finance@demo.local
- Auditor: auditor@demo.local

## Demo Workflow (core story)
1. Admin → /admin/schemes → edit “National Fellowship for ST Students — Demo” add field Research Area → save.
2. Applicant login → Schemes → View & Apply → dynamic form now shows Research Area.
3. Fill: Laxmi Hembram, Jharkhand, ST, PhD, income 240000 → Save Draft → submit.
4. Upload docs: ST Certificate, Income Certificate, Marksheet (synthetic says “Laxmi Hembrom” — tests fuzzy), Admission Proof → OCR runs.
5. Click Evaluate → system shows possible spelling variation (Hembram vs Hembrom, similarity high) → Manual review recommended, not reject; eligibility PASS (income within 5L, category ST), verification priority 55/100 Medium-High, merit 82/100.
6. Officer queue → open workspace → left applicant, center docs, right AI evidence → make decision (Verify/Deficiency/Reject) with reason → audited.
7. Committee → ranked by merit → Selected/Waitlisted/Rejected.
8. Applicant sees timeline updated.

## API (prefix /api/v1)
Auth: POST /auth/register, /auth/login, /auth/otp/verify, /auth/refresh  
Profile: GET/PUT /profile  
Schemes: GET /schemes, GET /schemes/{id}, POST /admin/schemes, PUT /admin/schemes/{id}, POST /admin/schemes/{id}/publish, POST /admin/schemes/{id}/duplicate, GET /admin/schemes/{id}/versions, POST /admin/scheme-simulator/{id}  
Applications: POST /applications, GET /applications, GET /applications/{id}, PUT /applications/{id}, POST /applications/{id}/submit, POST /applications/{id}/evaluate, POST /applications/{id}/transition  
Documents: POST /applications/{id}/documents, GET /applications/{id}/documents, GET /documents/{id}, POST /documents/{id}/ocr, POST /documents/{id}/verify, POST /documents/{id}/correct  
Officer: GET /officer/queue, GET /officer/applications/{id}, POST /officer/applications/{id}/decision, GET /officer/dashboard/stats  
Committee: GET /committee/candidates, POST /committee/decision, GET/POST /committee/selection-lists  
Appeals: POST/GET /appeals, PUT /appeals/{id}, POST/GET /grievances  
Admin: GET /admin/dashboard, GET /admin/audit, GET /admin/analytics, GET /admin/fairness, GET /admin/users

## Security (prototype)
- bcrypt password hashing, JWT access+refresh, RBAC + object-level checks (applicant cannot access another’s application), ORM queries, CORS, security headers, file validation (extension+MIME+signature+size+protected storage), audit logs immutable, env secrets, rate-limit structure.

## AI Safety
Every AI output: result + confidence + evidence/reason + timestamp + model version. AI can: extract, classify, quality-check, compare, duplicate-detect, priority-score, recommend manual review. AI cannot: auto-reject/fraud/select/sanction/pay/override human.

## Testing
Backend: pytest for auth, RBAC, scheme creation, dynamic fields, rule engine, workflow, file validation, OCR handling, fuzzy matching, duplicate detection, audit.  
Frontend: routing, dynamic forms, flow, officer dashboard.  
Security: ensure isolation between roles (applicant↔admin, officer↔config, arbitrary transitions fail).

## Known Limitations
No real OCR accuracy guarantee, no government DBT/Aadhaar live integration, local storage only, mock OTP/email/SMS, SQLite file for demo.

## What NOT to claim
Not 100% OCR, not zero fraud, not auto government approval, not production deployment, not replacement of officers. Wording: AI-assisted, configurable prototype, human-in-the-loop, verification priority, synthetic data, future integration.

## License
Prototype demo — not for production.
