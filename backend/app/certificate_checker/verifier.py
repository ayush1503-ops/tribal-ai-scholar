"""Evidence-based screening and safe routing to official verification.

A photograph can establish readability and internal consistency, not whether the
issuing authority actually created the record. Accordingly this module never
returns a binary "genuine" result.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
import re
from urllib.parse import urlparse

from .config import get_state_config, is_allowed_official_url, looks_like_government_url


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
            "qr_presence",
            "QR code",
            "info",
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
            "qr_presence",
            "QR code",
            "pass",
            "A QR link uses a configured issuer domain. This is evidence only, not proof until the record is compared.",
        ))
    else:
        checks.append(_check(
            "qr_presence",
            "QR code",
            "warn",
            "QR data was found, but no link matches a configured issuer domain for this state.",
        ))
    return checks, details


def screen_certificate(
    *,
    fields: dict,
    raw_text: str,
    ocr_confidence: float,
    word_count: int,
    quality: dict,
    qr_values: list[str],
    state_code: str,
) -> dict:
    """Return capture/readability checks and an official-verification next step."""
    checks: list[dict] = []
    recapture_reasons: list[str] = []
    concern_reasons: list[str] = []

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

    if ocr_confidence >= 65 and word_count >= 25:
        checks.append(_check("ocr", "Text readability", "pass", f"OCR confidence {ocr_confidence:.0f}% across {word_count} words."))
    elif ocr_confidence >= 40 and word_count >= 12:
        checks.append(_check("ocr", "Text readability", "warn", f"OCR confidence {ocr_confidence:.0f}% across {word_count} words; confirm every field."))
    else:
        checks.append(_check("ocr", "Text readability", "fail", f"Only {word_count} words were read at {ocr_confidence:.0f}% confidence."))
        recapture_reasons.append("unreadable text")

    demo_mark = re.search(
        r"\b(?:synthetic\s+demo|not\s+a\s+real\s+certificate|specimen|sample\s+(?:only|certificate)|demo\s+only)\b",
        raw_text,
        flags=re.IGNORECASE,
    )
    if demo_mark:
        checks.append(_check("specimen", "Specimen / demo wording", "fail", f"Detected explicit non-production wording: {demo_mark.group(0)}."))
        concern_reasons.append("specimen or demo wording")

    category = _value(fields, "category")
    if category in {"SC", "ST"}:
        checks.append(_check("category", "SC/ST wording", "pass", f"The text indicates category {category}."))
    elif category:
        checks.append(_check("category", "SC/ST wording", "warn", f"Category is ambiguous: {category}."))
        concern_reasons.append("ambiguous category wording")
    else:
        checks.append(_check("category", "SC/ST wording", "fail", "No clear Scheduled Caste or Scheduled Tribe wording was extracted."))
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

    core_fields = ("certificate_number", "holder_name", "category", "issue_date", "issuing_authority")
    present_count = sum(bool(_value(fields, key)) for key in core_fields)
    completeness = round(present_count / len(core_fields) * 100)

    if recapture_reasons:
        status = "recapture_needed"
        title = "Recapture needed"
        summary = "The image is not reliable enough for document screening. Retake it before any review."
    elif concern_reasons:
        status = "manual_review"
        title = "Manual review required"
        summary = "One or more internal checks need attention. Confirm the record with the issuing authority."
    else:
        status = "ready_for_official_verification"
        title = "Ready for official verification"
        summary = "The document is readable and key fields were extracted. Authenticity is still not established."

    config = get_state_config(state_code)
    return {
        "status": status,
        "title": title,
        "summary": summary,
        "authenticity_verified": False,
        "document_completeness_percent": completeness,
        "checks": checks,
        "qr": qr_details,
        "official_verification": {
            "portal_name": config["portal_label"],
            "portal_url": config["portal"],
            "instruction": "Use the certificate number and QR/portal result to compare the holder name, category, issue date, district, and issuing authority.",
        },
        "decision_notice": "Do not use this screening result alone to approve, reject, rank, or deny a person. Only the issuing authority or a verifiable signed record can establish authenticity.",
    }
