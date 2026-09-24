# TribalScholar AI — Architecture (Prototype)

## Overview
Configurable scholarship platform where admin changes scheme config → applicant form auto-changes → OCR assists → deterministic eligibility → verification priority → human decides. AI is advisory, not final.

## Frontend (React + Vite + TS + Tailwind)
- React Router for role-based routes
- Axios for API, interceptors for JWT
- React Hook Form for dynamic form generation (field_type → component)
- Recharts for analytics
- Lucide React icons
- Responsive mobile-first, government style (white cards, subtle borders, dark green primary, neutral backgrounds)

Pages:
- Public: Landing, About, Schemes, SchemeDetail, Login, Register
- Applicant: Dashboard, Profile, Apply (dynamic), Documents, Timeline, Appeals/Grievances, Notifications
- Officer: Dashboard, Queue, Review (3-pane workspace)
- Committee: Dashboard (merit-ranked), decision
- Admin: Dashboard, SchemeConfigurator (7 tabs), Analytics, Audit, Fairness, Simulator, Users
- Finance: stub

Dynamic Form: `scheme_fields` array from backend drives rendering:
```
field_type=text → <input>
number → <input type=number>
dropdown → <select>
radio → radio group
date → date picker
file → upload (separate documents endpoint)
```

## Backend (FastAPI + SQLAlchemy + Pydantic)
- REST under `/api/v1`, UUIDs, ISO-8601, pagination
- Layers: core (config, security, database), models (SQLAlchemy), schemas (Pydantic), routes, services (eligibility, ai_services), workflow (state machine)

### Key Tables (relational, normalized)
users, roles, user_role_assignments, applicants, institutes, schemes, scheme_versions, scheme_fields, scheme_documents, scheme_rules, scheme_score_weights, workflow_definitions, workflow_transitions, applications, application_field_values, application_status_history, documents, document_extractions, document_verification_flags, verification_tasks, officer_decisions, merit_scores, selection_lists, appeals, grievances, notifications, audit_logs, consents, duplicate_indicators, risk_indicators, system_settings

Foreign keys + indexes, not one huge table.

### State Machine
DRAFT → SUBMITTED → AUTOMATED_CHECK → DEFICIENCY_RAISED → RESUBMITTED → INSTITUTE_VERIFICATION → OFFICER_SCRUTINY → COMMITTEE_REVIEW → SELECTED/WAITLISTED/REJECTED → SANCTIONED → PAYMENT_RELEASED → FELLOWSHIP_MONITORING
Every transition validates current state, user role, required info, stores reason/actor/timestamp/audit. No arbitrary frontend changes.

### Eligibility Engine (deterministic)
- Built-in checks: category in allowed, income <= limit, age range, document missing
- Custom rules from `scheme_rules` stored as JSON {field_key, operator, value, action} — no code execution
- Shows: rule, expected, actual, result, explanation
- Never uses AI for final eligibility.

### AI Services (Python)
- Document quality: blurry/cropped/unreadable/blank/wrong-doc/expired via heuristics (Pillow histogram, filename, size) → penalty score
- OCR pipeline: validation → preprocessing (resize, grayscale, contrast) → pytesseract or mock heuristic (fallback extracts synthetic fields with confidence 91% for name) → field extraction → confidence → applicant correction → human verification
- Consistency: RapidFuzz fuzzy matching (ratio, token_sort) after normalization (lowercase, punctuation removal) → flags name variation etc., shows similarity, recommends manual review
- Duplicate detection: mobile/email exact, DOB+normalized name fuzzy, certificate hash
- Verification priority: sum of flag scores (duplicate 20, mismatch 20, low quality 15, etc.) max 100, levels Low/Medium/High, transparent reasons
- Merit scoring: configurable weights total 100, explainable per component (academic etc.), deterministic for demo (Laxmi → 82/100)
- All AI outputs include confidence, evidence, timestamp, version, and note “advisory only”.

## Database
SQLite file `tribal_scholar.db` for prototype; Postgres ready via `DATABASE_URL=postgresql://...` (SQLAlchemy agnostic). Alembic structure present for migrations.

## Security
- bcrypt hashing, JWT, RBAC + object-level, ORM queries, CORS, security headers, file validation, protected storage, audit logs immutable, env secrets, rate-limit structure.

## Dev Order (vertical slices)
Phase 1 env, Phase 2 auth, Phase 3 scheme engine, Phase 4 applicant form, Phase 5 documents, Phase 6 workflow, Phase 7 eligibility, Phase 8 AI, Phase 9 merit, Phase 10 dashboards.

## Deployment (prototype)
- Backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Frontend: `npm run dev` (Vite) or `npm run build` + preview

## Limitations
Prototype only, synthetic data, mock OCR fallback, local storage, no object storage, no paid services.
