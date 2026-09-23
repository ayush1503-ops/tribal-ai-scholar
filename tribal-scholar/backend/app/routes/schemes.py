from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..core.database import get_db
from ..core.security import get_current_user, require_roles
from ..models.models import Scheme, SchemeField, SchemeDocument, SchemeRule, SchemeScoreWeight, SchemeVersion, AuditLog
from ..schemas.schemas import SchemeCreate, SchemeUpdate
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/v1", tags=["schemes"])

def scheme_to_response(scheme: Scheme, db: Session):
    fields = db.query(SchemeField).filter(SchemeField.scheme_id == scheme.id, SchemeField.is_active==True).order_by(SchemeField.order_index).all()
    docs = db.query(SchemeDocument).filter(SchemeDocument.scheme_id == scheme.id, SchemeDocument.is_active==True).order_by(SchemeDocument.order_index).all()
    rules = db.query(SchemeRule).filter(SchemeRule.scheme_id == scheme.id, SchemeRule.is_active==True).order_by(SchemeRule.order_index).all()
    weights = db.query(SchemeScoreWeight).filter(SchemeScoreWeight.scheme_id == scheme.id, SchemeScoreWeight.is_active==True).all()
    return {
        "id": scheme.id,
        "name": scheme.name,
        "description": scheme.description,
        "department": scheme.department,
        "education_level": scheme.education_level,
        "target_category": scheme.target_category,
        "income_limit": scheme.income_limit,
        "age_min": scheme.age_min,
        "age_max": scheme.age_max,
        "seats": scheme.seats,
        "start_date": scheme.start_date,
        "end_date": scheme.end_date,
        "status": scheme.status,
        "is_published": scheme.is_published,
        "current_version": scheme.current_version,
        "fields": [{"id": f.id, "field_key": f.field_key, "label": f.label, "field_type": f.field_type, "placeholder": f.placeholder, "required": f.required, "validation": f.validation, "options": f.options, "help_text": f.help_text, "order_index": f.order_index} for f in fields],
        "documents": [{"id": d.id, "document_key": d.document_key, "document_name": d.document_name, "required": d.required, "allowed_file_types": d.allowed_file_types, "max_size_mb": d.max_size_mb, "validity_required": d.validity_required, "help_text": d.help_text, "order_index": d.order_index} for d in docs],
        "rules": [{"id": r.id, "field_key": r.field_key, "operator": r.operator, "value": r.value, "action": r.action, "message": r.message} for r in rules],
        "score_weights": [{"id": w.id, "component": w.component, "weight": w.weight, "description": w.description} for w in weights],
        "created_at": scheme.created_at,
        "updated_at": scheme.updated_at
    }

@router.get("/schemes")
def list_schemes(
    search: Optional[str] = None,
    state: Optional[str] = None,
    category: Optional[str] = None,
    education_level: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    q = db.query(Scheme)
    if search:
        q = q.filter(Scheme.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Scheme.target_category.ilike(f"%{category}%"))
    if education_level:
        q = q.filter(Scheme.education_level == education_level)
    if status:
        q = q.filter(Scheme.status == status)
    total = q.count()
    schemes = q.order_by(Scheme.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    items = []
    for s in schemes:
        items.append(scheme_to_response(s, db))
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/schemes/{scheme_id}")
def get_scheme(scheme_id: str, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme_to_response(scheme, db)

# Admin routes
@router.post("/admin/schemes")
def create_scheme(payload: SchemeCreate, current_user = Depends(require_roles("super_admin", "scheme_officer")), db: Session = Depends(get_db)):
    # Validate weights total 100 if provided
    if payload.score_weights:
        total = sum(w.weight for w in payload.score_weights)
        if total != 100:
            raise HTTPException(status_code=400, detail=f"Score weights must total 100, got {total}")
    scheme = Scheme(
        name=payload.name,
        description=payload.description,
        department=payload.department,
        education_level=payload.education_level,
        target_category=payload.target_category,
        income_limit=payload.income_limit,
        age_min=payload.age_min,
        age_max=payload.age_max,
        seats=payload.seats,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="draft",
        is_published=False,
        current_version=1,
        created_by=current_user.id
    )
    db.add(scheme)
    db.commit()
    db.refresh(scheme)
    # Fields
    if payload.fields:
        for idx, f in enumerate(payload.fields):
            sf = SchemeField(
                scheme_id=scheme.id,
                field_key=f.field_key,
                label=f.label,
                field_type=f.field_type,
                placeholder=f.placeholder,
                required=f.required,
                validation=f.validation,
                options=f.options,
                help_text=f.help_text,
                order_index=idx
            )
            db.add(sf)
    # Documents
    if payload.documents:
        for idx, d in enumerate(payload.documents):
            sd = SchemeDocument(
                scheme_id=scheme.id,
                document_key=d.document_key,
                document_name=d.document_name,
                required=d.required,
                allowed_file_types=d.allowed_file_types,
                max_size_mb=d.max_size_mb,
                validity_required=d.validity_required,
                expiry_rule_days=d.expiry_rule_days,
                help_text=d.help_text,
                order_index=idx
            )
            db.add(sd)
    # Rules
    if payload.rules:
        for idx, r in enumerate(payload.rules):
            sr = SchemeRule(
                scheme_id=scheme.id,
                field_key=r.field_key,
                operator=r.operator,
                value=r.value,
                action=r.action,
                message=r.message,
                order_index=idx
            )
            db.add(sr)
    # Weights
    if payload.score_weights:
        for w in payload.score_weights:
            sw = SchemeScoreWeight(scheme_id=scheme.id, component=w.component, weight=w.weight, description=w.description)
            db.add(sw)
    else:
        # Default weights
        defaults = [("academic",40),("research",25),("institution",15),("socio_economic",10),("interview",10)]
        for comp, wt in defaults:
            db.add(SchemeScoreWeight(scheme_id=scheme.id, component=comp, weight=wt))
    # Audit
    db.add(AuditLog(actor_id=current_user.id, actor_role="super_admin", action="SCHEME_CREATED", entity="scheme", entity_id=scheme.id, new_value={"name": scheme.name}))
    db.commit()
    db.refresh(scheme)
    return scheme_to_response(scheme, db)

@router.put("/admin/schemes/{scheme_id}")
def update_scheme(scheme_id: str, payload: SchemeUpdate, current_user = Depends(require_roles("super_admin", "scheme_officer")), db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    old = {"name": scheme.name, "status": scheme.status}
    update_data = payload.model_dump(exclude_unset=True)
    # Handle nested
    fields = update_data.pop("fields", None)
    documents = update_data.pop("documents", None)
    rules = update_data.pop("rules", None)
    score_weights = update_data.pop("score_weights", None)
    for k,v in update_data.items():
        setattr(scheme, k, v)
    scheme.updated_at = datetime.utcnow()
    # If fields provided, replace
    if fields is not None:
        db.query(SchemeField).filter(SchemeField.scheme_id == scheme.id).delete()
        for idx, f in enumerate(fields):
            sf = SchemeField(scheme_id=scheme.id, field_key=f["field_key"], label=f["label"], field_type=f["field_type"], placeholder=f.get("placeholder"), required=f.get("required",False), validation=f.get("validation"), options=f.get("options"), help_text=f.get("help_text"), order_index=idx)
            db.add(sf)
    if documents is not None:
        db.query(SchemeDocument).filter(SchemeDocument.scheme_id == scheme.id).delete()
        for idx, d in enumerate(documents):
            sd = SchemeDocument(scheme_id=scheme.id, document_key=d["document_key"], document_name=d["document_name"], required=d.get("required",True), allowed_file_types=d.get("allowed_file_types", ["pdf","jpg","jpeg","png"]), max_size_mb=d.get("max_size_mb",5), validity_required=d.get("validity_required",False), expiry_rule_days=d.get("expiry_rule_days"), help_text=d.get("help_text"), order_index=idx)
            db.add(sd)
    if rules is not None:
        db.query(SchemeRule).filter(SchemeRule.scheme_id == scheme.id).delete()
        for idx, r in enumerate(rules):
            sr = SchemeRule(scheme_id=scheme.id, field_key=r["field_key"], operator=r["operator"], value=r.get("value"), action=r["action"], message=r.get("message"), order_index=idx)
            db.add(sr)
    if score_weights is not None:
        total = sum(w["weight"] for w in score_weights)
        if total != 100:
            raise HTTPException(status_code=400, detail=f"Score weights must total 100, got {total}")
        db.query(SchemeScoreWeight).filter(SchemeScoreWeight.scheme_id == scheme.id).delete()
        for w in score_weights:
            db.add(SchemeScoreWeight(scheme_id=scheme.id, component=w["component"], weight=w["weight"], description=w.get("description")))
    # Version bump
    scheme.current_version += 1
    db.add(SchemeVersion(scheme_id=scheme.id, version_number=scheme.current_version, change_notes="Updated via configurator", snapshot={"name": scheme.name}, created_by=current_user.id))
    db.add(AuditLog(actor_id=current_user.id, actor_role="super_admin", action="SCHEME_UPDATED", entity="scheme", entity_id=scheme.id, old_value=old, new_value={"name": scheme.name, "version": scheme.current_version}))
    db.commit()
    db.refresh(scheme)
    return scheme_to_response(scheme, db)

@router.post("/admin/schemes/{scheme_id}/publish")
def publish_scheme(scheme_id: str, current_user = Depends(require_roles("super_admin", "scheme_officer")), db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    scheme.is_published = True
    scheme.status = "active"
    db.add(AuditLog(actor_id=current_user.id, actor_role="super_admin", action="SCHEME_PUBLISHED", entity="scheme", entity_id=scheme.id, new_value={"status": "active"}))
    db.commit()
    return {"message": "Scheme published", "scheme": scheme_to_response(scheme, db)}

@router.post("/admin/schemes/{scheme_id}/duplicate")
def duplicate_scheme(scheme_id: str, current_user = Depends(require_roles("super_admin", "scheme_officer")), db: Session = Depends(get_db)):
    orig = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Scheme not found")
    new_scheme = Scheme(
        name=orig.name + " (Copy)",
        description=orig.description,
        department=orig.department,
        education_level=orig.education_level,
        target_category=orig.target_category,
        income_limit=orig.income_limit,
        age_min=orig.age_min,
        age_max=orig.age_max,
        seats=orig.seats,
        start_date=orig.start_date,
        end_date=orig.end_date,
        status="draft",
        is_published=False,
        current_version=1,
        created_by=current_user.id
    )
    db.add(new_scheme)
    db.commit()
    db.refresh(new_scheme)
    # Copy fields etc
    for f in db.query(SchemeField).filter(SchemeField.scheme_id == orig.id).all():
        db.add(SchemeField(scheme_id=new_scheme.id, field_key=f.field_key, label=f.label, field_type=f.field_type, placeholder=f.placeholder, required=f.required, validation=f.validation, options=f.options, help_text=f.help_text, order_index=f.order_index))
    for d in db.query(SchemeDocument).filter(SchemeDocument.scheme_id == orig.id).all():
        db.add(SchemeDocument(scheme_id=new_scheme.id, document_key=d.document_key, document_name=d.document_name, required=d.required, allowed_file_types=d.allowed_file_types, max_size_mb=d.max_size_mb, validity_required=d.validity_required, expiry_rule_days=d.expiry_rule_days, help_text=d.help_text, order_index=d.order_index))
    for r in db.query(SchemeRule).filter(SchemeRule.scheme_id == orig.id).all():
        db.add(SchemeRule(scheme_id=new_scheme.id, field_key=r.field_key, operator=r.operator, value=r.value, action=r.action, message=r.message, order_index=r.order_index))
    for w in db.query(SchemeScoreWeight).filter(SchemeScoreWeight.scheme_id == orig.id).all():
        db.add(SchemeScoreWeight(scheme_id=new_scheme.id, component=w.component, weight=w.weight, description=w.description))
    db.commit()
    return scheme_to_response(new_scheme, db)

@router.get("/admin/schemes/{scheme_id}/versions")
def get_versions(scheme_id: str, current_user = Depends(require_roles("super_admin", "scheme_officer")), db: Session = Depends(get_db)):
    versions = db.query(SchemeVersion).filter(SchemeVersion.scheme_id == scheme_id).order_by(SchemeVersion.version_number.desc()).all()
    return {"items": [{"id": v.id, "version_number": v.version_number, "change_notes": v.change_notes, "created_at": v.created_at, "snapshot": v.snapshot} for v in versions]}

@router.post("/admin/scheme-simulator/{scheme_id}")
def simulate(scheme_id: str, payload: dict, current_user = Depends(require_roles("super_admin", "scheme_officer")), db: Session = Depends(get_db)):
    # Simulate impact of config change on synthetic data
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    # Generate synthetic stats
    import random
    random.seed(42)
    # Before: based on current config
    before = {"eligible": 72, "deficient": 18, "ineligible": 10, "total": 100}
    # After: adjust based on payload changes
    new_income = payload.get("income_limit", scheme.income_limit)
    new_seats = payload.get("seats", scheme.seats)
    # Simple heuristic: higher income limit increases eligible
    delta = 0
    if new_income and scheme.income_limit:
        if new_income > scheme.income_limit:
            delta = min(15, (new_income - scheme.income_limit)//50000)
        elif new_income < scheme.income_limit:
            delta = - min(10, (scheme.income_limit - new_income)//50000)
    after_eligible = max(0, min(100, before["eligible"] + delta))
    after_deficient = max(0, before["deficient"] - delta//2)
    after_ineligible = 100 - after_eligible - after_deficient
    after = {"eligible": after_eligible, "deficient": after_deficient, "ineligible": after_ineligible, "total": 100, "seats": new_seats}
    return {"before": before, "after": after, "note": "Simulation uses synthetic demo data - not real applicant data", "config_change": payload}

