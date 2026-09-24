-- TribalScholar AI — Prototype Schema (PostgreSQL compatible, also SQLite)
-- Generated from SQLAlchemy models; for reference.

-- Enable UUID extension for Postgres (SQLite uses text uuid)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users, roles, user_role_assignments
CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, phone TEXT, full_name TEXT NOT NULL, password_hash TEXT NOT NULL, is_active BOOLEAN DEFAULT TRUE, is_verified BOOLEAN DEFAULT FALSE, created_at TIMESTAMP, updated_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS user_role_assignments (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, role_id TEXT REFERENCES roles(id) ON DELETE CASCADE, assigned_at TIMESTAMP, assigned_by TEXT REFERENCES users(id), UNIQUE(user_id, role_id));

-- institutes, applicants
CREATE TABLE IF NOT EXISTS institutes (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE, state TEXT, district TEXT, type TEXT, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS applicants (id TEXT PRIMARY KEY, user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE, full_name TEXT NOT NULL, dob TEXT, gender TEXT, category TEXT, state TEXT, district TEXT, mobile TEXT, email TEXT, address TEXT, institute_id TEXT REFERENCES institutes(id), course TEXT, admission_year INTEGER, annual_family_income INTEGER, parent_name TEXT, bank_account_placeholder TEXT, created_at TIMESTAMP, updated_at TIMESTAMP);

-- schemes and configurator
CREATE TABLE IF NOT EXISTS schemes (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, department TEXT, education_level TEXT, target_category TEXT, income_limit INTEGER, age_min INTEGER, age_max INTEGER, seats INTEGER DEFAULT 100, start_date TIMESTAMP, end_date TIMESTAMP, status TEXT DEFAULT 'draft', is_published BOOLEAN DEFAULT FALSE, current_version INTEGER DEFAULT 1, created_by TEXT REFERENCES users(id), created_at TIMESTAMP, updated_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS scheme_versions (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, version_number INTEGER NOT NULL, change_notes TEXT, snapshot JSON, created_by TEXT REFERENCES users(id), created_at TIMESTAMP, UNIQUE(scheme_id, version_number));
CREATE TABLE IF NOT EXISTS scheme_fields (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, field_key TEXT NOT NULL, label TEXT NOT NULL, field_type TEXT NOT NULL, placeholder TEXT, required BOOLEAN DEFAULT FALSE, validation JSON, options JSON, help_text TEXT, order_index INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS scheme_documents (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, document_key TEXT NOT NULL, document_name TEXT NOT NULL, required BOOLEAN DEFAULT TRUE, allowed_file_types JSON, max_size_mb INTEGER DEFAULT 5, validity_required BOOLEAN DEFAULT FALSE, expiry_rule_days INTEGER, help_text TEXT, order_index INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS scheme_rules (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, field_key TEXT NOT NULL, operator TEXT NOT NULL, value TEXT, action TEXT NOT NULL, message TEXT, order_index INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS scheme_score_weights (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, component TEXT NOT NULL, weight INTEGER NOT NULL, description TEXT, is_active BOOLEAN DEFAULT TRUE);

-- workflow
CREATE TABLE IF NOT EXISTS workflow_definitions (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, state TEXT NOT NULL, label TEXT, description TEXT, order_index INTEGER DEFAULT 0, is_initial BOOLEAN DEFAULT FALSE, is_final BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS workflow_transitions (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, from_state TEXT NOT NULL, to_state TEXT NOT NULL, allowed_roles JSON, require_reason BOOLEAN DEFAULT FALSE, require_evidence BOOLEAN DEFAULT FALSE, condition JSON, created_at TIMESTAMP);

-- applications
CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, applicant_id TEXT REFERENCES applicants(id) ON DELETE CASCADE, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, scheme_version INTEGER DEFAULT 1, status TEXT DEFAULT 'DRAFT', current_stage TEXT DEFAULT 'DRAFT', data JSON DEFAULT '{}', eligibility_result JSON, verification_priority JSON, merit_score JSON, submitted_at TIMESTAMP, updated_at TIMESTAMP, created_at TIMESTAMP, normalized_name TEXT, duplicate_flag BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS application_field_values (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, field_key TEXT NOT NULL, field_type TEXT, value TEXT, created_at TIMESTAMP, updated_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS application_status_history (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, from_status TEXT, to_status TEXT NOT NULL, actor_id TEXT REFERENCES users(id), actor_role TEXT, reason TEXT, metadata_json JSON, created_at TIMESTAMP);

-- documents
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, applicant_id TEXT REFERENCES applicants(id), document_key TEXT NOT NULL, document_name TEXT, file_name TEXT, file_path TEXT, file_size INTEGER, mime_type TEXT, status TEXT DEFAULT 'uploaded', uploaded_at TIMESTAMP, verified_at TIMESTAMP, verified_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS document_extractions (id TEXT PRIMARY KEY, document_id TEXT REFERENCES documents(id) ON DELETE CASCADE, extracted_text TEXT, extracted_fields JSON, confidence_scores JSON, ocr_engine TEXT DEFAULT 'tesseract-mock', ocr_version TEXT DEFAULT 'v1-demo', needs_correction BOOLEAN DEFAULT FALSE, corrected_by_applicant BOOLEAN DEFAULT FALSE, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS document_verification_flags (id TEXT PRIMARY KEY, document_id TEXT REFERENCES documents(id), application_id TEXT REFERENCES applications(id), flag_type TEXT NOT NULL, severity TEXT DEFAULT 'medium', message TEXT, evidence JSON, created_at TIMESTAMP);

-- verification, decisions, merit
CREATE TABLE IF NOT EXISTS verification_tasks (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, assigned_to TEXT REFERENCES users(id), assigned_role TEXT, task_type TEXT, status TEXT DEFAULT 'pending', priority INTEGER DEFAULT 0, created_at TIMESTAMP, completed_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS officer_decisions (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, officer_id TEXT REFERENCES users(id) NOT NULL, officer_role TEXT NOT NULL, decision TEXT NOT NULL, reason TEXT NOT NULL, evidence_considered JSON, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS merit_scores (id TEXT PRIMARY KEY, application_id TEXT UNIQUE REFERENCES applications(id) ON DELETE CASCADE, total_score FLOAT DEFAULT 0, components JSON, breakdown JSON, calculated_at TIMESTAMP, calculated_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS selection_lists (id TEXT PRIMARY KEY, scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE, name TEXT NOT NULL, status TEXT DEFAULT 'draft', entries JSON, published_at TIMESTAMP, published_by TEXT REFERENCES users(id), created_at TIMESTAMP);

-- appeals, grievances, notifications, audit
CREATE TABLE IF NOT EXISTS appeals (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, applicant_id TEXT REFERENCES applicants(id), subject TEXT NOT NULL, description TEXT NOT NULL, status TEXT DEFAULT 'Submitted', evidence_files JSON, officer_response TEXT, created_at TIMESTAMP, updated_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS grievances (id TEXT PRIMARY KEY, applicant_id TEXT REFERENCES applicants(id), application_id TEXT REFERENCES applications(id), category TEXT, subject TEXT NOT NULL, description TEXT NOT NULL, status TEXT DEFAULT 'Submitted', response TEXT, created_at TIMESTAMP, updated_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, related_entity TEXT, related_id TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), actor_role TEXT, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, old_value JSON, new_value JSON, reason TEXT, ip_address TEXT, user_agent TEXT, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY, applicant_id TEXT REFERENCES applicants(id), consent_type TEXT NOT NULL, consented BOOLEAN DEFAULT FALSE, consented_at TIMESTAMP, ip_address TEXT);
CREATE TABLE IF NOT EXISTS duplicate_indicators (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, matched_application_id TEXT REFERENCES applications(id), match_type TEXT NOT NULL, similarity_score FLOAT, evidence JSON, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS risk_indicators (id TEXT PRIMARY KEY, application_id TEXT REFERENCES applications(id) ON DELETE CASCADE, indicator_type TEXT NOT NULL, score INTEGER NOT NULL, severity TEXT, evidence JSON, created_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS system_settings (id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, value JSON, description TEXT, updated_at TIMESTAMP);

-- indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
