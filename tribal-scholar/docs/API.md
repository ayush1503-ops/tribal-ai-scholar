# TribalScholar AI — API Documentation (Prototype)

Base URL: `http://localhost:8000/api/v1`

All responses use JSON, ISO-8601 timestamps, UUID identifiers, structured errors.

## Authentication
- `POST /api/v1/auth/register` — body: {email, password, full_name, phone, role}
- `POST /api/v1/auth/login` — body: {email, password} → {access_token, refresh_token, user}
- `POST /api/v1/auth/otp/verify` — body: {email, otp} — mock OTP 123456
- `POST /api/v1/auth/refresh` — body: {refresh_token}
- `POST /api/v1/auth/logout` — header Authorization
- `GET  /api/v1/auth/me` — current user

Headers: `Authorization: Bearer <access_token>`

## Profile
- `GET  /api/v1/profile`
- `PUT  /api/v1/profile` — body: ApplicantCreate fields

## Schemes
- `GET  /api/v1/schemes?search=&category=&education_level=&status=&page=&page_size=`
- `GET  /api/v1/schemes/{id}`
- `POST /api/v1/admin/schemes` — requires super_admin/scheme_officer
- `PUT  /api/v1/admin/schemes/{id}`
- `POST /api/v1/admin/schemes/{id}/publish`
- `POST /api/v1/admin/schemes/{id}/duplicate`
- `GET  /api/v1/admin/schemes/{id}/versions`
- `POST /api/v1/admin/scheme-simulator/{id}` — body: {income_limit, seats}

## Applications
- `POST /api/v1/applications` — body: {scheme_id, data}
- `GET  /api/v1/applications?status=&scheme_id=&page=&page_size=`
- `GET  /api/v1/applications/{id}`
- `PUT  /api/v1/applications/{id}` — body: {data}
- `POST /api/v1/applications/{id}/submit`
- `POST /api/v1/applications/{id}/evaluate` — deterministic eligibility + VP + merit
- `POST /api/v1/applications/{id}/transition` — body: {to_status, reason}

## Documents
- `POST /api/v1/applications/{id}/documents` — form: document_key, file (multipart)
- `GET  /api/v1/applications/{id}/documents`
- `GET  /api/v1/documents/{id}`
- `POST /api/v1/documents/{id}/ocr`
- `POST /api/v1/documents/{id}/verify` — body: {action: verified|rejected|needs_review, reason}
- `POST /api/v1/documents/{id}/correct` — body: {extracted_fields}

## Officer
- `GET  /api/v1/officer/queue?status=&scheme_id=&verification_priority=&page=&page_size=`
- `GET  /api/v1/officer/applications/{id}`
- `POST /api/v1/officer/applications/{id}/decision` — body: {decision, reason}
- `GET  /api/v1/officer/dashboard/stats`

## Committee
- `GET  /api/v1/committee/candidates?scheme_id=`
- `POST /api/v1/committee/decision` — body: {application_id, decision, reason}
- `GET  /api/v1/committee/selection-lists`
- `POST /api/v1/committee/selection-lists`
- `POST /api/v1/committee/selection-lists/{id}/publish`

## Appeals / Grievances
- `POST /api/v1/appeals` — body: {application_id, subject, description}
- `GET  /api/v1/appeals`
- `PUT  /api/v1/appeals/{id}` — officer update
- `POST /api/v1/grievances`
- `GET  /api/v1/grievances`
- `PUT  /api/v1/grievances/{id}`

## Admin
- `GET  /api/v1/admin/dashboard`
- `GET  /api/v1/admin/audit?action=&entity=&page=&page_size=`
- `GET  /api/v1/admin/analytics`
- `GET  /api/v1/admin/fairness`
- `GET  /api/v1/admin/users`
- `PUT  /api/v1/admin/users/{id}/roles`
- `GET  /api/v1/admin/notifications`

## Error Format
```json
{
  "detail": "Human readable message"
}
```
Validation errors return 422 with field details. Never expose stack traces (hidden unless DEBUG).

## Pagination
All list endpoints return `{items, total, page, page_size}`

## Security Notes (prototype)
- Passwords hashed with bcrypt
- JWT access (60m) + refresh (7d)
- RBAC + object-level checks (applicant cannot access another's application) — backend enforced
- File validation: extension, MIME, signature, size 5MB, protected storage
- CORS enabled for localhost:5173
