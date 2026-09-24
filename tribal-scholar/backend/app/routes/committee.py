from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import require_roles
from ..models.models import Application, Applicant, Scheme, SelectionList, OfficerDecision, AuditLog, Notification, ApplicationStatusHistory
from ..schemas.schemas import OfficerDecisionRequest
from datetime import datetime

router = APIRouter(prefix="/api/v1/committee", tags=["committee"])

def get_roles(db, user_id):
    from ..models.models import UserRoleAssignment, Role
    a = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id==user_id).all()
    return [db.query(Role).filter(Role.id==x.role_id).first().name for x in a if db.query(Role).filter(Role.id==x.role_id).first()]

@router.get("/candidates")
def list_candidates(
    scheme_id: str = None,
    current_user = Depends(require_roles("selection_committee","super_admin","scheme_officer")),
    db: Session = Depends(get_db)
):
    q = db.query(Application).filter(Application.status.in_(["COMMITTEE_REVIEW","OFFICER_SCRUTINY","SELECTED","WAITLISTED","REJECTED"]))
    if scheme_id:
        q = q.filter(Application.scheme_id==scheme_id)
    apps = q.order_by(Application.created_at.desc()).limit(50).all()
    items=[]
    for a in apps:
        applicant = db.query(Applicant).filter(Applicant.id==a.applicant_id).first()
        merit = a.merit_score or {}
        total = merit.get("total", 0) if isinstance(merit, dict) else 0
        items.append({
            "id": a.id,
            "applicant_name": applicant.full_name if applicant else "Unknown",
            "category": applicant.category if applicant else None,
            "district": applicant.district if applicant else None,
            "state": applicant.state if applicant else None,
            "course": applicant.course if applicant else None,
            "status": a.status,
            "merit_score": merit,
            "verification_priority": a.verification_priority,
            "eligibility_result": a.eligibility_result
        })
    # Sort by merit total descending
    items.sort(key=lambda x: x["merit_score"].get("total",0) if isinstance(x["merit_score"], dict) else 0, reverse=True)
    return {"items": items}

@router.post("/decision")
def committee_decision(payload: dict, current_user = Depends(require_roles("selection_committee","super_admin")), db: Session = Depends(get_db)):
    app_id = payload.get("application_id")
    decision = payload.get("decision") # selected, waitlisted, not_selected
    reason = payload.get("reason", "Committee review")
    if not app_id or not decision:
        raise HTTPException(status_code=400, detail="application_id and decision required")
    app = db.query(Application).filter(Application.id==app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status not in ["COMMITTEE_REVIEW","OFFICER_SCRUTINY"]:
        raise HTTPException(status_code=400, detail=f"Application not in committee review, current status {app.status}")
    roles = get_roles(db, current_user.id)
    target_map = {"selected":"SELECTED","waitlisted":"WAITLISTED","not_selected":"REJECTED","rejected":"REJECTED"}
    target = target_map.get(decision.lower(), decision.upper())
    old = app.status
    app.status = target
    db.add(OfficerDecision(application_id=app.id, officer_id=current_user.id, officer_role="selection_committee", decision=decision, reason=reason))
    db.add(ApplicationStatusHistory(application_id=app.id, from_status=old, to_status=target, actor_id=current_user.id, actor_role="selection_committee", reason=reason))
    db.add(AuditLog(actor_id=current_user.id, actor_role="selection_committee", action="COMMITTEE_DECISION", entity="application", entity_id=app.id, old_value={"status": old}, new_value={"status": target, "decision": decision}))
    db.commit()
    # Notify
    applicant = db.query(Applicant).filter(Applicant.id==app.applicant_id).first()
    if applicant:
        db.add(Notification(user_id=applicant.user_id, type="committee_decision", title=f"Committee Decision: {decision}", message=f"Committee decision: {decision}. Reason: {reason}", related_entity="application", related_id=app.id))
        db.commit()
    return {"message": f"Committee decision {decision} recorded", "status": target}

@router.get("/selection-lists")
def get_selection_lists(scheme_id: str = None, current_user = Depends(require_roles("selection_committee","super_admin","scheme_officer")), db: Session = Depends(get_db)):
    q = db.query(SelectionList)
    if scheme_id:
        q = q.filter(SelectionList.scheme_id==scheme_id)
    lists = q.order_by(SelectionList.created_at.desc()).all()
    return {"items": [{"id": l.id, "scheme_id": l.scheme_id, "name": l.name, "status": l.status, "entries": l.entries, "created_at": l.created_at} for l in lists]}

@router.post("/selection-lists")
def create_selection_list(payload: dict, current_user = Depends(require_roles("selection_committee","super_admin")), db: Session = Depends(get_db)):
    scheme_id = payload.get("scheme_id")
    name = payload.get("name", "Selection List")
    entries = payload.get("entries", [])
    if not scheme_id:
        raise HTTPException(status_code=400, detail="scheme_id required")
    sl = SelectionList(scheme_id=scheme_id, name=name, entries=entries, status="draft", created_at=datetime.utcnow())
    db.add(sl)
    db.add(AuditLog(actor_id=current_user.id, actor_role="selection_committee", action="SELECTION_LIST_CREATED", entity="selection_list", entity_id=sl.id, new_value={"name": name}))
    db.commit()
    db.refresh(sl)
    return {"id": sl.id, "message": "Selection list created"}

@router.post("/selection-lists/{list_id}/publish")
def publish_selection_list(list_id: str, current_user = Depends(require_roles("selection_committee","super_admin")), db: Session = Depends(get_db)):
    sl = db.query(SelectionList).filter(SelectionList.id==list_id).first()
    if not sl:
        raise HTTPException(status_code=404, detail="Not found")
    sl.status = "published"
    sl.published_at = datetime.utcnow()
    sl.published_by = current_user.id
    db.add(AuditLog(actor_id=current_user.id, actor_role="selection_committee", action="SELECTION_LIST_PUBLISHED", entity="selection_list", entity_id=sl.id))
    db.commit()
    return {"message": "Selection list published"}
