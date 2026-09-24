from pydantic import BaseModel
from typing import Any, Optional

class SchemeField(BaseModel):
    key: str
    label: str
    field_type: str = "text"
    required: bool = True
    options: list[str] = []

class SchemeDocument(BaseModel):
    key: str
    label: str
    required: bool = True

class Scheme(BaseModel):
    id: str
    name: str
    description: str
    active: bool = True
    income_limit: Optional[float] = None
    fields: list[SchemeField] = []
    documents: list[SchemeDocument] = []
    score_weights: dict[str,float] = {}

class ApplicationCreate(BaseModel):
    applicant_name: str
    scheme_id: str
    values: dict[str,Any] = {}

class StatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class Decision(BaseModel):
    decision: str
    reason: str
    officer: str
