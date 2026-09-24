from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_user, require_roles
from ..models.models import Appeal, Grievance, Applicant, AuditLog, Notification
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["appeals"])

@router.post("/appeals")
def create_appeal(payload: dict, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.user_id==current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    appeal = Appeal(
        application_id=payload.get("application_id"),
        applicant_id=applicant.id,
        subject=payload.get("subject", "Appeal"),
        description=payload.get("description",""),
        status="Submitted",
        evidence_files=payload.get("evidence_files", [])
    )
    db.add(appeal)
    db.add(AuditLog(actor_id=current_user.id, actor_role="applicant", action="APPEAL_CREATED", entity="appeal", entity_id=appeal.id, new_value={"subject": appeal.subject}))
    db.commit()
    db.refresh(appeal)
    return {"id": appeal.id, "message": "Appeal submitted", "status": appeal.status}

@router.get("/appeals")
def list_appeals(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.user_id==current_user.id).first()
    # Officers can see all
    from ..models.models import UserRoleAssignment, Role
    roles=[]
    for a in db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id==current_user.id).all():
        r=db.query(Role).filter(Role.id==a.role_id).first()
        if r:
            roles.append(r.name)
    if applicant and "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","auditor"] for r in roles):
        q = db.query(Appeal).filter(Appeal.applicant_id==applicant.id)
    else:
        q = db.query(Appeal)
    items = q.order_by(Appeal.created_at.desc()).all()
    return {"items": [{"id": a.id, "application_id": a.application_id, "subject": a.subject, "description": a.description, "status": a.status, "officer_response": a.officer_response, "created_at": a.created_at} for a in items]}

@router.put("/appeals/{appeal_id}")
def update_appeal(appeal_id: str, payload: dict, current_user = Depends(require_roles("super_admin","district_officer","scheme_officer")), db: Session = Depends(get_db)):
    appeal = db.query(Appeal).filter(Appeal.id==appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.get("status"):
        appeal.status = payload["status"]
    if payload.get("officer_response"):
        appeal.officer_response = payload["officer_response"]
    db.add(AuditLog(actor_id=current_user.id, actor_role="officer", action="APPEAL_UPDATED", entity="appeal", entity_id=appeal.id, new_value={"status": appeal.status}))
    # Notify applicant
    applicant = db.query(Applicant).filter(Applicant.id==appeal.applicant_id).first()
    if applicant:
        db.add(Notification(user_id=applicant.user_id, type="appeal_update", title="Appeal Update", message=f"Your appeal status: {appeal.status}", related_entity="appeal", related_id=appeal.id))
    db.commit()
    return {"message": "Appeal updated"}

@router.post("/grievances")
def create_grievance(payload: dict, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.user_id==current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant profile not found")
    g = Grievance(
        applicant_id=applicant.id,
        application_id=payload.get("application_id"),
        category=payload.get("category","general"),
        subject=payload.get("subject","Grievance"),
        description=payload.get("description",""),
        status="Submitted"
    )
    db.add(g)
    db.add(AuditLog(actor_id=current_user.id, actor_role="applicant", action="GRIEVANCE_CREATED", entity="grievance", entity_id=g.id))
    db.commit()
    db.refresh(g)
    return {"id": g.id, "message": "Grievance submitted"}

@router.get("/grievances")
def list_grievances(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.user_id==current_user.id).first()
    from ..models.models import UserRoleAssignment, Role
    roles=[]
    for a in db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id==current_user.id).all():
        r=db.query(Role).filter(Role.id==a.role_id).first()
        if r:
            roles.append(r.name)
    if applicant and "applicant" in roles and not any(r in ["super_admin","scheme_officer"] for r in roles):
        q = db.query(Grievance).filter(Grievance.applicant_id==applicant.id)
    else:
        q = db.query(Grievance)
    items = q.order_by(Grievance.created_at.desc()).all()
    return {"items": [{"id": g.id, "subject": g.subject, "category": g.category, "status": g.status, "response": g.response, "created_at": g.created_at} for g in items]}

@router.put("/grievances/{gid}")
def update_grievance(gid: str, payload: dict, current_user = Depends(require_roles("super_admin","district_officer","scheme_officer")), db: Session = Depends(get_db)):
    g = db.query(Grievance).filter(Grievance.id==gid).first()
    if not g:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.get("status"):
        g.status = payload["status"]
    if payload.get("response"):
        g.response = payload["response"]
    db.add(AuditLog(actor_id=current_user.id, actor_role="officer", action="GRIEVANCE_UPDATED", entity="grievance", entity_id=g.id))
    db.commit()
    return {"message": "Grievance updated"}
