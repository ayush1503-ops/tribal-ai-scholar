from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user
from ..models.models import User, Role, UserRoleAssignment, Applicant
from ..schemas.schemas import RegisterRequest, LoginRequest, OTPVerifyRequest, TokenResponse
from datetime import datetime

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

def get_roles_for_user(db: Session, user_id: str):
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    roles = []
    for a in assignments:
        r = db.query(Role).filter(Role.id == a.role_id).first()
        if r:
            roles.append(r.name)
    return roles

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Validate role exists
    role_name = req.role or "applicant"
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = db.query(Role).filter(Role.name == "applicant").first()
        role_name = "applicant"
    user = User(
        email=req.email,
        full_name=req.full_name,
        phone=req.phone,
        password_hash=hash_password(req.password),
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Assign role
    assignment = UserRoleAssignment(user_id=user.id, role_id=role.id)
    db.add(assignment)
    db.commit()
    # If applicant role, create applicant profile placeholder
    if role_name == "applicant":
        applicant = Applicant(
            user_id=user.id,
            full_name=req.full_name,
            email=req.email,
            mobile=req.phone,
            category="ST",
            state="Jharkhand",
            district="Ranchi"
        )
        db.add(applicant)
        db.commit()
    roles = get_roles_for_user(db, user.id)
    access = create_access_token({"sub": user.id, "email": user.email})
    refresh = create_refresh_token({"sub": user.id})
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "roles": roles}
    }

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User deactivated")
    roles = get_roles_for_user(db, user.id)
    access = create_access_token({"sub": user.id, "email": user.email})
    refresh = create_refresh_token({"sub": user.id})
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "roles": roles}
    }

@router.post("/otp/verify")
def otp_verify(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    # Mock OTP: always 123456 succeeds
    if req.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP. Use 123456 for prototype.")
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    db.commit()
    return {"message": "OTP verified (prototype)", "verified": True}

@router.post("/refresh")
def refresh(token: dict, db: Session = Depends(get_db)):
    refresh_token = token.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_access = create_access_token({"sub": user.id, "email": user.email})
    return {"access_token": new_access, "token_type": "bearer"}

@router.post("/logout")
def logout(current_user = Depends(get_current_user)):
    # Stateless JWT - prototype just returns success
    return {"message": "Logged out (prototype - clear token on client)"}

@router.get("/me")
def me(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    roles = get_roles_for_user(db, current_user.id)
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "roles": roles,
        "is_verified": current_user.is_verified,
        "applicant": {"id": applicant.id, "category": applicant.category, "state": applicant.state} if applicant else None
    }
