# Security (Prototype Level)

Implemented correctly for prototype; not production audit.

- **Password hashing**: passlib bcrypt, never plaintext.
- **JWT**: access 60m, refresh 7d, HS256, secret via env `SECRET_KEY`.
- **RBAC**: role-level checks via `require_roles` decorator; object-level: applicant can only access own application (checked by applicant.user_id), officer cannot modify scheme config, etc. Backend enforces, not just frontend hiding.
- **Input validation**: Pydantic schemas, file extension/MIME/signature/size checks, ORM queries (no string SQL), ISO-8601 validation.
- **CORS**: allow localhost:5173, credentials, specific headers.
- **Security headers**: X-Content-Type-Options nosniff, X-Frame-Options DENY, X-XSS-Protection.
- **File validation**: allowed pdf/jpg/jpeg/png, mimetypes guess + Pillow verify, 5MB limit, stored under `./uploads/{app_id}/` not public URL, protected via auth.
- **Audit logs**: every important action creates record with actor, role, action, entity, old/new, reason, timestamp, IP/user-agent (where available). Immutable (no edit endpoint).
- **Secrets**: via `.env`, `.env.example` committed, `.env` gitignored, never expose DB credentials.
- **No arbitrary code**: rules stored as JSON, evaluated via safe interpreter (no eval/exec). No user DB queries.
- **Rate limiting structure**: placeholder (could add slowapi).
- **Session expiry**: JWT exp enforced, 401 triggers logout.

Never:
- store plaintext passwords
- expose private documents publicly
- trust frontend role
- allow arbitrary DB queries
- execute arbitrary rule code

Test checklist:
- applicant cannot GET another applicant's application → 403
- officer cannot POST /admin/schemes → 403
- normal user cannot access admin APIs → 403
- invalid workflow transition → 400
- file too large → 400
- invalid token → 401
