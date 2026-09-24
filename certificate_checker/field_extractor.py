"""Rule-based extraction of common Indian caste-certificate fields.

Templates vary by State/UT and year. These patterns deliberately return blanks
instead of inventing values when a label is not confidently found.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
import re
import unicodedata


@dataclass(frozen=True)
class ExtractedField:
    label: str
    value: str | None
    confidence: float
    evidence: str | None = None

    def to_dict(self) -> dict:
        data = asdict(self)
        data["confidence"] = round(self.confidence, 2)
        return data


FIELD_LABELS = {
    "certificate_number": "Certificate number",
    "holder_name": "Certificate holder",
    "relation_name": "Parent / spouse name",
    "category": "Category",
    "caste_or_tribe": "Caste / tribe / community",
    "issue_date": "Issue date",
    "district": "District",
    "state": "State / UT",
    "issuing_authority": "Issuing authority",
}


def normalise_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[\t ]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _clean_value(value: str, max_length: int = 100) -> str:
    value = re.sub(r"\s+", " ", value).strip(" :;,.|_-\t\n")
    # OCR sometimes appends an isolated punctuation run.
    value = re.sub(r"\s+[|:;,-]+$", "", value).strip()
    return value[:max_length]


def _match_value(text: str, patterns: list[str], max_length: int = 100) -> tuple[str | None, str | None]:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
        if not match:
            continue
        value = _clean_value(match.group(1), max_length=max_length)
        if value:
            evidence = _clean_value(match.group(0), max_length=180)
            return value, evidence
    return None, None


def _field(label: str, value: str | None, confidence: float, evidence: str | None) -> ExtractedField:
    return ExtractedField(
        label=label,
        value=value,
        confidence=confidence if value else 0.0,
        evidence=evidence if value else None,
    )


def _extract_category(text: str) -> tuple[str | None, str | None, float]:
    sc_patterns = [
        r"\bscheduled\s+caste\b",
        r"\bschedule\s+caste\b",
        r"\bअनुसूचित\s*जाति\b",
        r"\bcategory\s*[:\-]?\s*SC\b",
        r"\bSC\s+certificate\b",
    ]
    st_patterns = [
        r"\bscheduled\s+tribe\b",
        r"\bschedule\s+tribe\b",
        r"\bअनुसूचित\s*जनजाति\b",
        r"\bcategory\s*[:\-]?\s*ST\b",
        r"\bST\s+certificate\b",
    ]
    sc_matches = [re.search(pattern, text, re.IGNORECASE) for pattern in sc_patterns]
    st_matches = [re.search(pattern, text, re.IGNORECASE) for pattern in st_patterns]
    sc = next((match for match in sc_matches if match), None)
    st = next((match for match in st_matches if match), None)
    if sc and st:
        # Some generic headers say SC/ST even though the body gives one category.
        labelled = re.search(r"\bcategory\s*[:\-]\s*(SC|ST)\b", text, re.IGNORECASE)
        if labelled:
            value = labelled.group(1).upper()
            return value, _clean_value(labelled.group(0), 80), 0.88
        return "SC/ST (ambiguous)", f"{sc.group(0)}; {st.group(0)}", 0.45
    if sc:
        return "SC", sc.group(0), 0.88
    if st:
        return "ST", st.group(0), 0.88
    return None, None, 0.0


def extract_fields(raw_text: str) -> dict[str, dict]:
    text = normalise_text(raw_text)

    certificate_number, cert_evidence = _match_value(
        text,
        [
            r"^(?:certificate|cert(?:ificate)?|serial|registration|reference)\s*(?:no|number|#)\.?\s*[:\-]\s*([A-Z0-9][A-Z0-9./()_-]{3,49})\s*$",
            r"^(?:application|acknowledg(?:e)?ment)\s*(?:no|number|id)\.?\s*[:\-]\s*([A-Z0-9][A-Z0-9./()_-]{3,49})\s*$",
            r"^प्रमाण\s*पत्र\s*(?:संख्या|क्रमांक)\s*[:\-]\s*([^\n]{4,50})$",
        ],
        50,
    )

    holder_name, holder_evidence = _match_value(
        text,
        [
            r"^(?:name\s+of\s+(?:the\s+)?(?:applicant|certificate\s*holder|candidate)|applicant(?:'s)?\s+name|candidate(?:'s)?\s+name|name)\s*[:\-]\s*(?:shri|smt|kumari|mr|mrs|ms|miss)?\.?\s*([A-Za-z][A-Za-z .'-]{2,79})\s*$",
            r"^नाम\s*[:\-]\s*([^\n]{2,80})$",
            r"(?:this\s+is\s+to\s+certify\s+that|certified\s+that)\s+(?:shri|smt|kumari|mr|mrs|ms|miss)?\.?\s*([A-Za-z][A-Za-z .'-]{2,79}?)(?=\s+(?:son|daughter|wife|child|s\s*/?\s*o|d\s*/?\s*o|w\s*/?\s*o|belongs|resident)\b|[,\n])",
        ],
        80,
    )

    relation_name, relation_evidence = _match_value(
        text,
        [
            r"^(?:father(?:'s)?|mother(?:'s)?|parent(?:'s)?|husband(?:'s)?|spouse(?:'s)?)\s+name\s*[:\-]\s*(?:shri|smt|mr|mrs)?\.?\s*([A-Za-z][A-Za-z .'-]{2,79})\s*$",
            r"(?:son|daughter|wife|child)\s+of\s+(?:shri|smt|mr|mrs)?\.?\s*([A-Za-z][A-Za-z .'-]{2,79}?)(?=\s+(?:resident|residing|of\s+village|belongs)\b|[,\n])",
            r"\b[SDW]\s*/\s*[Oo]\s*[:\-]?\s*(?:shri|smt|mr|mrs)?\.?\s*([A-Za-z][A-Za-z .'-]{2,79})\s*$",
        ],
        80,
    )

    caste, caste_evidence = _match_value(
        text,
        [
            r"^(?:caste|tribe|community|caste\s*/\s*tribe|name\s+of\s+caste)\s*[:\-]\s*([^\n]{2,80})$",
            r"\bbelongs\s+to\s+(?:the\s+)?[\"']?([A-Za-z][A-Za-z .&'/-]{1,69}?)[\"']?\s+(?:caste|tribe|community)\b",
            r"^जाति\s*[:\-]\s*([^\n]{2,80})$",
        ],
        80,
    )

    issue_date, date_evidence = _match_value(
        text,
        [
            r"^(?:date\s+of\s+issue|issue\s+date|issued\s+on|certificate\s+date|dated)\s*[:\-]\s*([0-3]?\d[./-][01]?\d[./-](?:19|20)?\d{2})\s*$",
            r"^(?:date\s+of\s+issue|issue\s+date|issued\s+on|certificate\s+date|dated)\s*[:\-]\s*((?:0?[1-9]|[12]\d|3[01])\s+[A-Za-z]{3,9}\s+(?:19|20)\d{2})\s*$",
            r"^जारी\s+(?:करने\s+की\s+)?तिथि\s*[:\-]\s*([^\n]{6,30})$",
        ],
        30,
    )

    district, district_evidence = _match_value(
        text,
        [
            r"^(?:district|जिला)\s*[:\-]\s*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F .'-]{1,59})\s*$",
            r"\bDistrict\s+(?:of\s+)?([A-Za-z][A-Za-z .'-]{2,59})(?=[,\n])",
        ],
        60,
    )

    state, state_evidence = _match_value(
        text,
        [
            r"^(?:state|state\s*/\s*ut|union\s+territory|राज्य)\s*[:\-]\s*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F .'-]{1,59})\s*$",
            r"Government\s+of\s+(?:NCT\s+of\s+)?([A-Za-z][A-Za-z .'-]{2,50})(?=[\n,])",
        ],
        60,
    )

    authority, authority_evidence = _match_value(
        text,
        [
            r"^(?:issued\s+by|issuing\s+authority|competent\s+authority|designation)\s*[:\-]\s*([^\n]{3,100})$",
            r"^((?:sub[- ]?divisional\s+magistrate|district\s+magistrate|additional\s+district\s+magistrate|tehsildar|tahsildar|revenue\s+officer|district\s+collector)[^\n]{0,70})$",
            r"^(?:जारीकर्ता|सक्षम\s+अधिकारी)\s*[:\-]\s*([^\n]{3,100})$",
        ],
        100,
    )

    category, category_evidence, category_confidence = _extract_category(text)

    fields = {
        "certificate_number": _field(FIELD_LABELS["certificate_number"], certificate_number, 0.86, cert_evidence),
        "holder_name": _field(FIELD_LABELS["holder_name"], holder_name, 0.80, holder_evidence),
        "relation_name": _field(FIELD_LABELS["relation_name"], relation_name, 0.72, relation_evidence),
        "category": _field(FIELD_LABELS["category"], category, category_confidence, category_evidence),
        "caste_or_tribe": _field(FIELD_LABELS["caste_or_tribe"], caste, 0.72, caste_evidence),
        "issue_date": _field(FIELD_LABELS["issue_date"], issue_date, 0.84, date_evidence),
        "district": _field(FIELD_LABELS["district"], district, 0.72, district_evidence),
        "state": _field(FIELD_LABELS["state"], state, 0.68, state_evidence),
        "issuing_authority": _field(FIELD_LABELS["issuing_authority"], authority, 0.76, authority_evidence),
    }
    return {name: field.to_dict() for name, field in fields.items()}
