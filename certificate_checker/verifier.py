"""Evidence-based screening and safe routing to official verification.

A photograph or scan can establish readability, internal consistency, and some
forensic anomalies. It can never establish that the issuing authority actually
created the record. Accordingly this module never returns a binary "genuine"
result.

Status vocabulary
-----------------
* ``recapture_needed``          — image is not readable enough to screen.
* ``not_a_certificate``         — the content does not look like an SC/ST
  certificate at all (a normal photo, form, or hand-written note).
* ``manual_review``             — readable, but internal checks need a human.
* ``potential_tampering``       — forensic signs (ELA hotspots, inconsistent
  noise, editor metadata) suggest the image may have been altered. Advisory:
  always confirm with the issuer.
* ``ready_for_official_verification`` — readable and internally consistent;
  authenticity is still NOT established.
"""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta
import math
import re
from typing import Any
from urllib.parse import urlparse

from .config import get_state_config, is_allowed_official_url, looks_like_government_url

TERMS = {
    "recapture_needed": ("Recapture needed", "reliability"),
    "not_a_certificate": ("Not a caste certificate", "reliability"),
    "manual_review": ("Manual review required", "attention"),
    "potential_tampering": ("Possible tampering — verify", "attention"),
    "ready_for_official_verification": ("Ready for official verification", "clean"),
}


def _check(check_id: str, label: str, status: str, detail: str) -> dict:
    return {"id": check_id, "label": label, "status": status, "detail": detail}


def _value(fields: dict, key: str) -> str:
    item = fields.get(key) or {}
    return str(item.get("value") or "").strip()


def _parse_indian_date(value: str) -> date | None:
    cleaned = re.sub(r"\s+", " ", value.strip())
    formats = (
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
        "%d %B %Y", "%d %b %Y",
    )
    for date_format in formats:
        try:
            return datetime.strptime(cleaned, date_format).date()
        except ValueError:
            continue
    return None


def _normalise_identifier(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def _analyse_qr(qr_values: list[str], state_code: str, certificate_number: str) -> tuple[list[dict], list[dict]]:
    checks: list[dict] = []
    details: list[dict] = []
    cert_key = _normalise_identifier(certificate_number)

    if not qr_values:
        checks.append(_check(
            "qr_presence", "QR code", "info",
            "No readable QR code was found. Older certificates may not contain one.",
        ))
        return checks, details

    any_official = False
    for raw in qr_values:
        parsed = urlparse(raw)
        is_url = parsed.scheme.lower() in {"http", "https"} and bool(parsed.netloc)
        official = is_url and is_allowed_official_url(raw, state_code)
        government_hint = is_url and looks_like_government_url(raw)
        contains_number = bool(cert_key and cert_key in _normalise_identifier(raw))
        if official:
            note = "Configured issuer-domain link found; open it and compare the returned record."
            any_official = True
        elif government_hint:
            note = "Government-domain-looking link found, but it is not configured for the selected state."
        elif is_url:
            note = "External link found. Do not treat it as issuer evidence."
        else:
            note = "Non-URL QR payload found; a state-specific signature decoder would be needed."
        details.append({
            "value": raw,
            "is_url": is_url,
            "official_url": official,
            "government_domain_hint": government_hint,
            "contains_certificate_number": contains_number,
            "note": note,
        })

    if any_official:
        checks.append(_check(
            "qr_presence", "QR code", "pass",
            "A QR link uses a configured issuer domain. This is evidence only, not proof until the record is compared.",
        ))
    else:
        checks.append(_check(
            "qr_presence", "QR code", "warn",
            "QR data was found, but no link matches a configured issuer domain for this state.",
        ))
    return checks, details


# --------------------------------------------------------------------------- #
# Forensic anomaly checks (advisory) — do not decide authenticity on their own
# --------------------------------------------------------------------------- #
def _decode_for_forensics(image_bytes: bytes | None):
    """Return a BGR numpy array for forensic analysis, or None."""
    if not image_bytes:
        return None
    try:
        import cv2
        import numpy as np
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return image
    except Exception:
        return None


def _forensic_checks(image_bytes: bytes | None) -> tuple[list[dict], list[str]]:
    """Run light, local-only forensic signals. Returns (checks, evidence)."""
    try:
        import cv2
        import numpy as np
    except Exception:
        return [], []

    checks: list[dict] = []
    evidence: list[str] = []
    image = _decode_for_forensics(image_bytes)
    if image is None:
        checks.append(_check("forensics", "Forensic scan", "info",
                             "Forensic analysis skipped (no standalone image bytes)."))
        return checks, evidence

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    factors: list[str] = []

    # 1) Compression / ELA: differences highlight pasted regions.
    try:
        ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if ok:
            recompressed = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
            diff = cv2.absdiff(image, recompressed)
            diff_gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
            mean_diff = float(np.mean(diff_gray))
            std_diff = float(np.std(diff_gray))
            _, thresh = cv2.threshold(diff_gray, 30, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            hotspots = sum(1 for contour in contours if cv2.contourArea(contour) > 1500)
            if hotspots >= 3:
                checks.append(_check("ela", "Compression / ELA", "warn",
                                     f"{hotspots} large difference hotspots — possible edited or pasted region."))
                evidence.append("ELA hotspots suggesting an edited region")
                factors.append(f"{hotspots} ELA hotspots")
            else:
                checks.append(_check("ela", "Compression / ELA", "pass",
                                     f"No large difference hotspots (mean {mean_diff:.1f})."))
    except Exception:
        checks.append(_check("ela", "Compression / ELA", "info", "ELA skipped."))

    # 2) Noise consistency: pasted regions often carry different sensor noise.
    try:
        denoised = cv2.medianBlur(gray, 3)
        noise = cv2.absdiff(gray, denoised)
        halves = [noise[0:height // 2], noise[height // 2:]]
        stds = [float(np.std(part)) for part in halves if part.size]
        if len(stds) == 2 and min(stds) > 0:
            ratio = max(stds) / max(min(stds), 1e-6)
            if ratio > 3.0:
                checks.append(_check("noise", "Noise consistency", "warn",
                                     f"Upper and lower halves have very different noise ({ratio:.1f}×)."))
                evidence.append("Inconsistent image noise between regions")
                factors.append("noise inconsistency")
            else:
                checks.append(_check("noise", "Noise consistency", "pass",
                                     f"Image noise is consistent ({ratio:.2f}×)."))
    except Exception:
        checks.append(_check("noise", "Noise consistency", "info", "Noise check skipped."))

    # 3) Metadata: editor software is a signal, not proof.
    try:
        from PIL import Image
        from io import BytesIO
        with Image.open(BytesIO(image_bytes)) as opened:
            for tag, value in (opened.getexif() or {}).items():
                label = str(tag)
                text = str(value)
                if any(word in text.lower() for word in ("photoshop", "adobe", "gimp", "canva")):
                    checks.append(_check("metadata", "Software metadata", "warn",
                                         f"Edited by: {text[:60]}."))
                    evidence.append("Image saved through editing software")
                    factors.append(f"editor metadata: {text[:40]}")
                    break
            else:
                checks.append(_check("metadata", "Software metadata", "pass",
                                     "No editing-software fingerprint found."))
    except Exception:
        checks.append(_check("metadata", "Software metadata", "info", "Metadata check skipped."))

    if evidence:
        checks.append(_check("forensics", "Forensic summary", "warn",
                             "Forensic signals are advisory only and can also come from "
                             "scanners, photocopies, or legitimate retsouching. Confirm with the issuer."))
    else:
        checks.append(_check("forensics", "Forensic summary", "pass",
                             "No obvious forensic anomalies in compression, noise, or metadata."))

    return checks, list(dict.fromkeys(evidence))


# --------------------------------------------------------------------------- #
# Multi-page aggregation
# --------------------------------------------------------------------------- #
def merge_screenings(per_page: list[dict]) -> dict:
    """Combine per-page screening results into one document-level verdict.

    Ranked by severity so the most serious page decides the headline status,
    while the details list preserves every page. Bare/annexure pages never
    outrank a readable certificate page.
    """
    order = {
        "recapture_needed": 0,
        "not_a_certificate": 1,
        "potential_tampering": 2,
        "manual_review": 3,
        "ready_for_official_verification": 4,
    }
    # A page with essentially no text cannot fail "recapture"; it is just sparse.
    substantive = [
        p for p in per_page
        if p.get("word_count", 0) > 10
    ]
    pool = substantive or per_page
    if not pool:
        return {
            "status": "recapture_needed",
            "title": "Recapture needed",
            "summary": "No readable pages were produced.",
            "authenticity_verified": False,
            "details": [],
            "pages": [],
        }

    ranked = sorted(
        pool,
        key=lambda p: (order.get(p["status"], 4), -(p.get("word_count", 0))),
    )
    headline = ranked[0]

    all_checks: list[dict] = []
    all_fields: list[dict] = []
    for page in per_page:
        for check in page.get("checks", []):
            all_checks.append({
                "id": check["id"],
                "label": check["label"],
                "status": check["status"],
                "detail": check["detail"],
                "page": page.get("page", None),
            })
        all_fields.append({
            "page": page.get("page", None),
            "label": page.get("page_label", None),
            "fields": page.get("fields", {}),
        })

    page_count = len(per_page)
    return {
        "status": headline["status"],
        "title": TERMS.get(headline["status"], TERMS["manual_review"])[0],
        "summary": f"{headline['summary']} (reviewed across {page_count} page(s).)",
        "authenticity_verified": False,
        "document_completeness_percent": headline.get("document_completeness_percent", 0),
        "checks": all_checks,
        "qr": headline.get("qr", []),
        "fields_by_page": all_fields,
        "pages": [
            {
                "page": p.get("page"),
                "label": p.get("page_label"),
                "status": p.get("status"),
                "fields_found": p.get("document_completeness_percent", 0),
            }
            for p in per_page
        ],
        "official_verification": headline.get("official_verification"),
        "decision_notice": headline.get("decision_notice"),
    }


# --------------------------------------------------------------------------- #
# Main screening
# --------------------------------------------------------------------------- #
def screen_certificate(
    *,
    fields: dict,
    raw_text: str,
    ocr_confidence: float,
    word_count: int,
    quality: dict,
    qr_values: list[str],
    state_code: str,
    image_bytes: bytes | None = None,
    filename: str | None = None,
    source_type: str = "image",
    page: int | None = None,
    page_label: str | None = None,
) -> dict:
    """Return capture/readability checks and an official-verification next step."""
    checks: list[dict] = []
    recapture_reasons: list[str] = []
    concern_reasons: list[str] = []
    tamper_evidence: list[str] = []

    width = int(quality.get("width", 0))
    height = int(quality.get("height", 0))
    short_edge = min(width, height)
    if short_edge >= 900:
        checks.append(_check("resolution", "Image resolution", "pass", f"{width} × {height} pixels."))
    elif short_edge >= 650:
        checks.append(_check("resolution", "Image resolution", "warn", f"{width} × {height}; a closer photo may improve OCR."))
    else:
        checks.append(_check("resolution", "Image resolution", "fail", f"{width} × {height}; photograph the whole page more closely."))
        recapture_reasons.append("low resolution")

    blur = float(quality.get("blur_variance", 0))
    if blur >= 90:
        checks.append(_check("sharpness", "Sharpness", "pass", f"Focus measure {blur:.0f}."))
    elif blur >= 45:
        checks.append(_check("sharpness", "Sharpness", "warn", f"Focus measure {blur:.0f}; hold the camera steadier."))
    else:
        checks.append(_check("sharpness", "Sharpness", "fail", f"Focus measure {blur:.0f}; text is likely blurred."))
        recapture_reasons.append("blur")

    glare = float(quality.get("glare_percent", 0))
    if glare <= 18:
        checks.append(_check("glare", "Highlight clipping", "pass", f"Clipped-white area {glare:.1f}%."))
    elif ocr_confidence >= 65 and word_count >= 25:
        checks.append(_check("glare", "Highlight clipping", "info", f"Clipped-white area {glare:.1f}%; text remained readable. Visually inspect seals and faint text."))
    else:
        checks.append(_check("glare", "Highlight clipping", "warn", f"Clipped-white area {glare:.1f}%; avoid direct flash and inspect missing details."))

    if source_type == "pdf":
        checks.append(_check("pdf", "File format", "info",
                             "This is a scanned PDF document. Each page was rendered and screened separately."))

    if ocr_confidence >= 62 and word_count >= 25:
        checks.append(_check("ocr", "Text readability", "pass", f"OCR confidence {ocr_confidence:.0f}% across {word_count} words."))
    elif ocr_confidence >= 40 and word_count >= 12:
        checks.append(_check("ocr", "Text readability", "warn", f"OCR confidence {ocr_confidence:.0f}% across {word_count} words; confirm every field."))
    elif ocr_confidence >= 60:
        # Very little text, but what was found was read confidently — a sparse
        # page or annexure, not necessarily a bad capture.
        checks.append(_check("ocr", "Text readability", "info", f"Only {word_count} words at {ocr_confidence:.0f}% confidence; this page is mostly blank or graphical."))
    else:
        checks.append(_check("ocr", "Text readability", "fail", f"Only {word_count} words were read at {ocr_confidence:.0f}% confidence."))
        recapture_reasons.append("unreadable text")

    # Demo/specimen wording.
    demo_mark = re.search(
        r"\b(?:synthetic\s+demo|not\s+a\s+real\s+certificate|specimen|sample\s+(?:only|certificate)|demo\s+only|for\s+testing\s+only)\b",
        raw_text,
        flags=re.IGNORECASE,
    )
    if demo_mark:
        checks.append(_check("specimen", "Specimen / demo wording", "fail", f"Detected explicit non-production wording: {demo_mark.group(0)}."))
        concern_reasons.append("specimen or demo wording")

    # Does this look like an SC/ST certificate at all?
    certificate_marker = re.search(
        r"\b(?:scheduled\s+(?:caste|tribe)|caste\s+certificate|tribe\s+certificate|"
        r"अनुसूचित\s*(?:जाति|जनजाति)|जाति\s*प्रमाण\s*पत्र)\b",
        raw_text,
        flags=re.IGNORECASE,
    )
    if not certificate_marker and word_count > 10:
        checks.append(_check("document_type", "Document type", "fail",
                             "No Scheduled Caste / Scheduled Tribe certificate wording was recognised. "
                             "This may be a different document (photo, form, notes) — confirm you uploaded the right file."))
        concern_reasons.append("does not appear to be an SC/ST certificate")

    category = _value(fields, "category")
    if category in {"SC", "ST"}:
        checks.append(_check("category", "SC/ST wording", "pass", f"The text indicates category {category}."))
    elif category:
        checks.append(_check("category", "SC/ST wording", "warn", f"Category is ambiguous: {category}."))
        concern_reasons.append("ambiguous category wording")
    else:
        checks.append(_check("category", "SC/ST wording", "warn", "No clear Scheduled Caste or Scheduled Tribe wording was extracted."))
        concern_reasons.append("missing SC/ST wording")

    certificate_number = _value(fields, "certificate_number")
    if certificate_number:
        checks.append(_check("certificate_number", "Certificate number", "pass", f"Extracted: {certificate_number}"))
    else:
        checks.append(_check("certificate_number", "Certificate number", "warn", "No certificate number was reliably extracted."))

    authority = _value(fields, "issuing_authority")
    if authority:
        checks.append(_check("authority", "Issuing authority", "pass", f"Extracted: {authority}"))
    else:
        checks.append(_check("authority", "Issuing authority", "warn", "No issuing-authority line was reliably extracted."))

    issue_date = _value(fields, "issue_date")
    parsed_date = _parse_indian_date(issue_date) if issue_date else None
    if issue_date and parsed_date:
        if parsed_date > date.today() + timedelta(days=1):
            checks.append(_check("issue_date", "Issue date", "fail", f"Extracted future date: {issue_date}."))
            concern_reasons.append("future issue date")
        else:
            checks.append(_check("issue_date", "Issue date", "pass", f"Extracted: {issue_date}."))
    elif issue_date:
        checks.append(_check("issue_date", "Issue date", "warn", f"Could not interpret extracted date: {issue_date}."))
    else:
        checks.append(_check("issue_date", "Issue date", "warn", "No issue date was reliably extracted."))

    qr_checks, qr_details = _analyse_qr(qr_values, state_code, certificate_number)
    checks.extend(qr_checks)

    # Forensic checks (advisory). Only when we actually have standalone bytes.
    forensic_checks, tamper_evidence = _forensic_checks(image_bytes)
    checks.extend(forensic_checks)

    core_fields = ("certificate_number", "holder_name", "category", "issue_date", "issuing_authority")
    present_count = sum(bool(_value(fields, key)) for key in core_fields)
    completeness = round(present_count / len(core_fields) * 100)

    # Decision ladder.
    if recapture_reasons:
        status = "recapture_needed"
        summary = "The image is not reliable enough for document screening. Retake it before any review."
    elif not certificate_marker and word_count > 10:
        status = "not_a_certificate"
        summary = "The content does not look like an SC/ST certificate. Check the file, then retry with a clear, full-page certificate."
    elif tamper_evidence:
        status = "potential_tampering"
        summary = "Forensic signals suggest this image may have been altered. This is advisory, not proof — always confirm the record with the issuing authority."
    elif concern_reasons:
        status = "manual_review"
        summary = "One or more internal checks need attention. Confirm the record with the issuing authority."
    else:
        status = "ready_for_official_verification"
        summary = "The document is readable and key fields were extracted. Authenticity is still not established."

    title = TERMS.get(status, TERMS["manual_review"])[0]

    config = get_state_config(state_code)
    prefix = f"Page {page_label or page}: " if page is not None else ""
    return {
        "status": status,
        "title": title,
        "summary": prefix + summary,
        "authenticity_verified": False,
        "authentic": False,  # never established from an image
        "word_count": word_count,
        "ocr_confidence": round(float(ocr_confidence), 1),
        "document_completeness_percent": completeness,
        "checks": checks,
        "qr": qr_details,
        "forensic_evidence": tamper_evidence,
        "official_verification": {
            "portal_name": config["portal_label"],
            "portal_url": config["portal"],
            "instruction": "Use the certificate number and QR/portal result to compare the holder name, category, issue date, district, and issuing authority.",
        },
        "decision_notice": "Do not use this screening result alone to approve, reject, rank, or deny a person. Only the issuing authority or a verifiable signed record can establish authenticity.",
        "page": page,
        "page_label": page_label,
    }
