"""
Photo Scan Service — wraps FakeDocumentDetector + DocumentClassifier + Quality checks
for single-call photo scan. Advisory forensic scan, human decides.
"""
from typing import Dict, Any, Optional
import os

from ml.fake_detector import get_fake_detector
from ml.document_classifier import get_document_classifier
from .ai_services import check_document_quality, extract_text_ocr

class PhotoScanService:
    def __init__(self):
        self.detector = get_fake_detector()
        self.classifier = get_document_classifier()

    def scan_bytes(self, content: bytes, filename: str, doc_type_hint: str = None) -> Dict[str,Any]:
        # Run forensic detector
        forensic = self.detector.scan(content_bytes=content, filename=filename, doc_type_hint=doc_type_hint, file_path=filename)

        # Run document classifier on extracted text placeholder (filename + hint) + size heuristic
        text_hint = filename
        ocr = None
        quality = None
        try:
            tmp = f"/tmp/scan_{filename.replace('/','_')}"
            with open(tmp, "wb") as f:
                f.write(content)
            ocr = extract_text_ocr(tmp)
            text_hint = (ocr.get("extracted_text") or "")[:800] + " " + filename
            quality = check_document_quality(tmp, content)
            try: os.remove(tmp)
            except: pass
        except Exception as e:
            ocr = {"extracted_text": text_hint, "extracted_fields": {}, "confidence_scores": {}, "ocr_engine":"mock"}
            quality = {"flags": [], "penalty":0}

        classification = self.classifier.predict(text_hint, filename)

        combined_reasons = []
        if forensic["needs_review"]:
            combined_reasons.append(f"Forensic scan {forensic['level']} ({forensic['score']}/85)")
        if quality and quality.get("flags"):
            combined_reasons.append(f"{len(quality['flags'])} quality flag(s)")
        if classification.get("needs_review"):
            combined_reasons.append(f"Document type {classification['predicted']} confidence {classification['confidence']}% low")

        overall_level = forensic["level"]
        if forensic["level"]=="Low" and quality and quality.get("penalty",0)>15:
            overall_level = "Medium"

        return {
            "forensic": forensic,
            "classification": classification,
            "quality": quality,
            "ocr": ocr,
            "summary": {
                "filename": filename,
                "doc_type_hint": doc_type_hint,
                "forensic_score": forensic["score"],
                "forensic_level": forensic["level"],
                "doc_predicted": classification["predicted"],
                "doc_confidence": classification["confidence"],
                "overall_level": overall_level,
                "needs_review": forensic["needs_review"] or (quality.get("penalty",0)>15 if quality else False) or classification.get("needs_review", False),
                "reasons": combined_reasons[:4],
            },
            "disclaimer": "All signals advisory — officer verifies with issuer if needed. No automatic rejection. Synthetic demo forensic.",
            "advisory": True
        }

    def scan_file(self, file_path: str, filename: str = None, doc_type_hint: str = None) -> Dict[str, Any]:
        try:
            with open(file_path, "rb") as f:
                content = f.read()
        except Exception as e:
            return {"error": f"Could not read file: {e}", "forensic": None}
        return self.scan_bytes(content, filename or os.path.basename(file_path), doc_type_hint)

_singleton = None
def get_photo_scan_service():
    global _singleton
    if _singleton is None:
        _singleton = PhotoScanService()
    return _singleton
