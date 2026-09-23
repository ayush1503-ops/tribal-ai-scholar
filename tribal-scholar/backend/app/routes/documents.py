from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os, hashlib, mimetypes
from datetime import datetime
from PIL import Image
from ..core.database import get_db
from ..core.security import get_current_user
from ..models.models import Application, Applicant, Document, DocumentExtraction, AuditLog
from ..services.ai_services import check_document_quality, extract_text_ocr
from ml.fake_detector import get_fake_detector
from ..services.photo_scan_service import get_photo_scan_service

router = APIRouter(prefix="/api/v1", tags=["documents"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTS = {"pdf","jpg","jpeg","png"}
ALLOWED_MIME = {"application/pdf","image/jpeg","image/jpg","image/png"}

def get_user_roles(db, user_id):
    from ..models.models import UserRoleAssignment, Role
    assignments = db.query(UserRoleAssignment).filter(UserRoleAssignment.user_id == user_id).all()
    roles = []
    for a in assignments:
        r = db.query(Role).filter(Role.id == a.role_id).first()
        if r:
            roles.append(r.name)
    return roles

@router.post("/applications/{app_id}/documents")
async def upload_document(
    app_id: str,
    document_key: str = Form(...),
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    # Auth - applicant owns or officer
    roles = get_user_roles(db, current_user.id)
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","institute_verifier"] for r in roles):
        if not applicant or app.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        # Check status allows upload
        if app.status not in ["DRAFT","DEFICIENCY_RAISED","RESUBMITTED"]:
            raise HTTPException(status_code=400, detail=f"Cannot upload in status {app.status}")
    # Validate file
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"File extension .{ext} not allowed. Allowed: {ALLOWED_EXTS}")
    # Read bytes
    content = await file.read()
    size = len(content)
    max_size = 5 * 1024 * 1024
    if size > max_size:
        raise HTTPException(status_code=400, detail=f"File too large {size} > {max_size} bytes (5MB limit)")
    # MIME sniff
    # Use python-magic if available else mimetypes
    mime = mimetypes.guess_type(file.filename)[0] or file.content_type
    # Content signature check: try PIL for images, fallback
    if ext in ["jpg","jpeg","png"]:
        try:
            img = Image.open(os.path.join("/tmp", f"tmp_{file.filename}")) if False else None
            # Use bytes
            from io import BytesIO
            Image.open(BytesIO(content)).verify()
        except Exception:
            raise HTTPException(status_code=400, detail="File content does not match image signature - possibly corrupted or wrong type")
    # Check duplicate hash?
    file_hash = hashlib.sha256(content).hexdigest()
    # Save file
    # Create per-application dir
    app_dir = os.path.join(UPLOAD_DIR, app_id)
    os.makedirs(app_dir, exist_ok=True)
    # Unique filename
    save_name = f"{document_key}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    save_path = os.path.join(app_dir, save_name)
    with open(save_path, "wb") as f:
        f.write(content)
    # Check if existing document for same key - replace or create new version?
    existing = db.query(Document).filter(Document.application_id == app_id, Document.document_key == document_key).first()
    if existing:
        # Update existing
        existing.file_name = file.filename
        existing.file_path = save_path
        existing.file_size = size
        existing.mime_type = mime
        existing.status = "uploaded"
        existing.uploaded_at = datetime.utcnow()
        doc = existing
    else:
        doc = Document(
            application_id=app_id,
            applicant_id=app.applicant_id,
            document_key=document_key,
            document_name=document_key.replace("_"," ").title(),
            file_name=file.filename,
            file_path=save_path,
            file_size=size,
            mime_type=mime,
            status="uploaded"
        )
        db.add(doc)
    db.commit()
    db.refresh(doc)
    # Audit
    db.add(AuditLog(actor_id=current_user.id, actor_role=roles[0] if roles else "applicant", action="DOCUMENT_UPLOADED", entity="document", entity_id=doc.id, new_value={"document_key": document_key, "file_name": file.filename}))
    db.commit()
    # Trigger quality check and OCR asynchronously? For prototype do inline
    # Quality
    quality = check_document_quality(save_path, content)
    # OCR
    ocr_result = extract_text_ocr(save_path)
    # Forensic photo scan — fake document detection (advisory)
    scan_result = {}
    forensic = None
    quality = None
    try:
        photo_svc = get_photo_scan_service()
        scan_result = photo_svc.scan_bytes(content, file.filename, document_key)
        forensic = scan_result.get("forensic")
        quality = scan_result.get("quality")
        # Persist forensic flags if medium/high into DocumentVerificationFlag table
        if forensic and forensic.get("needs_review"):
            try:
                from ..models.models import DocumentVerificationFlag
                db.query(DocumentVerificationFlag).filter(DocumentVerificationFlag.document_id==doc.id, DocumentVerificationFlag.flag_type.like("forensic%")).delete()
                db.add(DocumentVerificationFlag(
                    document_id=doc.id,
                    application_id=app_id,
                    flag_type="forensic_fake_check",
                    severity="high" if forensic.get("level")=="High" else "medium",
                    message=f"Photo scan {forensic.get('level')} ({forensic.get('score')}/85) — {forensic.get('verdict')}",
                    evidence={"score": forensic.get("score"), "level": forensic.get("level"), "factors": [f["name"]+": "+f["detail"] for f in forensic.get("factors",[])[:3]], "evidence": forensic.get("evidence")}
                ))
                db.commit()
            except Exception as e:
                print(f"Forensic flag save error: {e}")
    except Exception as e:
        print(f"Photo scan error: {e}")
        try:
            forensic = get_fake_detector().scan(content_bytes=content, filename=file.filename, doc_type_hint=document_key)
        except:
            forensic = {"score": 0, "level": "Low", "verdict": "Scan unavailable — standard review", "needs_review": False, "evidence": [], "model": "fallback"}
        scan_result = {"forensic": forensic, "quality": quality or {"flags":[], "penalty":0}, "classification": {"predicted": document_key, "confidence": 50}, "summary": {"forensic_score": forensic.get("score"), "forensic_level": forensic.get("level")}}
    # Save extraction
    existing_ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == doc.id).first()
    if existing_ext:
        existing_ext.extracted_text = ocr_result["extracted_text"]
        existing_ext.extracted_fields = ocr_result["extracted_fields"]
        existing_ext.confidence_scores = ocr_result["confidence_scores"]
        existing_ext.ocr_engine = ocr_result["ocr_engine"]
        existing_ext.needs_correction = ocr_result["needs_correction"]
    else:
        ext_doc = DocumentExtraction(
            document_id=doc.id,
            extracted_text=ocr_result["extracted_text"],
            extracted_fields=ocr_result["extracted_fields"],
            confidence_scores=ocr_result["confidence_scores"],
            ocr_engine=ocr_result["ocr_engine"],
            needs_correction=ocr_result["needs_correction"]
        )
        db.add(ext_doc)
    # Update doc status
    doc.status = "extracted" if not ocr_result["needs_correction"] else "needs_review"
    db.add(AuditLog(actor_id=current_user.id, actor_role="system", action="OCR_COMPLETED", entity="document", entity_id=doc.id, new_value={"ocr_engine": ocr_result["ocr_engine"]}))
    db.commit()
    return {
        "id": doc.id,
        "document_key": doc.document_key,
        "file_name": doc.file_name,
        "status": doc.status,
        "quality_flags": quality.get("flags"),
        "ocr": ocr_result,
        "forensic": scan_result.get("forensic"),
        "classification": scan_result.get("classification"),
        "scan_summary": scan_result.get("summary"),
        "message": "Document uploaded — OCR + forensic photo scan completed (advisory, officer decides)"
    }

@router.get("/applications/{app_id}/documents")
def list_documents(app_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    roles = get_user_roles(db, current_user.id)
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","institute_verifier","auditor","selection_committee","finance_officer"] for r in roles):
        if not applicant or app.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    docs = db.query(Document).filter(Document.application_id == app_id).all()
    result = []
    for d in docs:
        ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == d.id).first()
        result.append({
            "id": d.id,
            "document_key": d.document_key,
            "document_name": d.document_name,
            "file_name": d.file_name,
            "file_size": d.file_size,
            "mime_type": d.mime_type,
            "status": d.status,
            "uploaded_at": d.uploaded_at,
            "extraction": {
                "extracted_text": ext.extracted_text if ext else None,
                "extracted_fields": ext.extracted_fields if ext else None,
                "confidence_scores": ext.confidence_scores if ext else None,
                "ocr_engine": ext.ocr_engine if ext else None,
                "needs_correction": ext.needs_correction if ext else None
            } if ext else None
        })
    return {"items": result}

@router.get("/documents/{doc_id}")
def get_document(doc_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Auth check similar
    app = db.query(Application).filter(Application.id == doc.application_id).first()
    roles = get_user_roles(db, current_user.id)
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","institute_verifier","auditor","selection_committee","finance_officer"] for r in roles):
        if app and applicant and app.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == doc.id).first()
    return {
        "id": doc.id,
        "application_id": doc.application_id,
        "document_key": doc.document_key,
        "document_name": doc.document_name,
        "file_name": doc.file_name,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "status": doc.status,
        "file_path": doc.file_path,
        "uploaded_at": doc.uploaded_at,
        "extraction": {
            "extracted_text": ext.extracted_text if ext else None,
            "extracted_fields": ext.extracted_fields if ext else None,
            "confidence_scores": ext.confidence_scores if ext else None,
            "ocr_engine": ext.ocr_engine if ext else None
        } if ext else None
    }

@router.post("/documents/{doc_id}/ocr")
def rerun_ocr(doc_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    ocr_result = extract_text_ocr(doc.file_path)
    ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == doc.id).first()
    if ext:
        ext.extracted_text = ocr_result["extracted_text"]
        ext.extracted_fields = ocr_result["extracted_fields"]
        ext.confidence_scores = ocr_result["confidence_scores"]
        ext.ocr_engine = ocr_result["ocr_engine"]
    else:
        ext = DocumentExtraction(document_id=doc.id, extracted_text=ocr_result["extracted_text"], extracted_fields=ocr_result["extracted_fields"], confidence_scores=ocr_result["confidence_scores"], ocr_engine=ocr_result["ocr_engine"])
        db.add(ext)
    doc.status = "extracted"
    db.commit()
    return {"message": "OCR re-run", "ocr": ocr_result}

@router.post("/documents/{doc_id}/verify")
def verify_document(doc_id: str, payload: dict, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    roles = get_user_roles(db, current_user.id)
    if not any(r in ["institute_verifier","district_officer","scheme_officer","super_admin"] for r in roles):
        raise HTTPException(status_code=403, detail="Insufficient role to verify document")
    action = payload.get("action") # verified, rejected, needs_review
    if action not in ["verified","rejected","needs_review"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    old = doc.status
    doc.status = action
    doc.verified_by = current_user.id
    doc.verified_at = datetime.utcnow()
    db.add(AuditLog(actor_id=current_user.id, actor_role=roles[0], action="DOCUMENT_VERIFIED", entity="document", entity_id=doc.id, old_value={"status": old}, new_value={"status": action, "reason": payload.get("reason")}))
    db.commit()
    return {"message": f"Document {action}", "status": doc.status}

@router.post("/documents/{doc_id}/scan")
def scan_document(doc_id: str, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Auth - check owns or officer
    app = db.query(Application).filter(Application.id == doc.application_id).first()
    roles = get_user_roles(db, current_user.id)
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if "applicant" in roles and not any(r in ["super_admin","scheme_officer","district_officer","institute_verifier","auditor","selection_committee","finance_officer"] for r in roles):
        if app and applicant and app.applicant_id != applicant.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    # Run scan
    try:
        svc = get_photo_scan_service()
        if doc.file_path and os.path.exists(doc.file_path):
            with open(doc.file_path, "rb") as f:
                content = f.read()
            result = svc.scan_bytes(content, doc.file_name or os.path.basename(doc.file_path), doc.document_key)
            return result
        else:
            # No file — forensic error
            forensic = get_fake_detector().scan(file_path=doc.file_path or doc.file_name, filename=doc.file_name)
            return {"forensic": forensic, "disclaimer": "File not found on disk — scan from path only"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)[:200]}")

@router.post("/documents/scan")
async def scan_upload(file: UploadFile = File(...), document_key: Optional[str] = Form(None), current_user = Depends(get_current_user)):
    content = await file.read()
    try:
        svc = get_photo_scan_service()
        result = svc.scan_bytes(content, file.filename or "upload.jpg", document_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)[:200]}")

@router.post("/documents/{doc_id}/correct")
def correct_extraction(doc_id: str, payload: dict, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Only applicant who owns or officer can correct? For prototype allow applicant
    ext = db.query(DocumentExtraction).filter(DocumentExtraction.document_id == doc.id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extraction not found")
    # payload contains corrected fields
    corrected = payload.get("extracted_fields")
    if not corrected:
        raise HTTPException(status_code=400, detail="extracted_fields required")
    ext.extracted_fields = corrected
    ext.corrected_by_applicant = True
    ext.needs_correction = False
    doc.status = "extracted"
    db.add(AuditLog(actor_id=current_user.id, actor_role="applicant", action="OCR_CORRECTED", entity="document", entity_id=doc.id, new_value=corrected))
    db.commit()
    return {"message": "Extraction corrected", "extraction": corrected}
