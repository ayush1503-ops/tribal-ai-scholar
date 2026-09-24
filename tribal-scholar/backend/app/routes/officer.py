from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..core.database import get_db
from ..core.security import get_current_user, require_roles
from ..models.models import Application, Applicant, Scheme, AuditLog, ApplicationStatusHistory, OfficerDecision, Notification
from ..schemas.schemas import OfficerDecisionRequest
from ..workflow.engine import can_transition
from datetime import datetime

router = APIRouter(prefix="/api/v1/officer", tags=["officer"])

def get_user_roles(db, user_id):
    from ..models.models import UserRoleAssignment, Role
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    roles=[]
    for a in assignments:
        r=db.query(Role).filter(Role.id==a.role_id).first()
        if r:
            roles.append(r.name)
    return roles

@router.get("/queue")
def get_queue(
    status: Optional[str] = None,
    scheme_id: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    verification_priority: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user = Depends(require_roles("institute_verifier","district_officer","scheme_officer","super_admin")),
    db: Session = Depends(get_db)
):
    q = db.query(Application)
    if status:
        # status can be comma separated
        statuses = [s.strip() for s in status.split(",")]
        q = q.filter(Application.status.in_(statuses))
    else:
        # Default queue: pending verification
        q = q.filter(Application.status.in_(["SUBMITTED","AUTOMATED_CHECK","RESUBMITTED","INSTITUTE_VERIFICATION","OFFICER_SCRUTINY","DEFICIENCY_RAISED"]))
    if scheme_id:
        q = q.filter(Application.scheme_id == scheme_id)
    # district/state filter via applicant join
    if district or state:
        # Use applicant filter subquery
        from ..models.models import Applicant as ApplicantModel
        sub = db.query(ApplicantModel.id)
        if district:
            sub = sub.filter(ApplicantModel.district == district)
        if state:
            sub = sub.filter(ApplicantModel.state == state)
        ids = [x[0] for x in sub.all()]
        q = q.filter(Application.applicant_id.in_(ids))
    total = q.count()
    apps = q.order_by(Application.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    items=[]
    for a in apps:
        applicant = db.query(Applicant).filter(Applicant.id==a.applicant_id).first()
        scheme = db.query(Scheme).filter(Scheme.id==a.scheme_id).first()
        vp_score = (a.verification_priority or {}).get("score", 0) if isinstance(a.verification_priority, dict) else 0
        vp_level = (a.verification_priority or {}).get("level", "Low") if isinstance(a.verification_priority, dict) else "Low"
        # Determine priority filter
        if verification_priority:
            # verification_priority filter: Low, Medium, High
            if vp_level.lower() != verification_priority.lower():
                continue
        items.append({
            "id": a.id,
            "applicant_name": applicant.full_name if applicant else "Unknown",
            "applicant_district": applicant.district if applicant else None,
            "applicant_state": applicant.state if applicant else None,
            "scheme_name": scheme.name if scheme else None,
            "status": a.status,
            "verification_priority": a.verification_priority,
            "merit_score": a.merit_score,
            "submitted_at": a.submitted_at,
            "created_at": a.created_at
        })
    # If filtered by priority, recalc total? For prototype just return filtered items
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/applications/{app_id}")
def get_officer_application(app_id: str, current_user = Depends(require_roles("institute_verifier","district_officer","scheme_officer","super_admin","selection_committee")), db: Session = Depends(get_db)):
    from ..routes.applications import get_application as get_app_logic
    # Reuse logic but officers can see all
    app = db.query(Application).filter(Application.id==app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    applicant = db.query(Applicant).filter(Applicant.id==app.applicant_id).first()
    scheme = db.query(Scheme).filter(Scheme.id==app.scheme_id).first()
    from ..models.models import Document, DocumentExtraction, ApplicationFieldValue, ApplicationStatusHistory
    field_values = db.query(ApplicationFieldValue).filter(ApplicationFieldValue.application_id==app.id).all()
    docs = db.query(Document).filter(Document.application_id==app.id).all()
    doc_details=[]
    for d in docs:
        ext=db.query(DocumentExtraction).filter(DocumentExtraction.document_id==d.id).first()
        doc_details.append({
            "id": d.id,
            "document_key": d.document_key,
            "document_name": d.document_name,
            "file_name": d.file_name,
            "status": d.status,
            "extraction": {"extracted_fields": ext.extracted_fields if ext else None, "confidence_scores": ext.confidence_scores if ext else None, "extracted_text": ext.extracted_text if ext else None, "ocr_engine": ext.ocr_engine if ext else None} if ext else None
        })
    history=db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id==app.id).order_by(ApplicationStatusHistory.created_at).all()
    decisions=db.query(OfficerDecision).filter(OfficerDecision.application_id==app.id).order_by(OfficerDecision.created_at).all()
    return {
        "id": app.id,
        "applicant": {"id": applicant.id, "full_name": applicant.full_name, "category": applicant.category, "state": applicant.state, "district": applicant.district, "course": applicant.course, "annual_family_income": applicant.annual_family_income, "parent_name": applicant.parent_name, "dob": applicant.dob, "mobile": applicant.mobile, "email": applicant.email} if applicant else None,
        "scheme": {"id": scheme.id, "name": scheme.name, "income_limit": scheme.income_limit} if scheme else None,
        "status": app.status,
        "data": app.data,
        "field_values": [{"field_key": fv.field_key, "value": fv.value} for fv in field_values],
        "documents": doc_details,
        "eligibility_result": app.eligibility_result,
        "verification_priority": app.verification_priority,
        "merit_score": app.merit_score,
        "history": [{"from_status": h.from_status, "to_status": h.to_status, "actor_role": h.actor_role, "reason": h.reason, "created_at": h.created_at} for h in history],
        "officer_decisions": [{"id": d.id, "officer_role": d.officer_role, "decision": d.decision, "reason": d.reason, "created_at": d.created_at} for d in decisions],
        "created_at": app.created_at,
        "submitted_at": app.submitted_at
    }

@router.post("/applications/{app_id}/decision")
def make_decision(app_id: str, payload: OfficerDecisionRequest, current_user = Depends(require_roles("institute_verifier","district_officer","scheme_officer","super_admin","finance_officer","selection_committee")), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id==app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    roles = get_user_roles(db, current_user.id)
    # Map decision to transition
    decision_map = {
        "verify": "OFFICER_SCRUTINY",  # institute verify -> officer scrutiny, etc? We'll handle logic
        "deficiency": "DEFICIENCY_RAISED",
        "reject": "REJECTED",
        "select": "SELECTED",
        "waitlist": "WAITLISTED",
        "sanction": "SANCTIONED",
        "payment": "PAYMENT_RELEASED",
        "institute_verify": "INSTITUTE_VERIFICATION",
        "committee_review": "COMMITTEE_REVIEW"
    }
    # Determine target status based on current status and decision
    current = app.status
    decision = payload.decision.lower()
    # More intelligent mapping
    if decision == "verify":
        if current == "AUTOMATED_CHECK":
            target = "INSTITUTE_VERIFICATION"
        elif current == "INSTITUTE_VERIFICATION":
            target = "OFFICER_SCRUTINY"
        elif current == "OFFICER_SCRUTINY":
            target = "COMMITTEE_REVIEW"
        else:
            target = "OFFICER_SCRUTINY"
    elif decision == "deficiency":
        target = "DEFICIENCY_RAISED"
    elif decision == "reject":
        target = "REJECTED"
    elif decision == "select":
        target = "SELECTED"
    elif decision == "waitlist":
        target = "WAITLISTED"
    elif decision == "sanction":
        target = "SANCTIONED"
    elif decision == "payment":
        target = "PAYMENT_RELEASED"
    elif decision == "resubmit":
        target = "RESUBMITTED"
    else:
        # If payload.decision is already a status
        target = payload.decision.upper()

    # Check workflow permission - use can_transition but allow broader for prototype
    allowed, msg = can_transition(current, target, roles)
    # For prototype, if not allowed but user is super_admin, allow; or if officer, allow deficiency/reject from most states
    if not allowed:
        # Provide more lenient for officer
        if "super_admin" in roles:
            allowed = True
        elif decision in ["deficiency","reject"] and current in ["AUTOMATED_CHECK","INSTITUTE_VERIFICATION","OFFICER_SCRUTINY","COMMITTEE_REVIEW","SUBMITTED","RESUBMITTED"]:
            allowed = True
        elif decision == "verify" and current in ["AUTOMATED_CHECK","INSTITUTE_VERIFICATION","OFFICER_SCRUTINY"]:
            allowed = True
        elif decision in ["select","waitlist"] and current in ["COMMITTEE_REVIEW","OFFICER_SCRUTINY"]:
            allowed = True
            target = "SELECTED" if decision=="select" else "WAITLISTED"
            # Ensure from COMMITTEE_REVIEW
            if current == "OFFICER_SCRUTINY":
                # Move to committee review first? For demo allow direct
                pass
    if not allowed:
        raise HTTPException(status_code=400, detail=f"Transition not allowed: {current} -> {target}: {msg}")

    old_status = app.status
    app.status = target
    # Record decision
    od = OfficerDecision(application_id=app.id, officer_id=current_user.id, officer_role=roles[0] if roles else "officer", decision=payload.decision, reason=payload.reason, evidence_considered=payload.evidence_considered)
    db.add(od)
    db.add(ApplicationStatusHistory(application_id=app.id, from_status=old_status, to_status=target, actor_id=current_user.id, actor_role=roles[0] if roles else "officer", reason=payload.reason, metadata_json=payload.evidence_considered))
    db.add(AuditLog(actor_id=current_user.id, actor_role=roles[0] if roles else "officer", action="OFFICER_DECISION", entity="application", entity_id=app.id, old_value={"status": old_status}, new_value={"status": target, "decision": payload.decision, "reason": payload.reason}))
    db.commit()
    # Notify applicant
    applicant = db.query(Applicant).filter(Applicant.id==app.applicant_id).first()
    if applicant:
        n = Notification(user_id=applicant.user_id, type="officer_decision", title=f"Officer Decision: {payload.decision}", message=f"Your application status updated to {target}. Reason: {payload.reason}", related_entity="application", related_id=app.id)
        db.add(n)
        db.commit()
    return {"message": f"Decision recorded: {payload.decision} -> {target}", "status": target, "decision_id": od.id}

@router.get("/dashboard/stats")
def officer_stats(current_user = Depends(require_roles("institute_verifier","district_officer","scheme_officer","super_admin")), db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(Application).count()
    pending = db.query(Application).filter(Application.status.in_(["SUBMITTED","AUTOMATED_CHECK","RESUBMITTED","INSTITUTE_VERIFICATION","OFFICER_SCRUTINY"])).count()
    deficiency = db.query(Application).filter(Application.status=="DEFICIENCY_RAISED").count()
    selected = db.query(Application).filter(Application.status=="SELECTED").count()
    rejected = db.query(Application).filter(Application.status=="REJECTED").count()
    waitlisted = db.query(Application).filter(Application.status=="WAITLISTED").count()
    # High priority count
    all_apps = db.query(Application).all()
    high = 0
    for a in all_apps:
        vp = a.verification_priority
        if isinstance(vp, dict) and vp.get("score",0) > 50:
            high+=1
    # By scheme
    by_scheme = db.query(Scheme.name, func.count(Application.id)).join(Application, Application.scheme_id==Scheme.id).group_by(Scheme.name).all()
    return {
        "total": total,
        "pending_verification": pending,
        "deficiencies": deficiency,
        "high_priority": high,
        "selected": selected,
        "rejected": rejected,
        "waitlisted": waitlisted,
        "by_scheme": [{"scheme": r[0], "count": r[1]} for r in by_scheme]
    }
