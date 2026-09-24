import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, JSON, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from ..core.database import Base
import uuid as uuid_lib

def gen_uuid():
    return str(uuid_lib.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Role(Base):
    __tablename__ = "roles"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(50), unique=True, nullable=False)  # applicant, institute_verifier, district_officer, scheme_officer, selection_committee, finance_officer, super_admin, auditor
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

class UserRoleAssignment(Base):
    __tablename__ = "user_role_assignments"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(String(36), ForeignKey("users.id"))
    __table_args__ = (UniqueConstraint('user_id', 'role_id', name='uq_user_role'),)

class Institute(Base):
    __tablename__ = "institutes"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True)
    state = Column(String(100))
    district = Column(String(100))
    type = Column(String(50))  # university, college, research
    created_at = Column(DateTime, default=datetime.utcnow)

class Applicant(Base):
    __tablename__ = "applicants"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    dob = Column(String(20))
    gender = Column(String(20))
    category = Column(String(20))  # ST, SC, OBC, General
    state = Column(String(100))
    district = Column(String(100))
    mobile = Column(String(20))
    email = Column(String(255))
    address = Column(Text)
    institute_id = Column(String(36), ForeignKey("institutes.id"))
    course = Column(String(100))
    admission_year = Column(Integer)
    annual_family_income = Column(Integer)
    parent_name = Column(String(255))
    bank_account_placeholder = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Scheme(Base):
    __tablename__ = "schemes"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(500), nullable=False)
    description = Column(Text)
    department = Column(String(255))
    education_level = Column(String(100))
    target_category = Column(String(100))
    income_limit = Column(Integer)
    age_min = Column(Integer)
    age_max = Column(Integer)
    seats = Column(Integer, default=100)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String(20), default="draft")  # draft, active, closed, archived
    is_published = Column(Boolean, default=False)
    current_version = Column(Integer, default=1)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SchemeVersion(Base):
    __tablename__ = "scheme_versions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    change_notes = Column(Text)
    snapshot = Column(JSON)
    created_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint('scheme_id', 'version_number', name='uq_scheme_version'),)

class SchemeField(Base):
    __tablename__ = "scheme_fields"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    field_key = Column(String(100), nullable=False)
    label = Column(String(255), nullable=False)
    field_type = Column(String(50), nullable=False)  # text, textarea, number, date, dropdown, radio, checkbox, file, email, phone
    placeholder = Column(String(255))
    required = Column(Boolean, default=False)
    validation = Column(JSON)  # {min, max, pattern, options}
    options = Column(JSON)  # for dropdown/radio/checkbox
    help_text = Column(String(500))
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SchemeDocument(Base):
    __tablename__ = "scheme_documents"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    document_key = Column(String(100), nullable=False)
    document_name = Column(String(255), nullable=False)
    required = Column(Boolean, default=True)
    allowed_file_types = Column(JSON, default=["pdf","jpg","jpeg","png"])
    max_size_mb = Column(Integer, default=5)
    validity_required = Column(Boolean, default=False)
    expiry_rule_days = Column(Integer)
    help_text = Column(String(500))
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SchemeRule(Base):
    __tablename__ = "scheme_rules"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    field_key = Column(String(100), nullable=False)
    operator = Column(String(20), nullable=False)  # =, !=, <=, >=, <, >, in, not_in, missing, contains
    value = Column(String(500))
    action = Column(String(50), nullable=False)  # eligible, deficiency, manual_review, fail
    message = Column(String(500))
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SchemeScoreWeight(Base):
    __tablename__ = "scheme_score_weights"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    component = Column(String(100), nullable=False)  # academic, research, institution, socio_economic, interview
    weight = Column(Integer, nullable=False)  # percentage
    description = Column(String(255))
    is_active = Column(Boolean, default=True)

class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    state = Column(String(50), nullable=False)  # DRAFT etc
    label = Column(String(100))
    description = Column(String(500))
    order_index = Column(Integer, default=0)
    is_initial = Column(Boolean, default=False)
    is_final = Column(Boolean, default=False)

class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    from_state = Column(String(50), nullable=False)
    to_state = Column(String(50), nullable=False)
    allowed_roles = Column(JSON)  # list of roles
    require_reason = Column(Boolean, default=False)
    require_evidence = Column(Boolean, default=False)
    condition = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    applicant_id = Column(String(36), ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_version = Column(Integer, default=1)
    status = Column(String(50), default="DRAFT", index=True)  # DRAFT, SUBMITTED, AUTOMATED_CHECK, DEFICIENCY_RAISED, RESUBMITTED, INSTITUTE_VERIFICATION, OFFICER_SCRUTINY, COMMITTEE_REVIEW, SELECTED, WAITLISTED, REJECTED, SANCTIONED, PAYMENT_RELEASED, FELLOWSHIP_MONITORING
    current_stage = Column(String(50), default="DRAFT")
    data = Column(JSON, default={})  # dynamic field values snapshot
    eligibility_result = Column(JSON)
    verification_priority = Column(JSON)
    merit_score = Column(JSON)
    submitted_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    # denormalized for duplicate detection
    normalized_name = Column(String(255))
    duplicate_flag = Column(Boolean, default=False)

class ApplicationFieldValue(Base):
    __tablename__ = "application_field_values"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    field_key = Column(String(100), nullable=False)
    field_type = Column(String(50))
    value = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50))
    to_status = Column(String(50), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"))
    actor_role = Column(String(50))
    reason = Column(Text)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    applicant_id = Column(String(36), ForeignKey("applicants.id"), index=True)
    document_key = Column(String(100), nullable=False)
    document_name = Column(String(255))
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    status = Column(String(50), default="uploaded")  # uploaded, processing, extracted, needs_review, verified, rejected
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime)
    verified_by = Column(String(36), ForeignKey("users.id"))

class DocumentExtraction(Base):
    __tablename__ = "document_extractions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    extracted_text = Column(Text)
    extracted_fields = Column(JSON)  # {name, dob, certificate_number, institution, marks, income, issue_date, validity_date, parent_name, confidence}
    confidence_scores = Column(JSON)
    ocr_engine = Column(String(50), default="tesseract-mock")
    ocr_version = Column(String(50), default="v1-demo")
    needs_correction = Column(Boolean, default=False)
    corrected_by_applicant = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class DocumentVerificationFlag(Base):
    __tablename__ = "document_verification_flags"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"))
    application_id = Column(String(36), ForeignKey("applications.id"), index=True)
    flag_type = Column(String(100), nullable=False)  # blurry, cropped, unreadable, blank, wrong_document, duplicate, expired, quality
    severity = Column(String(20), default="medium")  # low, medium, high
    message = Column(String(500))
    evidence = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class VerificationTask(Base):
    __tablename__ = "verification_tasks"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to = Column(String(36), ForeignKey("users.id"), index=True)
    assigned_role = Column(String(50))
    task_type = Column(String(50))  # document_verification, eligibility_review, field_verification
    status = Column(String(50), default="pending")  # pending, in_progress, completed
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

class OfficerDecision(Base):
    __tablename__ = "officer_decisions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    officer_role = Column(String(50), nullable=False)
    decision = Column(String(50), nullable=False)  # verify, deficiency, reject, select, waitlist, sanction, payment
    reason = Column(Text, nullable=False)
    evidence_considered = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class MeritScore(Base):
    __tablename__ = "merit_scores"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    total_score = Column(Float, default=0)
    components = Column(JSON)  # {academic: {score, max, weight}, research: ..., institution, socio_economic, interview}
    breakdown = Column(JSON)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    calculated_by = Column(String(36), ForeignKey("users.id"))

class SelectionList(Base):
    __tablename__ = "selection_lists"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scheme_id = Column(String(36), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="draft")  # draft, published, archived
    entries = Column(JSON)  # list of {application_id, rank, decision, merit_score, remarks}
    published_at = Column(DateTime)
    published_by = Column(String(36), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Appeal(Base):
    __tablename__ = "appeals"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=True, index=True)
    applicant_id = Column(String(36), ForeignKey("applicants.id"), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Submitted")  # Submitted, Under Review, Additional Information Required, Resolved, Closed
    evidence_files = Column(JSON)
    officer_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Grievance(Base):
    __tablename__ = "grievances"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    applicant_id = Column(String(36), ForeignKey("applicants.id"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id"))
    category = Column(String(100))
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Submitted")
    response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    related_entity = Column(String(100))
    related_id = Column(String(36))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), index=True)
    actor_role = Column(String(50))
    action = Column(String(100), nullable=False, index=True)
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(36), index=True)
    old_value = Column(JSON)
    new_value = Column(JSON)
    reason = Column(Text)
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Consent(Base):
    __tablename__ = "consents"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    applicant_id = Column(String(36), ForeignKey("applicants.id"), nullable=False, index=True)
    consent_type = Column(String(100), nullable=False)
    consented = Column(Boolean, default=False)
    consented_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(50))

class DuplicateIndicator(Base):
    __tablename__ = "duplicate_indicators"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    matched_application_id = Column(String(36), ForeignKey("applications.id"))
    match_type = Column(String(100), nullable=False)  # mobile, email, dob_name, certificate, document_hash
    similarity_score = Column(Float)
    evidence = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskIndicator(Base):
    __tablename__ = "risk_indicators"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    indicator_type = Column(String(100), nullable=False)  # duplicate_cert, mismatch, repeated_identifier, low_quality, unusual_marks, late_resubmission, same_device
    score = Column(Integer, nullable=False)
    severity = Column(String(20))
    evidence = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(JSON)
    description = Column(String(500))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
