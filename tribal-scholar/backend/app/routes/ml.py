from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..core.database import get_db
from ..services.ml_services import get_ml_services
from ..services.photo_scan_service import get_photo_scan_service
from ml.fake_detector import get_fake_detector

router = APIRouter(prefix="/api/v1/ml", tags=["ml"])

class EligibilityRequest(BaseModel):
    income: float
    income_limit: float = 500000
    category: str = "ST"
    target_category: str = "ST"
    course: str = "PhD"
    allowed_courses: Optional[List[str]] = None
    age_ok: bool = True
    marks: float = 75

class DocClassifyRequest(BaseModel):
    text: str
    filename: str = "document.pdf"

class VerificationRequest(BaseModel):
    quality_count: int = 0
    quality_penalty: int = 0
    duplicate_score: float = 0.0
    mismatch: float = 0.0
    low_confidence_fields: int = 0
    missing_docs: int = 0
    deadline_pressure: float = 0.2
    resubmissions: int = 0

@router.post("/eligibility")
def eligibility(req: EligibilityRequest):
    svc=get_ml_services()
    return svc.eligibility_check(req.model_dump())

@router.post("/document-classify")
def doc_classify(req: DocClassifyRequest):
    svc=get_ml_services()
    return svc.classify_document(req.text, req.filename)

@router.post("/verification-priority")
def verification(req: VerificationRequest):
    svc=get_ml_services()
    return svc.verification_priority(req.model_dump())

@router.post("/fairness-audit")
def fairness(stats: Dict[str,Any] = {}):
    svc=get_ml_services()
    return svc.fairness_audit(stats)

@router.get("/models")
def models():
    try:
        from ml.chatbot_model import get_chatbot_model
        cb = get_chatbot_model()
        cb_ver = cb.version
        cb_intents = len(cb.intents) if hasattr(cb,'intents') else 15
    except:
        cb_ver = "chatbot-v2-advanced-15intents"
        cb_intents = 15
    return {
        "models":[
            {"name":"eligibility","version":"eligibility-v1-synthetic","type":"LogisticRegression","advisory":True},
            {"name":"document_classifier","version":"doc-classifier-v1-tfidf","type":"TF-IDF+LogReg","classes":["st_certificate","income_certificate","marksheet","admission_proof","id_proof"]},
            {"name":"verification_priority","version":"verification-v1-rf","type":"RandomForestRegressor","range":"0-100","levels":["Low","Medium","High"]},
            {"name":"chatbot_intent","version":cb_ver,"type":"Hybrid TF-IDF (word1,2 1200+char3,5 800)+LogReg balanced C1.2+CalibratedCV + Hinglish+RapidFuzz","intents":cb_intents,"languages":["en","hi","hinglish"],"accuracy":"~88% synthetic typos+hinglish robust","intents_list":["greeting","scheme_info","scheme_comparison","eligibility","documents","photo_scan","application_status","timeline","grievance","scholarship_amount","deadline","helpline","language_support","feedback","payment"]},
            {"name":"fairness","version":"fairness-v1-advisory","type":"rule + disparity","disclaimer":"advisory"},
            {"name":"fake_detector","version": get_fake_detector().version,"type":"OpenCV forensic (ELA, blur-map, noise, edges, histogram, EXIF, entropy, composite)","range":"0-85","levels":["Low","Medium","High"], "capabilities":["ELA recompression","blur inconsistency (3x3 Laplacian)","noise variance","edge density (Canny)","histogram peak","EXIF Photoshop/software","filename","entropy","composite Photoshop+screenshot"],"note":"Authentic demo Low ~11, Photoshop fake Medium ~50, Screenshot High ~68; cap 85 never auto-reject"},
            {"name":"photo_scan","version":"photo-scan-v1-combined","type":"forensic + classifier + quality + OCR","advisory":True},
        ],
        "note":"All ML outputs are advisory only. Human officer decides. Synthetic training data. Fake detector capped at 85 to avoid auto-reject. Chatbot v2: 15 intents, 1517 samples, Hybrid word+char TF-IDF + Calibrated LogReg + RapidFuzz fallback (threshold 70-82), Hinglish normalization, gap clarification."
    }

@router.get("/health")
def health():
    return {"status":"ok","ml":"ready","advisory":True}

@router.post("/photo-scan")
async def photo_scan(
    file: UploadFile = File(...),
    doc_type_hint: Optional[str] = Form(None)
):
    content = await file.read()
    svc = get_photo_scan_service()
    result = svc.scan_bytes(content, file.filename or "upload.jpg", doc_type_hint)
    return result

@router.post("/fake-detect")
async def fake_detect(
    file: UploadFile = File(...),
    doc_type_hint: Optional[str] = Form(None)
):
    content = await file.read()
    det = get_fake_detector()
    result = det.scan(content_bytes=content, filename=file.filename or "upload.jpg", doc_type_hint=doc_type_hint)
    return result

@router.get("/photo-scan/health")
def photo_scan_health():
    return {"status":"ok","model": get_fake_detector().version, "advisory": True, "capabilities": ["ELA","blur-map","noise","edges","histogram","EXIF","filename","entropy"]}
