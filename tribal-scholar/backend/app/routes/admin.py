from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..core.database import get_db
from ..core.security import require_roles, get_current_user
from ..models.models import AuditLog, Application, Scheme, Applicant, Notification, User, Role, UserRoleAssignment, SchemeDocument, Document, Appeal, Grievance
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/dashboard")
def admin_dashboard(current_user = Depends(require_roles("super_admin","scheme_officer","auditor")), db: Session = Depends(get_db)):
    total_apps = db.query(Application).count()
    total_schemes = db.query(Scheme).count()
    by_status = db.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    by_district = db.query(Applicant.district, func.count(Application.id)).join(Application, Application.applicant_id==Applicant.id).group_by(Applicant.district).all()
    by_scheme = db.query(Scheme.name, func.count(Application.id)).join(Application, Application.scheme_id==Scheme.id).group_by(Scheme.name).all()
    # verification priority distribution
    apps = db.query(Application).all()
    vp_dist = {"Low":0,"Medium":0,"High":0}
    for a in apps:
        vp = a.verification_priority
        if isinstance(vp, dict):
            level = vp.get("level","Low")
            vp_dist[level] = vp_dist.get(level,0)+1
        else:
            vp_dist["Low"]+=1
    # avg processing time
    avg_time = 3.2 # mock days for prototype
    return {
        "total_applications": total_apps,
        "total_schemes": total_schemes,
        "by_status": [{"status": s, "count": c} for s,c in by_status],
        "by_district": [{"district": d or "Unknown", "count": c} for d,c in by_district],
        "by_scheme": [{"scheme": s, "count": c} for s,c in by_scheme],
        "verification_priority_distribution": vp_dist,
        "avg_processing_time_days": avg_time,
        "deficiency_rate": round( (next((c for s,c in by_status if s=="DEFICIENCY_RAISED"),0) / total_apps*100) if total_apps else 0,1),
        "selection_count": next((c for s,c in by_status if s=="SELECTED"),0),
        "waitlist_count": next((c for s,c in by_status if s=="WAITLISTED"),0)
    }

@router.get("/audit")
def get_audit(
    action: Optional[str] = None,
    entity: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user = Depends(require_roles("super_admin","auditor")),
    db: Session = Depends(get_db)
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        q = q.filter(AuditLog.action==action)
    if entity:
        q = q.filter(AuditLog.entity==entity)
    total = q.count()
    logs = q.offset((page-1)*page_size).limit(page_size).all()
    return {
        "items": [{"id": l.id, "actor_id": l.actor_id, "actor_role": l.actor_role, "action": l.action, "entity": l.entity, "entity_id": l.entity_id, "old_value": l.old_value, "new_value": l.new_value, "reason": l.reason, "created_at": l.created_at} for l in logs],
        "total": total, "page": page, "page_size": page_size
    }

@router.get("/analytics")
def analytics(current_user = Depends(require_roles("super_admin","scheme_officer","auditor")), db: Session = Depends(get_db)):
    # Similar to dashboard but more detailed
    total = db.query(Application).count()
    # applications by status
    by_status = db.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    # by district
    by_district = db.query(Applicant.district, func.count(Application.id)).join(Application, Application.applicant_id==Applicant.id).group_by(Applicant.district).all()
    # document verification status
    doc_status = db.query(Document.status, func.count(Document.id)).group_by(Document.status).all()
    # appeals
    appeals_count = db.query(Appeal).count()
    grievances_count = db.query(Grievance).count()
    return {
        "applications_by_status": [{"name": s, "value": c} for s,c in by_status],
        "applications_by_district": [{"district": d or "Unknown", "count": c} for d,c in by_district],
        "document_verification_status": [{"status": s, "count": c} for s,c in doc_status],
        "appeal_count": appeals_count,
        "grievance_count": grievances_count,
        "generated_at": datetime.utcnow().isoformat()
    }

@router.get("/fairness")
def fairness_monitoring(current_user = Depends(require_roles("super_admin","auditor")), db: Session = Depends(get_db)):
    # Aggregate not personal
    by_district = db.query(Applicant.district, func.count(Application.id)).join(Application, Application.applicant_id==Applicant.id).group_by(Applicant.district).all()
    # deficiency by district
    deficiency_by_district = db.query(Applicant.district, func.count(Application.id)).join(Application, Application.applicant_id==Applicant.id).filter(Application.status=="DEFICIENCY_RAISED").group_by(Applicant.district).all()
    # selection rate by district
    selected_by_district = db.query(Applicant.district, func.count(Application.id)).join(Application, Application.applicant_id==Applicant.id).filter(Application.status=="SELECTED").group_by(Applicant.district).all()
    # Build dict
    districts = set([d for d,c in by_district])
    result=[]
    for d in districts:
        total = next((c for dist,c in by_district if dist==d),0)
        defic = next((c for dist,c in deficiency_by_district if dist==d),0)
        sel = next((c for dist,c in selected_by_district if dist==d),0)
        result.append({
            "district": d or "Unknown",
            "total_applications": total,
            "deficiency_rate": round(defic/total*100,1) if total else 0,
            "selection_rate": round(sel/total*100,1) if total else 0
        })
    return {"items": result, "note": "Aggregate statistics to identify operational disparities - not automated bias labeling"}

@router.get("/users")
def list_users(page: int=1, page_size:int=20, current_user = Depends(require_roles("super_admin")), db: Session = Depends(get_db)):
    users = db.query(User).offset((page-1)*page_size).limit(page_size).all()
    items=[]
    for u in users:
        roles=[]
        for a in db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id==u.id).all():
            r=db.query(Role).filter(Role.id==a.role_id).first()
            if r:
                roles.append(r.name)
        items.append({"id": u.id, "email": u.email, "full_name": u.full_name, "roles": roles, "is_active": u.is_active, "is_verified": u.is_verified, "created_at": u.created_at})
    return {"items": items, "total": db.query(User).count()}

@router.put("/users/{user_id}/roles")
def update_roles(user_id: str, payload: dict, current_user = Depends(require_roles("super_admin")), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id==user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_roles = payload.get("roles", [])
    # clear
    db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id==user_id).delete()
    for rn in new_roles:
        role = db.query(Role).filter(Role.name==rn).first()
        if role:
            db.add(UserRoleAssignment(user_id=user_id, role_id=role.id, assigned_by=current_user.id))
    db.add(AuditLog(actor_id=current_user.id, actor_role="super_admin", action="USER_ROLES_UPDATED", entity="user", entity_id=user_id, new_value={"roles": new_roles}))
    db.commit()
    return {"message": "Roles updated"}

@router.get("/notifications")
def list_notifications(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id==current_user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return {"items": [{"id": n.id, "type": n.type, "title": n.title, "message": n.message, "is_read": n.is_read, "created_at": n.created_at} for n in notifs]}

@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id==notif_id, Notification.user_id==current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked read"}
