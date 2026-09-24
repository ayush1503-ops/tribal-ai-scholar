from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import hashlib
import traceback
import logging

from ..certificate_checker.image_pipeline import prepare_image, InvalidImage
from ..certificate_checker.ocr_engine import read_text, OCRUnavailable
from ..certificate_checker.field_extractor import extract_fields
from ..certificate_checker.verifier import screen_certificate

logger = logging.getLogger(__name__)

router=APIRouter(tags=["documents"])
UPLOAD_DIR=Path("uploads"); UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/applications/{application_id}/documents")
async def upload_document(application_id:str,document_key:str,file:UploadFile=File(...)):
    if file.content_type not in {"image/jpeg","image/png","application/pdf"}:
        raise HTTPException(400,"Only PDF, JPG and PNG are allowed.")
    data=await file.read()
    if len(data)>10*1024*1024: raise HTTPException(400,"File exceeds 10 MB.")
    digest=hashlib.sha256(data).hexdigest()
    name=f"{digest}_{Path(file.filename or 'document').name}"
    (UPLOAD_DIR/name).write_bytes(data)
    
    ai_note = "Ready for OCR/quality analysis."
    
    if document_key == "sc_st_certificate" and file.content_type in {"image/jpeg", "image/png"}:
        try:
            prepared = prepare_image(data)
            ocr = read_text(prepared.ocr_variants)
            fields = extract_fields(ocr.text)
            quality = prepared.quality.to_dict()
            verification = screen_certificate(
                fields=fields,
                raw_text=ocr.text,
                ocr_confidence=ocr.confidence,
                word_count=ocr.word_count,
                quality=quality,
                qr_values=prepared.qr_values,
                state_code="auto",
            )
            ai_note = "Certificate processed locally. Result: " + ("PASS" if verification["is_pass"] else "REVIEW")
            return {
                "application_id":application_id, "document_key":document_key, "filename":file.filename,
                "sha256":digest, "size":len(data), "status":"PROCESSED", "ai_note":ai_note,
                "verification": verification,
                "fields": fields,
                "quality": quality
            }
        except Exception as e:
            logger.exception("Certificate analysis failed")
            ai_note = f"Analysis failed: {str(e)}"

    return {"application_id":application_id,"document_key":document_key,"filename":file.filename,
            "sha256":digest,"size":len(data),"status":"UPLOADED","ai_note":ai_note}
