"""Single Vercel serverless function - serves frontend and API."""
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from flask import Flask, jsonify, render_template_string, request, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge

from certificate_checker.config import STATE_CONFIG
from certificate_checker.field_extractor import extract_fields
from certificate_checker.image_pipeline import InvalidImage, prepare_image
from certificate_checker.ocr_engine import OCRUnavailable, read_text, status as ocr_status
from certificate_checker.verifier import screen_certificate

BASE_DIR = Path(__file__).resolve().parent.parent

with open(BASE_DIR / "templates" / "index.html") as f:
    INDEX_HTML = f.read()

with open(BASE_DIR / "static" / "styles.css") as f:
    STYLES_CSS = f.read()

with open(BASE_DIR / "static" / "app.js") as f:
    APP_JS = f.read()

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
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; "
        "script-src 'self'; style-src 'self'; connect-src 'self'; "
        "base-uri 'self'; form-action 'self'"
    )
    return response


@app.get("/")
def index():
    states = [{"code": code, "name": config["name"]} for code, config in STATE_CONFIG.items()]
    return render_template_string(INDEX_HTML, states=states)


@app.get("/static/styles.css")
def styles():
    return STYLES_CSS, 200, {"Content-Type": "text/css; charset=utf-8"}


@app.get("/static/app.js")
def app_js():
    return APP_JS, 200, {"Content-Type": "application/javascript; charset=utf-8"}


@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "service": "SC/ST certificate screening assistant",
        "ocr": ocr_status(),
        "privacy": "Images are processed in memory and are not saved by this application.",
    })


@app.post("/api/analyze")
def analyze():
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
            state_code=state_code,
        )
    except InvalidImage as exc:
        return jsonify({"error": str(exc)}), 400
    except OCRUnavailable as exc:
        return jsonify({
            "error": str(exc),
            "code": "ocr_unavailable",
            "help": "Install Tesseract and its English language data, then restart the app.",
        }), 503
    except Exception:
        app.logger.exception("Certificate analysis failed")
        return jsonify({"error": "Analysis failed. Try a clearer JPG or PNG image."}), 500

    return jsonify({
        "fields": fields,
        "ocr": ocr.to_dict(),
        "quality": quality,
        "document_detected": quality["document_detected"],
        "verification": verification,
        "processing": {
            "stored": False,
            "method": "Local OpenCV preprocessing and local Tesseract OCR",
        },
    })


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify({"error": "Image is too large. Maximum upload size is 12 MB."}), 413


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)