"""
Schema + helpers for the SC/ST Government Schemes dataset (India).

Every record is a flat dict so it can be exported to CSV / Excel / JSON / JSONL
without nested parsing, and every field is chatbot-retrievable.
"""

FIELDS = [
    "scheme_id",              # stable ID:  SC-CEN-001, ST-CEN-001, X-CEN-001, ST-STATE-MH-01
    "scheme_name",            # official English name
    "acronym",                # short form used in conversation ("PM-AJAY")
    "aliases",                # other names users may type (semicolon separated)
    "category",               # SC | ST | SC & ST | PVTG
    "level",                  # Central | State
    "state_ut",               # All India, or state/UT name
    "nodal_ministry",         # administrative ministry / department
    "implementing_agency",    # who actually runs it
    "scheme_type",            # Central Sector / Centrally Sponsored / State Sector / Corporation loan / Statutory framework
    "launched_year",          # year first launched / notified
    "active_period",          # FY range the scheme is/was operational (12th Plan etc.)
    "status",                 # Active | Active (subsumed under X) | Merged & renamed | Closed | Under revision
    "predecessor",            # earlier scheme(s) it replaced
    "successor",              # later scheme that replaced it
    "target_groups",          # who the scheme is meant for
    "beneficiary_type",       # Individual / Student / Family / Woman / Entrepreneur / SHG / Institution / Village
    "age_criteria",           # age rules, if any
    "income_limit",           # income ceiling, if any
    "other_eligibility",      # all remaining eligibility conditions
    "exclusions",             # who cannot apply / other conditions to note
    "benefits_summary",       # plain-language benefit description
    "benefit_types",          # Scholarship / Loan / Subsidy / Housing / Coaching / Hostel / Livelihood / Infrastructure / Health / Legal-relief / Marketing / Skill / Land
    "benefit_amount",         # headline money value ("Rs 1,200/month hosteller", "25% up to Rs 25 lakh")
    "funding_pattern",        # Centre:State share
    "interest_rate",          # for credit schemes
    "repayment",              # for credit schemes
    "coverage",               # beneficiaries / slots / villages, as officially reported
    "application_mode",       # Online / Offline / Through bank branch / Through State dept
    "application_portal",     # portal name + URL
    "documents_required",     # papers the applicant must produce
    "helpline",               # official helpline / contact
    "key_features",           # 3-6 distinguishing facts
    "recent_updates",         # latest changes (2023-2026)
    "data_confidence",        # High | Medium  (Medium = verify on portal before quoting)
    "last_verified",          # YYYY-MM-DD
    "source_1", "source_2", "source_3",   # "Name | URL"
]

def S(**kw):
    """Create a normalised scheme record. Missing fields default to 'Not specified'."""
    rec = {f: kw.pop(f, "Not specified") for f in FIELDS}
    if kw:
        raise ValueError(f"Unknown field(s): {list(kw)}")
    # light normalisation
    for k, v in rec.items():
        if isinstance(v, (list, tuple)):
            rec[k] = "; ".join(str(x) for x in v)
        elif v is None:
            rec[k] = "Not specified"
        else:
            rec[k] = str(v).strip()
    if rec["data_confidence"] not in ("High", "Medium", "Low"):
        raise ValueError(f"Bad confidence for {rec['scheme_id']}")
    return rec


def embedding_text(rec):
    """Natural-language paragraph that works well for RAG chunking / embeddings."""
    parts = [
        f"{rec['scheme_name']} (also known as {rec['acronym']}"
        + (f"; other names: {rec['aliases']}" if rec["aliases"] != "Not specified" else "")
        + f") is a {rec['category']} welfare scheme of the Government of India at the {rec['level'].lower()} level.",
        f"State/UT coverage: {rec['state_ut']}.",
        f"Nodal ministry/department: {rec['nodal_ministry']}. Implementing agency: {rec['implementing_agency']}.",
        f"Scheme type: {rec['scheme_type']}. Launched: {rec['launched_year']}. Operational period: {rec['active_period']}. Current status: {rec['status']}.",
    ]
    if rec["predecessor"] != "Not specified":
        parts.append(f"Earlier scheme(s) replaced/merged: {rec['predecessor']}.")
    if rec["successor"] != "Not specified":
        parts.append(f"Now continued/renamed as: {rec['successor']}.")
    parts.append(
        f"Target group: {rec['target_groups']}. Beneficiary type: {rec['beneficiary_type']}."
        + (f" Age criteria: {rec['age_criteria']}." if rec["age_criteria"] != "Not specified" else "")
        + (f" Income limit: {rec['income_limit']}." if rec["income_limit"] != "Not specified" else "")
    )
    parts.append(f"Eligibility: {rec['other_eligibility']}")
    if rec["exclusions"] != "Not specified":
        parts.append(f"Not eligible / conditions: {rec['exclusions']}")
    parts.append(f"Benefits: {rec['benefits_summary']}")
    parts.append(f"Benefit type: {rec['benefit_types']}. Headline benefit value: {rec['benefit_amount']}.")
    if rec["funding_pattern"] != "Not specified":
        parts.append(f"Funding pattern: {rec['funding_pattern']}.")
    if rec["interest_rate"] != "Not specified":
        parts.append(f"Interest rate: {rec['interest_rate']}. Repayment: {rec['repayment']}.")
    if rec["coverage"] != "Not specified":
        parts.append(f"Scale/coverage reported by government: {rec['coverage']}.")
    parts.append(f"How to apply: {rec['application_mode']} via {rec['application_portal']}. Documents needed: {rec['documents_required']}.")
    if rec["helpline"] != "Not specified":
        parts.append(f"Helpline/contact: {rec['helpline']}.")
    parts.append(f"Key features: {rec['key_features']}")
    if rec["recent_updates"] != "Not specified":
        parts.append(f"Recent updates: {rec['recent_updates']}")
    srcs = [s for s in (rec["source_1"], rec["source_2"], rec["source_3"]) if s != "Not specified"]
    if srcs:
        parts.append("Sources: " + " | ".join(srcs) + ".")
    return " ".join(parts)
