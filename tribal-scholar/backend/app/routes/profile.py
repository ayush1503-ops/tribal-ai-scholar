from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import Applicant, User
from ..schemas.schemas import ApplicantCreate

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

@router.get("")
def get_profile(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    roles = []
    from ..models.models import UserRoleAssignment, Role
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == current_user.id).all()
    for a in assignments:
        r = db.query(Role).filter(Role.id == a.role_id).first()
        if r:
            roles.append(r.name)
    return {
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "phone": user.phone, "roles": roles},
        "applicant": {
            "id": applicant.id if applicant else None,
            "full_name": applicant.full_name if applicant else user.full_name,
            "dob": applicant.dob if applicant else None,
            "gender": applicant.gender if applicant else None,
            "category": applicant.category if applicant else None,
            "state": applicant.state if applicant else None,
            "district": applicant.district if applicant else None,
            "mobile": applicant.mobile if applicant else user.phone,
            "email": applicant.email if applicant else user.email,
            "address": applicant.address if applicant else None,
            "institute_id": applicant.institute_id if applicant else None,
            "course": applicant.course if applicant else None,
            "admission_year": applicant.admission_year if applicant else None,
            "annual_family_income": applicant.annual_family_income if applicant else None,
            "parent_name": applicant.parent_name if applicant else None,
            "bank_account_placeholder": applicant.bank_account_placeholder if applicant else None,
        } if applicant else None
    }

@router.put("")
def update_profile(payload: ApplicantCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        applicant = Applicant(user_id=current_user.id, full_name=payload.full_name or current_user.full_name)
        db.add(applicant)
        db.commit()
        db.refresh(applicant)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(applicant, field, value)
    db.commit()
    db.refresh(applicant)
    return {"message": "Profile updated", "applicant": {
        "id": applicant.id,
        "full_name": applicant.full_name,
        "category": applicant.category,
        "state": applicant.state,
        "district": applicant.district,
        "course": applicant.course,
        "annual_family_income": applicant.annual_family_income
    }}
