# TribalScholar AI — Complete Prototype Deliverable

**Status: ✅ Fully Runnable — Backend + Frontend + Database + Seeded Demo Data**

> Prototype / Demonstration System — Synthetic Data Only • AI assists, Human decides • No real Aadhaar/bank/government integration

---

## 1. Complete Folder Structure
```
tribal-scholar/
├── frontend/
│   ├── src/
│   │   ├── components/Layout.tsx          # Header, Footer, Card, StatusBadge (responsive, gov style)
│   │   ├── pages/
│   │   │   ├── Landing.tsx                # Hero, how it works, AI benefits, demo schemes
│   │   │   ├── Schemes.tsx                # Discovery + filters (state/course/category/deadline)
│   │   │   ├── SchemeDetail.tsx           # Eligibility, docs, merit weights, apply
│   │   │   ├── About.tsx
│   │   │   ├── auth/Login.tsx, Register.tsx
│   │   │   ├── applicant/
│   │   │   │   ├── Dashboard.tsx          # Progress timeline, apps list
│   │   │   │   ├── Apply.tsx              # DYNAMIC FORM (scheme_fields → UI) + Docs + OCR + Evaluate
│   │   │   │   ├── Profile.tsx            # Full synthetic profile
│   │   │   │   ├── Timeline.tsx           # Visual workflow history
│   │   │   │   └── Appeals.tsx            # Appeals + Grievances
│   │   │   ├── officer/
│   │   │   │   ├── Dashboard.tsx          # Stats, charts
│   │   │   │   ├── Queue.tsx              # Filters: status/scheme/district/priority
│   │   │   │   └── Review.tsx             # 3-PANE WORKSPACE (applicant|documents|AI evidence)
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.tsx          # Analytics via Recharts
│   │   │   │   ├── SchemeConfigurator.tsx # ★ NO-CODE: 7 tabs (Basic/Eligibility/Fields/Documents/Merit/Workflow/Preview)
│   │   │   │   ├── Analytics.tsx
│   │   │   │   ├── Audit.tsx
│   │   │   │   ├── Fairness.tsx
│   │   │   │   ├── Simulator.tsx
│   │   │   │   └── Users.tsx
│   │   │   ├── committee/Dashboard.tsx    # Ranked by merit, select/waitlist
│   │   │   └── NotFound.tsx
│   │   ├── services/api.ts
│   │   ├── hooks/useAuth.tsx              # JWT, role checks, auto-redirect
│   │   ├── locales/en.json, hi.json
│   │   ├── App.tsx (routing + Protected)
│   │   ├── main.tsx
│   │   └── index.css (gov style, focus visible)
│   ├── vite.config.ts, tailwind.config.js, postcss.config.js, tsconfig.json, index.html, package.json
├── backend/
│   ├── app/
│   │   ├── core/config.py, database.py, security.py (JWT bcrypt)
│   │   ├── models/models.py               # 30 entities: users, roles, applicants, institutes, schemes, scheme_versions, scheme_fields, scheme_documents, scheme_rules, scheme_score_weights, workflow_definitions, workflow_transitions, applications, application_field_values, application_status_history, documents, document_extractions, document_verification_flags, verification_tasks, officer_decisions, merit_scores, selection_lists, appeals, grievances, notifications, audit_logs, consents, duplicate_indicators, risk_indicators, system_settings
│   │   ├── schemas/schemas.py
│   │   ├── routes/auth.py, profile.py, schemes.py, applications.py, documents.py, officer.py, committee.py, admin.py, appeals.py
│   │   ├── services/eligibility.py (deterministic rule engine) + ai_services.py (OCR, quality, consistency, duplicate, priority, merit)
│   │   ├── workflow/engine.py (state machine)
│   │   ├── seed.py (demo data) + main.py (FastAPI, CORS, security headers, auto-seed)
│   ├── migrations/ (alembic placeholder)
│   ├── tests/test_eligibility.py
│   ├── requirements.txt
│   └── tribal_scholar.db (SQLite — Postgres-ready via DATABASE_URL)
├── ai-service/ (ocr, quality_checker, consistency, duplicate_detection, risk — integrated in backend/services)
├── database/schema.sql
├── docs/API.md, ARCHITECTURE.md, SECURITY.md, DEMO.md
├── docker-compose.yml, .env.example, .gitignore, README.md
└── uploads/ (protected local storage per application)
```

---

## 2. Installation Commands
```bash
# Clone / enter
cd tribal-scholar

# Backend
cd backend
pip install -r requirements.txt
# Or: pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings python-jose[cryptography] passlib bcrypt python-multipart pillow pytesseract rapidfuzz email-validator python-dateutil

# Frontend
cd ../frontend
npm install
```

---

## 3. Environment Setup
```bash
cp .env.example .env
# Edit .env if needed:

# Backend
DATABASE_URL=sqlite:///./tribal_scholar.db
# For Postgres: postgresql://user:password@localhost:5432/tribalscholar
SECRET_KEY=change-me-to-a-strong-random-secret-key-demo-only-32chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
```

---

## 4. Database Setup
```bash
# SQLite auto-creates on first run: backend/tribal_scholar.db
# Tables created via Base.metadata.create_all + seed runs on startup

# For Postgres:
# createdb tribalscholar
# export DATABASE_URL=postgresql://user:pass@localhost:5432/tribalscholar
# Then start backend — same auto-create

# Optional manual seed check:
cd backend
python3 -c "from app.seed import seed_database; seed_database()"
```

---

## 5. Backend Start Command
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Docs: http://localhost:8000/docs
# Health: http://localhost:8000/health  and  /api/v1/health
```

**Live Preview (this sandbox):** `https://8000-io0iqx9snqrmjexdpr4g5.e2b.app` (proxied to localhost:8000) — see `https://8000-io0iqx9snqrmjexdpr4g5.e2b.app/docs`

---

## 6. Frontend Start Command
```bash
cd frontend
npm run dev
# Vite serves at http://localhost:5173
# Built: npm run build && vite preview
```

**Live Preview (this sandbox):** `https://5173-io0iqx9snqrmjexdpr4g5.e2b.app`

---

## 7. Demo Accounts (password: `demo123`, OTP mock: `123456`)
| Role | Email | Name |
|------|-------|------|
| Applicant | `applicant@demo.local` | Laxmi Hembram (Jharkhand, ST, PhD, income ₹2,40,000) |
| Institute Verifier | `institute@demo.local` | Prof. S. Toppo |
| District/State Nodal Officer | `officer@demo.local` | Rajesh Kumar |
| Scheme Officer | (admin also) | Priya Singh |
| Selection Committee | `committee@demo.local` | Dr. A. Murmu |
| Finance/DBT Officer | `finance@demo.local` | Anita Desai |
| Super Admin | `admin@demo.local` | Priya Singh (has super_admin + scheme_officer) |
| Auditor | `auditor@demo.local` | Vikram Patel |

---

## 8. Demo Workflow (22 steps — core story)

1. **Admin** `admin@demo.local` → `/admin/schemes` → opens **National Fellowship for ST Students — Demo**
2. **Configurator**: sees 7 tabs → Basic (name, seats, dates), Eligibility (category ST, income 500k, age 18-35), Dynamic Fields (17 fields incl. Research Area), Documents (5 docs), Merit (40/25/15/10/10=100), Workflow (DRAFT→…→FELLOWSHIP_MONITORING), Preview
3. **Admin adds field** `Research Area` → Save → audit log `SCHEME_UPDATED`, version bump
4. **Applicant** logs in → `/schemes` → clicks **National Fellowship** → **Sees Research Area automatically** (dynamic). If admin removes Annual Income, it disappears — no hard-code.
5. **Applicant** → `View & Apply` → draft created
6. **Fills**: Laxmi Hembram, Jharkhand, ST, PhD, income 240000, Research Area “Tribal Anthropology”, etc. → **Save Draft** (localStorage + server)
7. **Uploads synthetic docs**: ST Certificate, Income Certificate, Marksheet, Admission Proof (synthetic JPGs; Marksheet intentionally has `Laxmi Hembrom` vs `Laxmi Hembram`)
8. **OCR** runs (mock heuristic, since tesseract not in sandbox) → extracted fields with confidence: Name 91% (demo), cert numbers, institution, marks 78.5%
9. **Consistency checker** (RapidFuzz) → `Possible name variation detected: Application Laxmi Hembram vs Document Laxmi Hembrom, similarity 92.3, Manual review recommended` (not reject)
10. **Eligibility engine** (deterministic): Category PASS (ST in [ST]), Income PASS (240k ≤500k), Age PASS (28) → **ELIGIBLE**
11. **Verification Priority**: 80/100 High (20+20 name variations + 40 low-contrast) → `High priority manual verification recommended`
12. **Merit**: 82/100 (Academic 34/40, Research 21/25, Institution 13/15, Socio-economic 8/10, Interview 6/10) — explainable
13. **Submit** → status `SUBMITTED` → `AUTOMATED_CHECK`
14. **Officer queue** (`officer@demo.local`) → `/officer/queue` → filters by High priority → sees Laxmi
15. **Workspace** `/officer/review/{id}`: **Left** applicant info, **Center** documents + OCR, **Right** AI evidence (priority, flags, merit) — officer decides
16. **Officer decision** `Verify` with reason → `AUTOMATED_CHECK → INSTITUTE_VERIFICATION` → again `→ OFFICER_SCRUTINY → COMMITTEE_REVIEW`
17. **Committee** (`committee@demo.local`) → `/committee/dashboard` → ranked by merit (Laxmi 82) → `Selected` with reason
18. **Status** → `SELECTED` → Finance could `SANCTIONED → PAYMENT_RELEASED`
19. **Audit** → `/admin/audit` shows `APPLICATION_CREATED, RULE_EVALUATED, DOCUMENT_UPLOADED, OCR_COMPLETED, OFFICER_DECISION, COMMITTEE_DECISION` with actor/role/timestamp/reason
20. **Applicant timeline** `/applicant/timeline/{id}` → visual: Created → Submitted → Automated Checks → Document Verification → Officer Scrutiny → Committee Review → Decision → Sanction → Payment (with timestamps/roles)
21. **Scheme Simulator** `/admin/simulator` → change income 500k→600k → Before Eligible 72 / After 81 (synthetic)
22. **Applicant sees** updated status `SELECTED` on `/applicant/dashboard` progress: ✓ Submitted ✓ Automated Check ✓ Documents → Officer Verification → Committee → Final Decision

---

## 9. API Documentation
See `docs/API.md` — all endpoints under `/api/v1` with request validation, response schemas, pagination, UUIDs, ISO-8601, structured errors.

Quick test:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"applicant@demo.local","password":"demo123"}'
curl http://localhost:8000/api/v1/schemes -H "Authorization: Bearer <token>"
curl http://localhost:8000/api/v1/admin/dashboard -H "Authorization: Bearer <admin_token>"
```

---

## 10. Known Prototype Limitations
- **Synthetic data only** — no real Aadhaar, bank, or government DB integration (placeholders)
- **Mock OCR** fallback when Tesseract binary not installed (Pillow + heuristic field extraction with confidence; real Tesseract works if installed)
- **Local file storage** (`./uploads/{app_id}/`) — production would use MinIO/S3
- **Mock OTP** `123456`, in-app notifications (no email/SMS)
- **SQLite file** for ease; Postgres ready via `DATABASE_URL`
- **No 100% OCR accuracy**, no fraud guarantee, no auto-government approval
- **Not a production government deployment**, not a replacement for human officers — wording is `AI-assisted`, `advisory`, `verification priority`, `human-in-the-loop`, `configurable prototype`, `future official integration`

## 11. Final Quality Checklist (all verified in this runs)
- ✅ Frontend starts (Vite 5173), Backend starts (uvicorn 8000), DB connects, seed loads
- ✅ Login/roles work, configurator updates form dynamically
- ✅ Dynamic form, submit, document upload, OCR → confidence 91% name
- ✅ Eligibility PASS with explanation, workflow transitions validated
- ✅ Officer queue, AI flags (name variation 92.3), priority 80/100 High, merit 82/100
- ✅ Committee, audit, analytics (Recharts), fairness, simulator
- ✅ Mobile responsive (Tailwind grid, touch targets), Hindi toggle (locales), accessibility (focus, semantic), low-connectivity (draft localStorage, retry)
- ✅ No console errors, no fake integrations, no real personal data, no AI final decision

---

## 12. Quick Start (Copy-Paste)
```bash
# Terminal 1 — Backend
cd tribal-scholar/backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd tribal-scholar/frontend
npm install
npm run dev

# Open:
# Frontend http://localhost:5173  (or https://5173-io0iqx9snqrmjexdpr4g5.e2b.app)
# Backend docs http://localhost:8000/docs
# Login applicant@demo.local / demo123
```

---

**Built as a coherent working prototype, not disconnected mocks. The core demonstration — admin configures → form adapts → OCR → fuzzy match → eligibility → priority → human decides → audit — works end-to-end.**
