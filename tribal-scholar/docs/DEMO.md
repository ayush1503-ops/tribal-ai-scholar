# Demo Story — Complete Flow (22 steps)

This is the most important demonstration:
**Admin changes scheme configuration → applicant form changes automatically → applicant uploads documents → OCR extracts information → consistency checker detects spelling variation → deterministic eligibility runs → verification-priority flag is generated → officer reviews evidence → human makes final decision → audit trail records everything.**

## Setup
- Backend: `http://localhost:8000` (FastAPI, docs at `/docs`)
- Frontend: `http://localhost:5173`
- Demo accounts (password `demo123`):
  - Applicant: `applicant@demo.local` (Laxmi Hembram, Jharkhand, ST, PhD, income ₹2,40,000)
  - Officer: `officer@demo.local`
  - Admin: `admin@demo.local`
  - Committee: `committee@demo.local`
  - OTP for prototype: `123456`

## Steps

1. **Admin logs in** → `admin@demo.local` / `demo123` → navigates to `/admin/schemes`
2. **Admin opens Scheme Configurator** → selects “National Fellowship for ST Students — Demo” → sees tabs: Basic, Eligibility, Dynamic Fields, Documents, Merit, Workflow, Preview
3. **Admin configures**: Category=ST, Income limit ₹5,00,000, Required docs: ST Certificate, Income Certificate, Marksheet, Admission Proof (already configured)
4. **Admin adds new field** (to prove dynamic): Dynamic Fields → Add Field → key `research_area`, label `Research Area`, type `text`, required true → Save Scheme
5. **Applicant logs in** → `applicant@demo.local` → sees dynamically generated form → **Research Area now appears** (if admin removes Annual Income, it disappears)
6. **Applicant fills**: Laxmi Hembram, Jharkhand, ST, PhD, Income 240000, Research Area “Tribal Anthropology”, etc. → Save Draft (local + server)
7. **Applicant uploads synthetic documents** (synthetic white images with text):
   - ST Certificate (contains “Laxmi Hembrom” — intentional variation)
   - Income Certificate (“Laxmi Hembram” — correct)
   - Marksheet (“Laxmi Hembrom” — tests fuzzy)
   - Admission Proof (“Laxmi Hembram”)
8. **OCR reads** → extraction shows Name, Certificate number, Institution, Marks, Income, Issue date with confidence (Name 91% example)
9. **Marksheet says** `Laxmi Hembrom` vs Application `Laxmi Hembram`
10. **System detects** possible spelling variation via RapidFuzz (similarity 92.3, High) → flag `name_variation`, not reject
11. **System creates** `Manual Review Recommended` with verification priority 80/100 High (20+20 name variations + 40 low-contrast)
12. **System evaluates deterministic eligibility**: Category PASS, Income PASS (240k ≤500k), Age PASS → ELIGIBLE
13. **System calculates merit**: 82/100 (Academic 34/40, Research 21/25, Institution 13/15, Socio-economic 8/10, Interview 6/10) — explainable
14. **Application enters officer queue** → `SUBMITTED` → auto `AUTOMATED_CHECK` → awaiting officer
15. **Officer logs in** → `/officer/dashboard` shows pending, high priority → `/officer/queue` → filters by priority
16. **Officer opens application** → 3-pane workspace:
    - Left: Applicant information (Laxmi Hembram, ST, Jharkhand, PhD)
    - Center: Documents with status, OCR data, verification buttons
    - Right: AI evidence (⚠ name variation, verification priority 80/100 High, eligibility, merit)
17. **Officer reviews evidence** → sees fuzzy match explanation, not auto-reject
18. **Officer makes final decision** → selects `Verify` with reason → transitions `AUTOMATED_CHECK → INSTITUTE_VERIFICATION → OFFICER_SCRUTINY → COMMITTEE_REVIEW` (chain)
19. **Committee** → `/committee/dashboard` lists candidates ranked by merit → selects `Selected` with reason
20. **System records decision** → `officer_decisions` + `application_status_history`
21. **Audit log records** who, what, when, reason (e.g., `OFFICER_DECISION` by district_officer, `COMMITTEE_DECISION`, `SCHEME_UPDATED`)
22. **Applicant sees updated status** → `/applicant/dashboard` progress `✓ Submitted ✓ Automated Check ✓ Documents → Officer Verification → Committee → Final Decision` → Timeline shows timestamps and roles

## Verify No AI Final Decision
Every AI output states: `Verification Priority is advisory only — human officer makes final decision` and shows evidence/reason/confidence/timestamp.

## Scheme Simulator (admin)
`/admin/simulator` → change income limit 500k→600k → Before Eligible 72 → After 81 (synthetic).

## Fairness Monitoring
`/admin/fairness` shows aggregate district stats without labeling bias.

## Known Limitations for Demo
- No real Aadhaar/bank/DBT
- Mock OCR fallback when tesseract missing
- Local storage, in-app notifications
