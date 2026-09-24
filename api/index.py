"""Vercel serverless function - Certificate checker Flask app + fallback."""
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from flask import Flask, jsonify, render_template_string, request
from werkzeug.exceptions import RequestEntityTooLarge

BASE_DIR = Path(__file__).resolve().parent.parent

# Load templates with fallback for Vercel
try:
    with open(BASE_DIR / "templates" / "index.html") as f:
        INDEX_HTML = f.read()
except FileNotFoundError:
    INDEX_HTML = "<html><body><h1>Certificate Checker</h1><p>Template not found - deployment issue</p></body></html>"

try:
    with open(BASE_DIR / "static" / "styles.css") as f:
        STYLES_CSS = f.read()
except FileNotFoundError:
    STYLES_CSS = "body{font-family:sans-serif}"

try:
    with open(BASE_DIR / "static" / "app.js") as f:
        APP_JS = f.read()
except FileNotFoundError:
    APP_JS = "console.log('app.js missing')"

# Lazy import certificate_checker modules to keep health endpoint working even if deps missing
STATE_CONFIG = {"auto": {"name": "Auto-detect / other state"}, "delhi": {"name": "Delhi"}}
_certificate_modules_loaded = False
_import_error = None

def _load_certificate_modules():
    global STATE_CONFIG, _certificate_modules_loaded, _import_error
    global extract_fields, prepare_image, InvalidImage, read_text, OCRUnavailable, ocr_status, screen_certificate
    global render_pages, process_page, export_pdf, is_pdf_filename, InvalidPdf, PdfUnavailable
    global merge_screenings, build_ocr_variants
    if _certificate_modules_loaded:
        return True
    try:
        from certificate_checker.config import STATE_CONFIG as SC
        from certificate_checker.field_extractor import extract_fields as ef
        from certificate_checker.image_pipeline import InvalidImage as II, prepare_image as pi, build_ocr_variants as bov
        from certificate_checker.ocr_engine import OCRUnavailable as OU, read_text as rt, status as os_status
        from certificate_checker.pdf_pipeline import (
            InvalidPdf as IP, PdfUnavailable as PU, export_pdf as ep,
            is_pdf_filename as ipf, process_page as pp, render_pages as rp,
        )
        from certificate_checker.verifier import merge_screenings as ms, screen_certificate as sc
        
        STATE_CONFIG = SC
        extract_fields = ef
        prepare_image = pi
        build_ocr_variants = bov
        InvalidImage = II
        read_text = rt
        OCRUnavailable = OU
        ocr_status = os_status
        screen_certificate = sc
        merge_screenings = ms
        render_pages = rp
        process_page = pp
        export_pdf = ep
        is_pdf_filename = ipf
        InvalidPdf = IP
        PdfUnavailable = PU
        _certificate_modules_loaded = True
        return True
    except Exception as e:
        _import_error = str(e)
        print(f"Certificate checker modules failed to load: {e}")
        # Fallback stubs
        class InvalidImage(ValueError):
            pass
        class OCRUnavailable(RuntimeError):
            pass
        class InvalidPdf(ValueError):
            pass
        class PdfUnavailable(RuntimeError):
            pass
        def ocr_status():
            return {"available": False, "languages": [], "message": f"Modules not loaded: {_import_error}"}
        def extract_fields(text):
            return {}
        def prepare_image(data):
            raise InvalidImage("Image processing not available in this deployment")
        def read_text(variants):
            raise OCRUnavailable("OCR not available")
        def screen_certificate(**kwargs):
            return {"status": "unavailable", "message": "Verification not available"}
        def merge_screenings(per_page):
            return {"status": "unavailable", "title": "Unavailable", "summary": "Verification not available",
                    "authenticity_verified": False, "document_completeness_percent": 0, "checks": [], "qr": []}
        def render_pages(data, **kwargs):
            raise PdfUnavailable("PDF support not available in this deployment")
        def process_page(page_image):
            from types import SimpleNamespace
            return page_image, SimpleNamespace(to_dict=lambda: {"width": 0, "height": 0, "blur_variance": 0, "brightness": 0, "glare_percent": 0, "dark_percent": 0, "document_detected": False})
        def export_pdf(images):
            raise PdfUnavailable("PDF export not available in this deployment")
        def is_pdf_filename(filename):
            return bool(filename) and filename.lower().endswith(".pdf")
        def build_ocr_variants(document):
            import numpy as np
            return [document]
        
        # Assign fallbacks to globals
        for name, obj in [("InvalidImage", InvalidImage), ("OCRUnavailable", OCRUnavailable),
                          ("InvalidPdf", InvalidPdf), ("PdfUnavailable", PdfUnavailable),
                          ("ocr_status", ocr_status), ("extract_fields", extract_fields),
                          ("prepare_image", prepare_image), ("read_text", read_text),
                          ("screen_certificate", screen_certificate), ("merge_screenings", merge_screenings),
                          ("render_pages", render_pages), ("process_page", process_page),
                          ("export_pdf", export_pdf), ("is_pdf_filename", is_pdf_filename),
                          ("build_ocr_variants", build_ocr_variants)]:
            globals()[name] = obj
        return False

# Try loading at startup
_load_certificate_modules()

app = Flask(__name__)
app.config.update(
    MAX_CONTENT_LENGTH=12 * 1024 * 1024,
    JSON_SORT_KEYS=False,
)

@app.after_request
def set_privacy_headers(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=()"
    # Allow embedding in Vercel previews
    if os.getenv("VERCEL"):
        response.headers["X-Frame-Options"] = "ALLOWALL"
        csp = (
            "default-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' blob:; "
            "script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; "
            "connect-src 'self' https:; base-uri 'self'; form-action 'self'"
        )
    else:
        csp = (
            "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; "
            "script-src 'self'; style-src 'self'; connect-src 'self'; "
            "base-uri 'self'; form-action 'self'"
        )
    response.headers["Content-Security-Policy"] = csp
    return response

@app.get("/")
def index():
    # If this is the main certificate checker route
    try:
        states = [{"code": code, "name": config["name"]} for code, config in STATE_CONFIG.items()]
        return render_template_string(INDEX_HTML, states=states)
    except Exception as e:
        return jsonify({"error": f"Failed to render: {e}", "service": "certificate-checker"}), 500

@app.get("/cert")
def cert_index():
    return index()

@app.get("/certificate")
def cert_alias():
    return index()

@app.get("/verify")
def verify_alias():
    return index()

@app.get("/static/styles.css")
def styles():
    return STYLES_CSS, 200, {"Content-Type": "text/css; charset=utf-8"}

@app.get("/static/app.js")
def app_js():
    return APP_JS, 200, {"Content-Type": "application/javascript; charset=utf-8"}

@app.get("/api/health")
def health():
    # Ensure modules loaded
    _load_certificate_modules()
    try:
        ocr = ocr_status()
    except Exception as e:
        ocr = {"available": False, "message": str(e)}
    
    return jsonify({
        "ok": True,
        "service": "SC/ST certificate screening assistant",
        "ocr": ocr,
        "privacy": "Images are processed in memory and are not saved by this application.",
        "deployment": "vercel" if os.getenv("VERCEL") else "local",
        "modules_loaded": _certificate_modules_loaded,
        "import_error": _import_error if not _certificate_modules_loaded else None
    })

@app.get("/api/cert/health")
def cert_health():
    return health()

@app.post("/api/analyze")
def analyze():
    _load_certificate_modules()
    
    upload = request.files.get("file") or request.files.get("image")
    if upload is None:
        return jsonify({"error": "Choose or capture an image or PDF first."}), 400
    image_bytes = upload.read()
    if not image_bytes:
        return jsonify({"error": "The uploaded file is empty."}), 400
    filename = (upload.filename or "").strip() or None

    state_code = request.form.get("state", "auto").strip().lower()
    if state_code not in STATE_CONFIG:
        state_code = "auto"

    # PDF path
    if is_pdf_filename(filename):
        try:
            import base64
            import cv2
            import numpy as np
            pages = render_pages(image_bytes, max_pages=20)
            per_page = []
            page_images = []
            for page in pages:
                document, quality = process_page(page["image"])
                ocr = read_text(build_ocr_variants(document))
                ok, encoded = cv2.imencode(".jpg", document, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                jpg = encoded.tobytes() if ok else None
                quality_dict = quality.to_dict()
                verification = screen_certificate(
                    fields=extract_fields(ocr.text),
                    raw_text=ocr.text,
                    ocr_confidence=ocr.confidence,
                    word_count=ocr.word_count,
                    quality=quality_dict,
                    qr_values=[],
                    state_code=state_code,
                    image_bytes=jpg,
                    source_type="pdf",
                    page=page["index"] + 1,
                    page_label=page["label"],
                )
                per_page.append({
                    "page": page["index"] + 1,
                    "page_label": page["label"],
                    "fields": extract_fields(ocr.text),
                    "ocr": ocr.to_dict(),
                    "quality": quality_dict,
                    "verification": verification,
                })
                page_images.append(document)
        except PdfUnavailable as exc:
            return jsonify({"error": str(exc), "code": "pdf_unavailable"}), 503
        except InvalidPdf as exc:
            return jsonify({"error": str(exc)}), 400
        except OCRUnavailable as exc:
            return jsonify({"error": str(exc), "code": "ocr_unavailable"}), 503
        except Exception:
            app.logger.exception("PDF analysis failed")
            return jsonify({"error": "PDF analysis failed. Try a cleaner scanned PDF."}), 500

        verification = merge_screenings([p["verification"] for p in per_page])
        merged_fields = {}
        for p in per_page:
            for key, field in p["fields"].items():
                if field.get("value") and key not in merged_fields:
                    merged_fields[key] = field
        for p in per_page:
            for key, field in p["fields"].items():
                merged_fields.setdefault(key, field)
        pdf_report = None
        try:
            pdf_report = {
                "mime": "application/pdf",
                "data": base64.b64encode(export_pdf(page_images)).decode("ascii"),
            }
        except Exception:
            pdf_report = None
        return jsonify({
            "fields": merged_fields,
            "ocr": per_page[0]["ocr"] if per_page else {},
            "quality": per_page[0]["quality"] if per_page else {},
            "pages": per_page,
            "verification": verification,
            "document_detected": bool(per_page),
            "processing": {"stored": False, "method": "Local OpenCV + local OCR + PDF rendering"},
            "pdf_export": pdf_report,
        })

    # Image path
    try:
        prepared = prepare_image(image_bytes)
    except InvalidImage as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Image preparation failed")
        return jsonify({"error": f"Image processing failed: {str(exc)[:200]}. Try a clearer JPG or PNG image."}), 500

    try:
        ocr = read_text(prepared.ocr_variants)
    except OCRUnavailable as exc:
        return jsonify({
            "error": "OCR engine not available on this platform.",
            "code": "ocr_unavailable",
            "help": "This deployment lacks an OCR engine. For full functionality: 1) Use Docker/Railway/Render with rapidocr-onnxruntime or Tesseract, or 2) Integrate a cloud OCR API (Google Vision/AWS Textract). Health endpoint shows OCR status.",
            "details": str(exc)[:300]
        }), 503
    except Exception as exc:
        app.logger.exception("OCR failed")
        return jsonify({"error": "Text extraction failed. Try a clearer image."}), 500

    try:
        fields = extract_fields(ocr.text)
        quality = prepared.quality.to_dict()
        verification = screen_certificate(
            fields=fields,
            raw_text=ocr.text,
            ocr_confidence=ocr.confidence,
            word_count=ocr.word_count,
            quality=quality,
            qr_values=prepared.qr_values,
            state_code=state_code,
            image_bytes=image_bytes,
            source_type="image",
        )
    except Exception as exc:
        app.logger.exception("Certificate verification failed")
        return jsonify({"error": "Analysis failed. Try a clearer JPG or PNG image."}), 500

    return jsonify({
        "fields": fields,
        "ocr": ocr.to_dict(),
        "quality": quality,
        "document_detected": quality["document_detected"],
        "verification": verification,
        "processing": {
            "stored": False,
            "method": "Local OpenCV preprocessing + local OCR" if _certificate_modules_loaded else "Fallback - modules not loaded",
        },
    })

@app.get("/api")
def api_root():
    return jsonify({
        "message": "Certificate Checker API",
        "endpoints": {
            "health": "/api/health",
            "analyze": "POST /api/analyze",
            "tribal_api": "/api/v1/health (Tribal Scholar)",
            "docs": "/api/docs (Tribal Scholar)"
        }
    })

@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify({"error": "Image is too large. Maximum upload size is 12 MB."}), 413

# For Vercel, expose app
# Vercel Python runtime looks for `app` variable

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
