"""Local web application for camera capture and certificate screening.

Supports images (capture/upload) and scanned PDFs (multi-page). All processing
is in-memory and nothing is retained after the request completes.
"""
from __future__ import annotations

import base64
import os

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge

from certificate_checker.config import STATE_CONFIG
from certificate_checker.field_extractor import extract_fields
from certificate_checker.image_pipeline import InvalidImage, prepare_image
from certificate_checker.ocr_engine import OCRUnavailable, read_text, status as ocr_status
from certificate_checker.pdf_pipeline import (
    InvalidPdf,
    PdfUnavailable,
    export_pdf,
    is_pdf_filename,
    process_page,
    render_pages,
)
from certificate_checker.verifier import merge_screenings, screen_certificate

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)
app.config.update(
    MAX_CONTENT_LENGTH=25 * 1024 * 1024,
    JSON_SORT_KEYS=False,
)


@app.after_request
def set_privacy_headers(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Intentionally omit X-Frame-Options so the local/live-preview UI can run
    # inside a sandboxed host. A production reverse proxy should set an explicit
    # frame-ancestors policy for its own deployment origin.
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; "
        "script-src 'self'; style-src 'self'; connect-src 'self'; "
        "base-uri 'self'; form-action 'self'"
    )
    return response


@app.get("/")
def index():
    states = [
        {"code": code, "name": config["name"]}
        for code, config in STATE_CONFIG.items()
    ]
    return render_template("index.html", states=states)


@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "service": "SC/ST certificate screening assistant",
        "ocr": ocr_status(),
        "pdf": _pdf_status(),
        "privacy": "Images and PDFs are processed in memory and are not saved by this application.",
    })


def _pdf_status() -> dict:
    try:
        import fitz  # noqa: F401
        return {"available": True, "message": "PDF scanning is ready."}
    except Exception:
        return {
            "available": False,
            "message": "PDF support needs PyMuPDF (pip install PyMuPDF).",
        }


def _screen_one(
    *,
    quality,
    qr_values,
    ocr,
    state_code,
    image_bytes,
    source_type,
    page=None,
    page_label=None,
):
    fields = extract_fields(ocr.text)
    quality_dict = quality.to_dict()
    verification = screen_certificate(
        fields=fields,
        raw_text=ocr.text,
        ocr_confidence=ocr.confidence,
        word_count=ocr.word_count,
        quality=quality_dict,
        qr_values=qr_values,
        state_code=state_code,
        image_bytes=image_bytes,
        source_type=source_type,
        page=page,
        page_label=page_label,
    )
    return {
        "fields": fields,
        "ocr": ocr.to_dict(),
        "quality": quality_dict,
        "document_detected": quality_dict["document_detected"],
        "verification": verification,
        "page": page,
        "page_label": page_label,
    }


def _analyze_bytes(image_bytes: bytes, state_code: str, filename: str | None):
    """Analyse a single image (used directly and for each PDF page)."""
    prepared = prepare_image(image_bytes)
    ocr = read_text(prepared.ocr_variants)
    return _screen_one(
        quality=prepared.quality,
        qr_values=prepared.qr_values,
        ocr=ocr,
        state_code=state_code,
        image_bytes=image_bytes,
        source_type="image",
    )


def _analyze_pdf(data: bytes, state_code: str, filename: str | None):
    pages = render_pages(data, max_pages=20)
    per_page: list[dict] = []
    page_images: list = []
    for page in pages:
        document, quality = process_page(page["image"])
        ocr = read_text(build_variants(document))
        result = _screen_one(
            quality=quality,
            qr_values=[],
            ocr=ocr,
            state_code=state_code,
            image_bytes=_page_jpeg_bytes(document),
            source_type="pdf",
            page=page["index"] + 1,
            page_label=page["label"],
        )
        result["document"] = document
        per_page.append(result)
        page_images.append(document)

    verification = merge_screenings([p["verification"] for p in per_page])
    # Field summary across pages: union of any non-empty field values.
    merged_fields: dict[str, dict] = {}
    for p in per_page:
        for key, field in p["fields"].items():
            if field.get("value") and key not in merged_fields:
                merged_fields[key] = field
    for p in per_page:
        for key, field in p["fields"].items():
            if key not in merged_fields:
                merged_fields[key] = field

    best_ocr = max((p["ocr"] for p in per_page),
                   key=lambda o: o["confidence"] + min(o["word_count"], 100) * 0.18,
                   default=None)

    pdf_report = None
    export_error = None
    try:
        pdf_report = {
            "mime": "application/pdf",
            "data": base64.b64encode(export_pdf(page_images)).decode("ascii"),
        }
    except Exception as exc:  # report generation is best-effort
        export_error = "PDF export is unavailable (check img2pdf/reportlab)."

    return [{
        "fields": merged_fields,
        "ocr": best_ocr or {},
        "quality": per_page[0]["quality"] if per_page else {},
        "pages": [
            {
                "page": p["page"],
                "page_label": p["page_label"],
                "fields": p["fields"],
                "ocr": p["ocr"],
                "quality": p["quality"],
                "verification": p["verification"],
            }
            for p in per_page
        ],
        "verification": verification,
        "document_detected": bool(per_page),
        "processing": {
            "stored": False,
            "method": "Local OpenCV preprocessing + local OCR + PDF page rendering",
        },
        "pdf_export": pdf_report,
        "pdf_export_error": export_error,
    }]


def build_variants(document):
    """Build OCR-optimised variants from a page image."""
    from certificate_checker.image_pipeline import build_ocr_variants
    return build_ocr_variants(document)


def _page_jpeg_bytes(document) -> bytes | None:
    try:
        import cv2
        ok, encoded = cv2.imencode(".jpg", document, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        return encoded.tobytes() if ok else None
    except Exception:
        return None


@app.post("/api/analyze")
def analyze():
    upload = request.files.get("file") or request.files.get("image")
    if upload is None:
        return jsonify({"error": "Choose or capture an image or PDF first."}), 400
    data = upload.read()
    filename = (upload.filename or "").strip() or None
    if not data:
        return jsonify({"error": "The uploaded file is empty."}), 400

    state_code = request.form.get("state", "auto").strip().lower()
    if state_code not in STATE_CONFIG:
        state_code = "auto"

    is_pdf = is_pdf_filename(filename)

    try:
        if is_pdf:
            results = _analyze_pdf(data, state_code, filename)
        else:
            results = [_analyze_bytes(data, state_code, filename)]
    except InvalidImage as exc:
        return jsonify({"error": str(exc)}), 400
    except InvalidPdf as exc:
        return jsonify({"error": str(exc)}), 400
    except PdfUnavailable as exc:
        return jsonify({
            "error": str(exc),
            "code": "pdf_unavailable",
            "help": "Install PyMuPDF to enable PDF scanning: pip install PyMuPDF.",
        }), 503
    except OCRUnavailable as exc:
        return jsonify({
            "error": str(exc),
            "code": "ocr_unavailable",
            "help": "Install RapidOCR (pip install rapidocr-onnxruntime) or Tesseract, then restart the app.",
        }), 503
    except Exception:
        # Do not return internals or document contents to the client/logs.
        app.logger.exception("Certificate analysis failed")
        return jsonify({"error": "Analysis failed. Try a clearer JPG/PNG image or a clean scanned PDF."}), 500

    payload = results[0]
    if not is_pdf:
        payload["processing"] = {
            "stored": False,
            "method": "Local OpenCV preprocessing + local OCR",
        }
    return jsonify(payload)


@app.post("/api/analyze/pdf")
def analyze_pdf():
    upload = request.files.get("file") or request.files.get("pdf")
    if upload is None:
        return jsonify({"error": "Choose a PDF first."}), 400
    data = upload.read()
    filename = (upload.filename or "document.pdf").strip() or "document.pdf"
    if not data:
        return jsonify({"error": "The uploaded PDF is empty."}), 400
    if not is_pdf_filename(filename):
        return jsonify({"error": "That file does not look like a PDF. Use the main analyse action instead."}), 400

    state_code = request.form.get("state", "auto").strip().lower()
    if state_code not in STATE_CONFIG:
        state_code = "auto"

    try:
        results = _analyze_pdf(data, state_code, filename)
    except InvalidPdf as exc:
        return jsonify({"error": str(exc)}), 400
    except PdfUnavailable as exc:
        return jsonify({"error": str(exc), "code": "pdf_unavailable"}), 503
    except OCRUnavailable as exc:
        return jsonify({"error": str(exc), "code": "ocr_unavailable"}), 503
    except Exception:
        app.logger.exception("PDF analysis failed")
        return jsonify({"error": "PDF analysis failed. Try a cleaner scanned PDF."}), 500

    return jsonify(results[0])


@app.post("/api/export/pdf")
def export_pdf_report():
    """Export the already-analysed page images back into a single flattened PDF."""
    images = request.files.getlist("page")
    if not images:
        return jsonify({"error": "No page images were supplied for export."}), 400
    try:
        import cv2
        import numpy as np
        decoded = []
        for upload in images:
            arr = np.frombuffer(upload.read(), np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if image is not None:
                decoded.append(image)
        if not decoded:
            return jsonify({"error": "None of the pages could be read."}), 400
        pdf_bytes = export_pdf(decoded)
    except Exception as exc:
        app.logger.exception("PDF export failed")
        return jsonify({"error": "PDF export failed. Check img2pdf/reportlab installation."}), 500

    response = app.response_class(pdf_bytes, mimetype="application/pdf")
    response.headers["Content-Disposition"] = 'attachment; filename="certificate-scan.pdf"'
    response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify({"error": "File is too large. Maximum upload size is 25 MB."}), 413


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
