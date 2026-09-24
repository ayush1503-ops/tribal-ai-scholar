from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from ..core.database import get_db
from ..core.security import get_current_user, require_roles
from ..models.models import Application, Applicant, Scheme, SchemeField, SchemeDocument, ApplicationFieldValue, ApplicationStatusHistory, Document, DocumentExtraction, AuditLog, Notification, SchemeRule, SchemeScoreWeight
from ..schemas.schemas import ApplicationCreate, WorkflowTransitionRequest
from ..services.eligibility import evaluate_rules, evaluate_custom_rules
from ..services.ai_services import check_consistency, calculate_verification_priority, check_document_quality, extract_text_ocr, calculate_merit_score, detect_duplicates
from ..workflow.engine import can_transition
from datetime import datetime
import os, hashlib, json

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])

try:
    from ..core.config import settings
    UPLOAD_DIR = settings.UPLOAD_DIR
except:
    UPLOAD_DIR = "/tmp/uploads" if os.getenv("VERCEL") else "./uploads"

try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs("./uploads", exist_ok=True)
    os.makedirs("/tmp/uploads", exist_ok=True)
except:
    pass

def get_user_roles(db: Session, user_id: str):
    from ..models.models import UserRoleAssignment, Role
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    roles = []
    for a in assignments:
        r = db.query(Role).filter(Role.id == a.role_id).first()
        if r:
            roles.append(r.name)
    return roles

def create_notification(db: Session, user_id: str, type: str, title: str, message: str, related_entity=None, related_id=None):
    n = Notification(user_id=user_id, type=type, title=title, message=message, related_entity=related_entity, related_id=related_id)
    db.add(n)
    db.commit()

@router.post("")
def create_application(payload: ApplicationCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    scheme = db.query(Scheme).filter(Scheme.id == payload.scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    # Check duplicate application for same scheme
    existing = db.query(Application).filter(Application.applicant_id == applicant.id, Application.scheme_id == scheme.id).first()
    if existing and existing.status not in ["REJECTED", "WITHDRAWN"]:
        raise HTTPException(status_code=400, detail="Application already exists for this scheme")
    app = Application(
        applicant_id=applicant.id,
        scheme_id=scheme.id,
        scheme_version=scheme.current_version,
        status="DRAFT",
        current_stage="DRAFT",
        data=payload.data or {}
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    # Field values
    if payload.data:
        for k,v in payload.data.items():
            db.add(ApplicationFieldValue(application_id=app.id, field_key=k, field_type="text", value=str(v)))
    # Status history
    db.add(ApplicationStatusHistory(application_id=app.id, from_status=None, to_status="DRAFT", actor_id=current_user.id, actor_role="applicant", reason="Application created"))
    db.add(AuditLog(actor_id=current_user.id, actor_role="applicant", action="APPLICATION_CREATED", entity="application", entity_id=app.id, new_value={"scheme_id": scheme.id}))
    db.commit()
    create_notification(db, current_user.id, "application_created", "Application Created", f"Draft created for {scheme.name}", "application", app.id)
    return {"id": app.id, "status": app.status, "message": "Application draft created"}

@router.get("")
def list_applications(
    status: Optional[str] = None,
    scheme_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    roles = get_user_roles(db, current_user.id)
    q = db.query(Application)
    # Applicants see only own
    if "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","institute_verifier","selection_committee","finance_officer","auditor"] for r in roles):
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        if applicant:
            q = q.filter(Application.applicant_id == applicant.id)
        else:
            return {"items": [], "total": 0}
    else:
        # Officer views - optional filters
        if status:
            q = q.filter(Application.status == status)
        if scheme_id:
            q = q.filter(Application.scheme_id == scheme_id)
    total = q.count()
    apps = q.order_by(Application.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    items = []
    for a in apps:
        app_applicant = db.query(Applicant).filter(Applicant.id == a.applicant_id).first()
        scheme = db.query(Scheme).filter(Scheme.id == a.scheme_id).first()
        items.append({
            "id": a.id,
            "applicant_id": a.applicant_id,
            "applicant_name": app_applicant.full_name if app_applicant else "Unknown",
            "scheme_id": a.scheme_id,
            "scheme_name": scheme.name if scheme else "Unknown",
            "status": a.status,
            "verification_priority": a.verification_priority,
            "merit_score": a.merit_score,
            "submitted_at": a.submitted_at,
            "created_at": a.created_at,
            "updated_at": a.updated_at
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/{app_id}")
def get_application(app_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    roles = get_user_roles(db, current_user.id)
    # Object-level auth: applicant can only see own
    if "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","institute_verifier","selection_committee","finance_officer","auditor"] for r in roles):
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        if not applicant or app.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this application")
    applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
    scheme = db.query(Scheme).filter(Scheme.id == app.scheme_id).first()
    field_values = db.query(ApplicationFieldValue).filter(ApplicationFieldValue.application_id == app.id).all()
    documents = db.query(Document).filter(Document.application_id == app.id).all()
    doc_details = []
    for d in documents:
        ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == d.id).first()
        doc_details.append({
            "id": d.id,
            "document_key": d.document_key,
            "document_name": d.document_name,
            "file_name": d.file_name,
            "status": d.status,
            "file_path": d.file_path,
            "extraction": {
                "extracted_text": ext.extracted_text if ext else None,
                "extracted_fields": ext.extracted_fields if ext else None,
                "confidence_scores": ext.confidence_scores if ext else None,
                "ocr_engine": ext.ocr_engine if ext else None,
                "needs_correction": ext.needs_correction if ext else None
            } if ext else None
        })
    history = db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id == app.id).order_by(ApplicationStatusHistory.created_at).all()
    # Get scheme fields for dynamic form
    scheme_fields = db.query(SchemeField).filter(SchemeField.scheme_id == app.scheme_id).all() if scheme else []
    scheme_docs = db.query(SchemeDocument).filter(SchemeDocument.scheme_id == app.scheme_id).all() if scheme else []
    return {
        "id": app.id,
        "applicant": {
            "id": applicant.id,
            "full_name": applicant.full_name,
            "category": applicant.category,
            "state": applicant.state,
            "district": applicant.district,
            "course": applicant.course,
            "annual_family_income": applicant.annual_family_income,
            "mobile": applicant.mobile,
            "email": applicant.email,
            "parent_name": applicant.parent_name,
            "dob": applicant.dob
        } if applicant else None,
        "scheme": {
            "id": scheme.id,
            "name": scheme.name,
            "income_limit": scheme.income_limit,
            "target_category": scheme.target_category,
            "seats": scheme.seats
        } if scheme else None,
        "status": app.status,
        "data": app.data,
        "field_values": [{"field_key": fv.field_key, "value": fv.value} for fv in field_values],
        "scheme_fields": [{"field_key": f.field_key, "label": f.label, "field_type": f.field_type, "required": f.required, "options": f.options, "placeholder": f.placeholder, "help_text": f.help_text} for f in scheme_fields],
        "scheme_documents": [{"document_key": sd.document_key, "document_name": sd.document_name, "required": sd.required, "allowed_file_types": sd.allowed_file_types} for sd in scheme_docs],
        "documents": doc_details,
        "eligibility_result": app.eligibility_result,
        "verification_priority": app.verification_priority,
        "merit_score": app.merit_score,
        "history": [{"from_status": h.from_status, "to_status": h.to_status, "actor_role": h.actor_role, "reason": h.reason, "created_at": h.created_at} for h in history],
        "created_at": app.created_at,
        "submitted_at": app.submitted_at
    }

@router.put("/{app_id}")
def update_application(app_id: str, payload: Dict, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    roles = get_user_roles(db, current_user.id)
    if "applicant" in roles:
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        if app.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if app.status not in ["DRAFT", "DEFICIENCY_RAISED"]:
            raise HTTPException(status_code=400, detail=f"Cannot edit application in status {app.status}")
    data = payload.get("data")
    if data:
        app.data = data
        # Update field values
        db.query(ApplicationFieldValue).filter(ApplicationFieldValue.application_id == app.id).delete()
        for k,v in data.items():
            db.add(ApplicationFieldValue(application_id=app.id, field_key=k, value=str(v)))
    db.commit()
    return {"message": "Application updated", "status": app.status}

@router.post("/{app_id}/submit")
def submit_application(app_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant or app.applicant_id != applicant.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if app.status not in ["DRAFT", "DEFICIENCY_RAISED", "RESUBMITTED"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit from status {app.status}")
    # Validate required fields/documents
    scheme = db.query(Scheme).filter(Scheme.id == app.scheme_id).first()
    required_fields = db.query(SchemeField).filter(SchemeField.scheme_id == scheme.id, SchemeField.required==True).all()
    missing_fields = []
    for rf in required_fields:
        if not app.data or rf.field_key not in app.data or not str(app.data[rf.field_key]).strip():
            missing_fields.append(rf.label)
    if missing_fields:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing_fields)}")
    required_docs = db.query(SchemeDocument).filter(SchemeDocument.scheme_id == scheme.id, SchemeDocument.required==True).all()
    existing_docs = db.query(Document).filter(Document.application_id == app.id).all()
    existing_keys = [d.document_key for d in existing_docs]
    missing_docs = [d.document_name for d in required_docs if d.document_key not in existing_keys]
    if missing_docs:
        raise HTTPException(status_code=400, detail=f"Missing required documents: {', '.join(missing_docs)}")
    old_status = app.status
    # If was deficiency, go to RESUBMITTED then AUTOMATED_CHECK, else SUBMITTED
    if old_status == "DEFICIENCY_RAISED":
        new_status = "RESUBMITTED"
    else:
        new_status = "SUBMITTED"
    app.status = new_status
    app.submitted_at = datetime.utcnow()
    db.add(ApplicationStatusHistory(application_id=app.id, from_status=old_status, to_status=new_status, actor_id=current_user.id, actor_role="applicant", reason="Application submitted"))
    db.add(AuditLog(actor_id=current_user.id, actor_role="applicant", action="APPLICATION_SUBMITTED", entity="application", entity_id=app.id, old_value={"status": old_status}, new_value={"status": new_status}))
    db.commit()
    create_notification(db, current_user.id, "application_submitted", "Application Submitted", f"Application {app.id[:8]} submitted successfully", "application", app.id)
    # Auto trigger eligibility evaluation next
    return {"message": f"Application submitted, status {new_status}", "status": new_status}

@router.post("/{app_id}/evaluate")
def evaluate_application(app_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    roles = get_user_roles(db, current_user.id)
    # Allow applicant and officer to trigger evaluation
    applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
    scheme = db.query(Scheme).filter(Scheme.id == app.scheme_id).first()
    if not scheme or not applicant:
        raise HTTPException(status_code=404, detail="Related data not found")
    # Prepare data
    app_data = app.data or {}
    applicant_profile = {
        "full_name": applicant.full_name,
        "category": applicant.category,
        "annual_family_income": applicant.annual_family_income,
        "course": applicant.course,
        "dob": applicant.dob,
        "state": applicant.state,
        "district": applicant.district,
        "parent_name": applicant.parent_name,
        "mobile": applicant.mobile,
        "email": applicant.email
    }
    # Merge field values from applicant profile + app data (app data may have overrides)
    # Documents present
    docs = db.query(Document).filter(Document.application_id == app.id).all()
    doc_keys = [d.document_key for d in docs]
    # Eligibility engine
    eligibility = evaluate_rules(scheme, app_data, applicant_profile, doc_keys)
    # Custom rules
    custom_rules = db.query(SchemeRule).filter(SchemeRule.scheme_id == scheme.id).all()
    custom_results = evaluate_custom_rules(custom_rules, app_data, applicant_profile, doc_keys)
    all_results = eligibility["results"] + custom_results
    # Determine overall
    has_fail = any(r["result"]=="FAIL" for r in all_results)
    has_deficiency = any(r["result"]=="DEFICIENCY" for r in all_results) or eligibility["status"]=="DEFICIENCY"
    has_manual = any(r["result"]=="MANUAL_REVIEW" for r in all_results) or eligibility["status"]=="MANUAL_REVIEW"

    eligibility_result = {
        "eligible": not has_fail and not has_deficiency,
        "status": "INELIGIBLE" if has_fail else "DEFICIENCY" if has_deficiency else "MANUAL_REVIEW" if has_manual else "ELIGIBLE",
        "results": all_results,
        "summary": "Eligible" if not has_fail and not has_deficiency and not has_manual else "Requires review",
        "evaluated_at": datetime.utcnow().isoformat(),
        "note": "Deterministic rule engine - AI not used for final decision"
    }
    app.eligibility_result = eligibility_result

    # OCR extractions for consistency
    extractions = []
    quality_flags = []
    for d in docs:
        ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == d.id).first()
        if ext:
            extractions.append({"document_id": d.id, "document_key": d.document_key, "extracted_fields": ext.extracted_fields})
        # Quality
        qf = check_document_quality(d.file_path, None)
        quality_flags.extend(qf.get("flags", []))

    # Consistency
    consistency_flags = check_consistency(app_data, applicant_profile, extractions)

    # Duplicate detection
    # Get other applications
    other_apps = db.query(Application).filter(Application.id != app.id).all()
    other_profiles = []
    for oa in other_apps:
        oa_applicant = db.query(Applicant).filter(Applicant.id == oa.applicant_id).first()
        if oa_applicant:
            other_profiles.append({"id": oa.id, "full_name": oa_applicant.full_name, "dob": oa_applicant.dob, "mobile": oa_applicant.mobile, "email": oa_applicant.email})
    dup_indicators = detect_duplicates({"id": app.id, "full_name": applicant.full_name, "dob": applicant.dob, "mobile": applicant.mobile, "email": applicant.email}, other_profiles, docs)

    # Verification priority
    vp = calculate_verification_priority(consistency_flags, dup_indicators, quality_flags)
    app.verification_priority = vp

    # Merit score
    weights = db.query(SchemeScoreWeight).filter(SchemeScoreWeight.scheme_id == scheme.id).all()
    weights_payload = [{"component": w.component, "weight": w.weight} for w in weights]
    merit = calculate_merit_score(app_data, applicant_profile, weights_payload, extractions)
    app.merit_score = merit
    # Save duplicate indicators maybe? Store in separate table for audit but we just keep vp

    # Auto transition to AUTOMATED_CHECK if was SUBMITTED/RESUBMITTED
    old_status = app.status
    if old_status in ["SUBMITTED", "RESUBMITTED"]:
        app.status = "AUTOMATED_CHECK"
        db.add(ApplicationStatusHistory(application_id=app.id, from_status=old_status, to_status="AUTOMATED_CHECK", actor_id=current_user.id, actor_role="system", reason="Automated eligibility and verification priority calculated"))
        # Also if deficiency detected, auto move to DEFICIENCY_RAISED? But keep as check - officer will decide
        if has_deficiency:
            # Create deficiency flag but not auto transition - advisory
            pass

    # Audit
    db.add(AuditLog(actor_id=current_user.id, actor_role="system", action="RULE_EVALUATED", entity="application", entity_id=app.id, new_value=eligibility_result))
    db.add(AuditLog(actor_id=current_user.id, actor_role="system", action="AI_FLAG_CREATED", entity="application", entity_id=app.id, new_value=vp))

    db.commit()
    return {
        "eligibility": eligibility_result,
        "verification_priority": vp,
        "merit_score": merit,
        "consistency_flags": consistency_flags,
        "quality_flags": quality_flags,
        "duplicate_indicators": dup_indicators,
        "status": app.status
    }

@router.post("/{app_id}/transition")
def transition_application(app_id: str, req: WorkflowTransitionRequest, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    roles = get_user_roles(db, current_user.id)
    from_status = app.status
    to_status = req.to_status
    allowed, msg = can_transition(from_status, to_status, roles)
    if not allowed:
        raise HTTPException(status_code=400, detail=msg)
    # Additional checks: require reason for certain transitions
    if to_status in ["REJECTED", "DEFICIENCY_RAISED", "WAITLISTED"] and not req.reason:
        raise HTTPException(status_code=400, detail="Reason required for this transition")
    old = app.status
    app.status = to_status
    app.updated_at = datetime.utcnow()
    db.add(ApplicationStatusHistory(application_id=app.id, from_status=old, to_status=to_status, actor_id=current_user.id, actor_role=roles[0] if roles else "unknown", reason=req.reason or f"Transition {old}->{to_status}"))
    db.add(AuditLog(actor_id=current_user.id, actor_role=roles[0] if roles else "unknown", action="WORKFLOW_TRANSITION", entity="application", entity_id=app.id, old_value={"status": old}, new_value={"status": to_status, "reason": req.reason}))
    db.commit()
    # Notification to applicant
    applicant = db.query(Applicant).filter(Applicant.id == app.applicant_id).first()
    if applicant:
        applicant_user = db.query(Application).filter(Application.id == app.id).first()
        # Find user via applicant.user_id
        user_id = applicant.user_id
        create_notification(db, user_id, "status_update", f"Application {to_status}", f"Your application status changed to {to_status}. Reason: {req.reason or 'N/A'}", "application", app.id)
    return {"message": f"Transitioned {old} -> {to_status}", "status": to_status}
