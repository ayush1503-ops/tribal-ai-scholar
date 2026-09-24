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
    if _certificate_modules_loaded:
        return True
    try:
        from certificate_checker.config import STATE_CONFIG as SC
        from certificate_checker.field_extractor import extract_fields as ef
        from certificate_checker.image_pipeline import InvalidImage as II, prepare_image as pi
        from certificate_checker.ocr_engine import OCRUnavailable as OU, read_text as rt, status as os_status
        from certificate_checker.verifier import screen_certificate as sc
        
        STATE_CONFIG = SC
        extract_fields = ef
        prepare_image = pi
        InvalidImage = II
        read_text = rt
        OCRUnavailable = OU
        ocr_status = os_status
        screen_certificate = sc
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
        
        # Assign fallbacks to globals
        globals()["InvalidImage"] = InvalidImage
        globals()["OCRUnavailable"] = OCRUnavailable
        globals()["ocr_status"] = ocr_status
        globals()["extract_fields"] = extract_fields
        globals()["prepare_image"] = prepare_image
        globals()["read_text"] = read_text
        globals()["screen_certificate"] = screen_certificate
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
    
    upload = request.files.get("image")
    if upload is None:
        return jsonify({"error": "Choose or capture an image first."}), 400
    image_bytes = upload.read()
    if not image_bytes:
        return jsonify({"error": "The uploaded image is empty."}), 400

    state_code = request.form.get("state", "auto").strip().lower()
    if state_code not in STATE_CONFIG:
        state_code = "auto"

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
            "help": "This deployment lacks Tesseract OCR binary. Vercel's Python runtime doesn't include tesseract. For full functionality: 1) Use Docker deployment, or 2) Integrate cloud OCR API (Google Vision/AWS Textract), or 3) Deploy to Railway/Render/Fly.io which support system packages. Health endpoint shows OCR status.",
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
            "method": "Local OpenCV preprocessing and local Tesseract OCR" if _certificate_modules_loaded else "Fallback - modules not loaded",
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
