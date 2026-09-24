from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Allow demo.local emails for prototype — use str with simple validation
EmailStr = str

# Auth
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "applicant"  # default

class LoginRequest(BaseModel):
    email: str
    password: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    is_active: bool
    roles: List[str] = []
    created_at: datetime
    class Config:
        from_attributes = True

# Applicant Profile
class ApplicantCreate(BaseModel):
    full_name: str
    dob: Optional[str] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    institute_id: Optional[str] = None
    course: Optional[str] = None
    admission_year: Optional[int] = None
    annual_family_income: Optional[int] = None
    parent_name: Optional[str] = None
    bank_account_placeholder: Optional[str] = None

class ApplicantResponse(ApplicantCreate):
    id: str
    user_id: str
    class Config:
        from_attributes = True

# Scheme
class SchemeFieldCreate(BaseModel):
    field_key: str
    label: str
    field_type: str
    placeholder: Optional[str] = None
    required: bool = False
    validation: Optional[Dict[str, Any]] = None
    options: Optional[List[str]] = None
    help_text: Optional[str] = None
    order_index: int = 0

class SchemeDocumentCreate(BaseModel):
    document_key: str
    document_name: str
    required: bool = True
    allowed_file_types: Optional[List[str]] = ["pdf","jpg","jpeg","png"]
    max_size_mb: int = 5
    validity_required: bool = False
    expiry_rule_days: Optional[int] = None
    help_text: Optional[str] = None
    order_index: int = 0

class SchemeRuleCreate(BaseModel):
    field_key: str
    operator: str
    value: Optional[str] = None
    action: str
    message: Optional[str] = None
    order_index: int = 0

class SchemeScoreWeightCreate(BaseModel):
    component: str
    weight: int
    description: Optional[str] = None

class SchemeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: Optional[str] = None
    education_level: Optional[str] = None
    target_category: Optional[str] = None
    income_limit: Optional[int] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    seats: int = 100
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    fields: Optional[List[SchemeFieldCreate]] = []
    documents: Optional[List[SchemeDocumentCreate]] = []
    rules: Optional[List[SchemeRuleCreate]] = []
    score_weights: Optional[List[SchemeScoreWeightCreate]] = []

class SchemeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    education_level: Optional[str] = None
    target_category: Optional[str] = None
    income_limit: Optional[int] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    seats: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None
    fields: Optional[List[SchemeFieldCreate]] = None
    documents: Optional[List[SchemeDocumentCreate]] = None
    rules: Optional[List[SchemeRuleCreate]] = None
    score_weights: Optional[List[SchemeScoreWeightCreate]] = None

class SchemeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    department: Optional[str]
    education_level: Optional[str]
    target_category: Optional[str]
    income_limit: Optional[int]
    age_min: Optional[int]
    age_max: Optional[int]
    seats: int
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    status: str
    is_published: bool
    current_version: int
    fields: List[Dict[str, Any]] = []
    documents: List[Dict[str, Any]] = []
    rules: List[Dict[str, Any]] = []
    score_weights: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Application
class ApplicationCreate(BaseModel):
    scheme_id: str
    data: Optional[Dict[str, Any]] = {}

class ApplicationUpdate(BaseModel):
    data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    applicant_id: str
    scheme_id: str
    scheme_name: Optional[str] = None
    status: str
    data: Optional[Dict[str, Any]]
    eligibility_result: Optional[Dict[str, Any]]
    verification_priority: Optional[Dict[str, Any]]
    merit_score: Optional[Dict[str, Any]]
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class WorkflowTransitionRequest(BaseModel):
    to_status: str
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class OfficerDecisionRequest(BaseModel):
    decision: str  # verify, deficiency, reject, select, waitlist, sanction, payment
    reason: str
    evidence_considered: Optional[Dict[str, Any]] = None

class DocumentUploadResponse(BaseModel):
    id: str
    document_key: str
    file_name: str
    status: str
    message: str

# Appeal
class AppealCreate(BaseModel):
    application_id: Optional[str] = None
    subject: str
    description: str
    category: Optional[str] = None

class AppealResponse(BaseModel):
    id: str
    application_id: Optional[str]
    subject: str
    description: str
    status: str
    officer_response: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

# Grievance
class GrievanceCreate(BaseModel):
    application_id: Optional[str] = None
    category: Optional[str] = None
    subject: str
    description: str

# Simulator
class SimulatorRequest(BaseModel):
    income_limit: Optional[int] = None
    age_max: Optional[int] = None
    seats: Optional[int] = None
    score_weights: Optional[List[SchemeScoreWeightCreate]] = None

class SimulatorResponse(BaseModel):
    before: Dict[str, Any]
    after: Dict[str, Any]
    note: str = "Simulation uses synthetic demo data"
