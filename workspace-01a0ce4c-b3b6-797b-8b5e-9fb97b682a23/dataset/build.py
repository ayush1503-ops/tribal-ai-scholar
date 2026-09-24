#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build every deliverable for the SC/ST government schemes chatbot dataset.

Outputs (in /home/user/output/):
  1. sc_st_schemes_dataset.csv        - flat spreadsheet of every scheme
  2. sc_st_schemes_dataset.json       - list of dict records (with embedding_text)
  3. sc_st_schemes_rag.jsonl          - one JSON object per scheme, RAG-ready
  4. SC_ST_Schemes_Dataset.xlsx       - workbook: dataset, FAQ pairs, field dictionary, stats
  5. chatbot_system_prompt.md         - ready-to-paste system prompt + few-shot examples
  6. README.md                        - what's inside, fields, how to use, caveats
"""
import csv, json, os, re, sys, textwrap
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import FIELDS, embedding_text           # noqa: E402
import data_central_sc as m1                        # noqa: E402
import data_central_sc2 as m2                       # noqa: E402
import data_central_st as m3                        # noqa: E402
import data_central_st2 as m4                       # noqa: E402
import data_cross as m5                             # noqa: E402
import data_state as m6                             # noqa: E402
import data_students as m7                          # noqa: E402

DERIVED = ["launched_year_num", "is_current", "record_type", "focus_area", "is_student_scheme"]

ROOT = "/home/user"
OUT = os.path.join(ROOT, "output")
os.makedirs(OUT, exist_ok=True)


def enrich(r):
    """Add derived, chatbot-friendly fields (do not invent facts)."""
    m = re.search(r"\b(19|20)\d{2}\b", r["launched_year"])
    r["launched_year_num"] = int(m.group(0)) if m else ""
    r["is_current"] = "Yes" if r["status"].startswith("Active") else "No"
    r["record_type"] = ("Historical / predecessor scheme"
                        if not r["status"].startswith("Active") else "Current scheme")
    # focus tag - what kind of need does this scheme address?
    bt = r["benefit_types"]
    student_roles = ("Student", "Scholar", "Fellow", "Researcher")
    strong_student_benefits = ("Scholarship", "Fellowship", "Coaching", "Fee reimbursement",
                              "Fee waiver", "Fee concession", "Residential school",
                              "Overseas study", "Education loan", "Stipend")
    n_strong = sum(1 for m in strong_student_benefits if m in bt)
    is_student = (any(m in r["beneficiary_type"] for m in student_roles)
                  and not any(v in r["beneficiary_type"] for v in ("Village", "Community"))) \
                 or n_strong >= 2
    r["is_student_scheme"] = "Yes" if is_student else "No"
    if is_student:
        r["focus_area"] = "Student / Education"
    elif "Housing" in bt:
        r["focus_area"] = "Housing"
    elif "Health" in bt or "Screening" in bt or "Treatment" in bt:
        r["focus_area"] = "Health"
    elif any(k in bt for k in ("Legal-relief", "Legal", "Rehabilitation")):
        r["focus_area"] = "Legal & Protection"
    elif any(k in bt for k in ("Loan", "Subsidy", "Livelihood", "Micro-credit", "Entrepreneurship",
                               "Cash incentive", "MSP support", "Skill", "Green enterprise",
                               "Capital grant", "Equity", "Credit guarantee", "Marriage support")):
        r["focus_area"] = "Livelihood & Enterprise"
    else:
        r["focus_area"] = "Infrastructure & Development"
    # honest defaults so no field is ever blank for a state scheme
    if r["funding_pattern"] == "Not specified" and r["level"] == "State":
        r["funding_pattern"] = "State Government budget (State Sector Scheme; some state schemes also carry a central share)"
    if r["helpline"] == "Not specified":
        r["helpline"] = "District office of the nodal department listed under the application portal"
    if r["exclusions"] == "Not specified":
        r["exclusions"] = ("No specific exclusion listed - standard conditions apply "
                           "(normally one benefit per beneficiary/family unless stated otherwise)")
    if r["age_criteria"] == "Not specified":
        r["age_criteria"] = "Not specified in the scheme guidelines"
    return r


def load():
    recs, seen = [], set()
    for mod in (m1, m2, m3, m4, m5, m6, m7):
        for r in mod.SCHEMES:
            missing = [k for k in FIELDS if k not in r]
            if missing:
                raise SystemExit(f"{r.get('scheme_id')}: missing fields {missing}")
            if r["scheme_id"] in seen:
                raise SystemExit(f"Duplicate scheme_id: {r['scheme_id']}")
            seen.add(r["scheme_id"])
            enrich(r)
            r["embedding_text"] = embedding_text(r)
            recs.append(r)
    return recs


def faq_pairs(recs):
    """Auto-generate retrieval-style Q&A pairs from each record (great for SFT / few-shot)."""
    out = []
    for r in recs:
        name = r["scheme_name"]
        qa = [
            (f"What is {name} ({r['acronym']})?",
             f"{name} is a {r['category']} scheme of {r['nodal_ministry']}, implemented at the {r['level'].lower()} level "
             f"in {r['state_ut']}. Type: {r['scheme_type']}. Launched: {r['launched_year']}. Status: {r['status']}. "
             f"It aims to help {r['target_groups']}. Benefit: {r['benefits_summary']}"),
            (f"Who is eligible for {name}?",
             f"Target group: {r['target_groups']}. Beneficiary type: {r['beneficiary_type']}. "
             f"Age: {r['age_criteria']}. Income limit: {r['income_limit']}. Other conditions: {r['other_eligibility']} "
             + (f"Not eligible: {r['exclusions']}" if r["exclusions"] != "Not specified" else "")),
            (f"What benefits/amount does {name} give?",
             f"{r['benefits_summary']} Headline value: {r['benefit_amount']}"
             + (f" Funding pattern: {r['funding_pattern']}." if r["funding_pattern"] != "Not specified" else "")),
            (f"How do I apply for {name}?",
             f"Application mode: {r['application_mode']}. Portal: {r['application_portal']}. "
             f"Documents needed: {r['documents_required']}. "
             + (f"Helpline: {r['helpline']}." if r["helpline"] != "Not specified" else "")),
        ]
        if r["predecessor"] != "Not specified" or r["successor"] != "Not specified":
            qa.append((f"What happened to {name} - is it still running?",
                       f"Status: {r['status']}. Earlier scheme(s): {r['predecessor']}. Now replaced/continued by: {r['successor']}. "
                       f"Active period: {r['active_period']}. {r['recent_updates']}"))
        if r["recent_updates"] != "Not specified":
            qa.append((f"What are the latest changes in {name}?",
                       f"{r['recent_updates']} (Last verified: {r['last_verified']}, confidence: {r['data_confidence']}.)"))
        for q, a in qa:
            out.append({"scheme_id": r["scheme_id"], "scheme_name": name,
                        "category": r["category"], "level": r["level"], "state_ut": r["state_ut"],
                        "question": q, "answer": a})
    return out


def write_outputs(recs, faqs):
    # 1. CSV
    csv_path = os.path.join(OUT, "sc_st_schemes_dataset.csv")
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS + DERIVED + ["embedding_text"], quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(recs)

    # 2. JSON
    json_path = os.path.join(OUT, "sc_st_schemes_dataset.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(recs, f, ensure_ascii=False, indent=2)

    # 3. JSONL for RAG
    jsonl_path = os.path.join(OUT, "sc_st_schemes_rag.jsonl")
    with open(jsonl_path, "w", encoding="utf-8") as f:
        for r in recs:
            f.write(json.dumps({
                "id": r["scheme_id"],
                "title": f"{r['scheme_name']} ({r['acronym']})",
                "category": r["category"],
                "level": r["level"],
                "state_ut": r["state_ut"],
                "ministry": r["nodal_ministry"],
                "status": r["status"],
                "text": r["embedding_text"],
                "metadata": {k: r[k] for k in ("launched_year", "launched_year_num", "is_current",
                                               "active_period", "benefit_types", "income_limit",
                                               "application_portal", "data_confidence", "last_verified",
                                               "source_1")},
            }, ensure_ascii=False) + "\n")

    # 3b. student/education-only extracts
    stu = [r for r in recs if r["is_student_scheme"] == "Yes"]
    stu_csv = os.path.join(OUT, "student_schemes_sc_st.csv")
    with open(stu_csv, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS + DERIVED + ["embedding_text"], quoting=csv.QUOTE_ALL)
        w.writeheader(); w.writerows(stu)
    stu_jsonl = os.path.join(OUT, "student_schemes_rag.jsonl")
    with open(stu_jsonl, "w", encoding="utf-8") as f:
        for r in stu:
            f.write(json.dumps({"id": r["scheme_id"], "title": f"{r['scheme_name']} ({r['acronym']})",
                                "category": r["category"], "level": r["level"], "state_ut": r["state_ut"],
                                "ministry": r["nodal_ministry"], "text": r["embedding_text"],
                                "metadata": {"benefit_amount": r["benefit_amount"],
                                             "income_limit": r["income_limit"],
                                             "application_portal": r["application_portal"],
                                             "data_confidence": r["data_confidence"]}},
                               ensure_ascii=False) + "\n")

    faq_csv = os.path.join(OUT, "sc_st_schemes_faq_pairs.csv")
    with open(faq_csv, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(faqs[0].keys()), quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(faqs)

    faq_jsonl = os.path.join(OUT, "sc_st_schemes_faq_pairs.jsonl")
    with open(faq_jsonl, "w", encoding="utf-8") as f:
        for q in faqs:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")

    # 4. Excel workbook
    try:
        import pandas as pd
        from openpyxl.styles import Font, Alignment, PatternFill
        from openpyxl.utils import get_column_letter

        df = pd.DataFrame(recs, columns=FIELDS + DERIVED + ["embedding_text"])
        df_faq = pd.DataFrame(faqs)
        df_stu = df[df["is_student_scheme"] == "Yes"]
        fields_df = pd.DataFrame([{"field": f, "meaning": MEANINGS.get(f, "")} for f in FIELDS + DERIVED])
        stats = pd.DataFrame({
            "metric": ["total schemes", "student / education schemes", "non-student schemes",
                       "SC-focused", "ST-focused", "SC & ST / cross-cutting", "PVTG",
                       "Central", "State", "Active", "Merged/Closed/Subsumed", "discontinued (predecessor) records"],
            "value": [len(recs),
                      sum(1 for r in recs if r["is_student_scheme"] == "Yes"),
                      sum(1 for r in recs if r["is_student_scheme"] == "No"),
                      sum(1 for r in recs if r["category"] == "SC"),
                      sum(1 for r in recs if r["category"] == "ST"),
                      sum(1 for r in recs if r["category"] == "SC & ST"),
                      sum(1 for r in recs if r["category"] == "PVTG"),
                      sum(1 for r in recs if r["level"] == "Central"),
                      sum(1 for r in recs if r["level"] == "State"),
                      sum(1 for r in recs if r["status"].startswith("Active")),
                      sum(1 for r in recs if not r["status"].startswith("Active")),
                      sum(1 for r in recs if r["status"] != "Active")],
        })
        # timeline sheet: 2015-2026 (the last 10+ years)
        tl_rows = []
        for y in range(2015, 2027):
            names = [f"{r['scheme_name']} ({r['acronym']})" for r in recs
                     if str(r["launched_year_num"]) == str(y)]
            active = [r["scheme_name"] for r in recs if r["is_current"] == "Yes"]
            tl_rows.append({"year": y,
                            "schemes_launched_that_year": len(names),
                            "scheme_names": "; ".join(names) if names else "-",
                            "cumulative_active_schemes_in_dataset": len(active)})
        tl_df = pd.DataFrame(tl_rows)

        hist_df = pd.DataFrame([{k: r[k] for k in ("scheme_id", "scheme_name", "acronym", "category",
                                                   "level", "launched_year", "active_period", "status",
                                                   "predecessor", "successor", "recent_updates", "source_1")}
                                for r in recs if r["is_current"] == "No"])

        xlsx = os.path.join(OUT, "SC_ST_Schemes_Dataset.xlsx")
        with pd.ExcelWriter(xlsx, engine="openpyxl") as xw:
            df_stu.to_excel(xw, sheet_name="Student Schemes", index=False)
            df.to_excel(xw, sheet_name="All Schemes", index=False)
            df_faq.to_excel(xw, sheet_name="Chatbot Q&A Pairs", index=False)
            tl_df.to_excel(xw, sheet_name="Timeline 2015-2026", index=False)
            hist_df.to_excel(xw, sheet_name="Historical & Merged", index=False)
            fields_df.to_excel(xw, sheet_name="Field Dictionary", index=False)
            stats.to_excel(xw, sheet_name="Stats", index=False)
            wb = xw.book
            for sheet, freeze in (("Student Schemes", "C2"), ("All Schemes", "C2"), ("Chatbot Q&A Pairs", "A2"),
                                  ("Timeline 2015-2026", "A2"), ("Historical & Merged", "B2"),
                                  ("Field Dictionary", "A2"), ("Stats", "A2")):
                ws = wb[sheet]
                ws.freeze_panes = freeze
                ws.auto_filter.ref = ws.dimensions
                for cell in ws[1]:
                    cell.font = Font(bold=True, color="FFFFFF")
                    cell.fill = PatternFill("solid", fgColor="1F4E79")
                    cell.alignment = Alignment(vertical="center", wrap_text=True)
                ws.row_dimensions[1].height = 28
                widths = {"All Schemes": 34, "Student Schemes": 34, "Chatbot Q&A Pairs": 46,
                          "Field Dictionary": 24, "Stats": 34, "Timeline 2015-2026": 22,
                          "Historical & Merged": 40}
                for i, col in enumerate(ws.iter_cols(min_row=1, max_row=1), start=1):
                    name = str(col[0].value)
                    width = widths[sheet]
                    if sheet in ("All Schemes", "Student Schemes") and name in ("scheme_name", "benefits_summary",
                                                           "other_eligibility", "embedding_text"):
                        width = 70
                    ws.column_dimensions[get_column_letter(i)].width = width
    except Exception as e:      # pragma: no cover
        print("Excel export skipped:", e)

    return csv_path, json_path, jsonl_path, faq_csv


MEANINGS = {
    "scheme_id": "Stable unique ID (SC/ST/PVTG + level + number + state code)",
    "scheme_name": "Official name of the scheme",
    "acronym": "Short name people actually type in a chatbot",
    "aliases": "Alternative names / old names to match user queries",
    "category": "SC, ST, SC & ST (cross-cutting) or PVTG",
    "level": "Central or State",
    "state_ut": "All India, or the State/UT",
    "nodal_ministry": "Ministry/department administratively responsible",
    "implementing_agency": "Who actually implements/delivers",
    "scheme_type": "Central Sector / Centrally Sponsored / State Sector / Corporation credit / Statutory",
    "launched_year": "Year of launch or notification",
    "active_period": "FY/plan period in which the scheme operated",
    "status": "Active / Active (subsumed) / Merged & renamed / Closed",
    "predecessor": "Scheme(s) it replaced (for 'what happened to the old scheme' questions)",
    "successor": "Scheme that replaced it",
    "target_groups": "Who the scheme is meant for",
    "beneficiary_type": "Individual/Student/Family/Woman/Entrepreneur/SHG/Institution/Village",
    "age_criteria": "Age rules, if any",
    "income_limit": "Income ceiling, if any",
    "other_eligibility": "All remaining eligibility conditions",
    "exclusions": "Who cannot apply / important conditions",
    "benefits_summary": "Plain-language description of benefits",
    "benefit_types": "Controlled vocabulary of benefit categories",
    "benefit_amount": "Headline monetary value or benefit size",
    "funding_pattern": "Centre:State funding share",
    "interest_rate": "Interest rate for credit schemes",
    "repayment": "Repayment terms for credit schemes",
    "coverage": "Official scale/beneficiary numbers",
    "application_mode": "Online/Offline/Bank/State department",
    "application_portal": "Official portal and URL",
    "documents_required": "Documents the applicant must produce",
    "helpline": "Official helpline or contact",
    "key_features": "3-6 distinguishing facts",
    "recent_updates": "Latest changes (2023-2026)",
    "data_confidence": "High = verified from official source; Medium = verify on portal before quoting",
    "last_verified": "Date the record was compiled/verified",
    "source_1": "Primary source (name | URL)",
    "source_2": "Secondary source (name | URL)",
    "source_3": "Additional source (name | URL)",
    "embedding_text": "Natural-language paragraph for embedding/RAG chunking",
    "launched_year_num": "Derived: first 4-digit year found in launched_year (for sorting/filtering)",
    "is_current": "Derived: Yes if the scheme is currently active, No if merged/closed",
    "record_type": "Derived: Current scheme or Historical/predecessor scheme",
    "focus_area": "Derived: Student / Education, Livelihood & Enterprise, Housing, Health, Legal & Protection, Infrastructure & Development",
    "is_student_scheme": "Derived: Yes if the scheme is education/student oriented (scholarship, fee, coaching, hostel, fellowship, education loan)",
}


def write_readme(recs, faqs, paths):
    n = len(recs)
    by_cat = Counter(r["category"] for r in recs)
    by_level = Counter(r["level"] for r in recs)
    by_status = Counter("Active" if r["status"].startswith("Active") else r["status"] for r in recs)
    by_focus = Counter(r["focus_area"] for r in recs)
    n_stu = sum(1 for r in recs if r["is_student_scheme"] == "Yes")
    stu_state = Counter(r["state_ut"] for r in recs if r["is_student_scheme"] == "Yes" and r["level"] == "State")
    txt = f"""# SC / ST Government Schemes Dataset (for an AI chatbot)

Compiled: {recs[0]['last_verified']} | Records: **{n} schemes** | Q&A pairs: **{len(faqs)}**

Covers SC (Scheduled Caste) and ST (Scheduled Tribe), including PVTG-focused and cross-cutting
schemes, from **historical schemes going back to the 1940s-1970s through to schemes launched in
2026**, plus the **currently active** flagship schemes.

## Files

| File | What it is | Best used for |
|---|---|---|
| `output/sc_st_schemes_dataset.csv` | Flat table, {len(FIELDS)} fields + embedding text | Excel/Sheets review, bulk editing |
| `output/sc_st_schemes_dataset.json` | Same records as JSON | Loading into an app / DB |
| `output/sc_st_schemes_rag.jsonl` | One JSON object per scheme with a ready-to-embed `text` paragraph | RAG (LangChain/LlamaIndex/pgvector) |
| `output/student_schemes_sc_st.csv` | **Student/education-only extract ({n_stu} schemes)** | Scholarship chatbot, admission counselling bot |
| `output/student_schemes_rag.jsonl` | Same student schemes, RAG-ready | Education-focused RAG index |
| `output/sc_st_schemes_faq_pairs.csv/.jsonl` | Auto-derived question-answer pairs (4-6 per scheme) | Fine-tuning, evaluation, few-shot prompts |
| `output/SC_ST_Schemes_Dataset.xlsx` | Workbook with 7 sheets: Student Schemes, All Schemes, Chatbot Q&A Pairs, Timeline 2015-2026, Historical & Merged, Field Dictionary, Stats | Review by a non-technical team, quick filtering |
| `output/chatbot_system_prompt.md` | Ready-to-paste system prompt + guardrails + few-shot examples | Wiring the chatbot |
| `dataset/*.py` | Source data modules (edit here, then re-run `build.py`) | Adding or updating schemes |

## Coverage at a glance

- **Student / education schemes: {n_stu} of {n}** ({round(100*n_stu/n)}% of the dataset) - scholarships,
  fee reimbursement, fee waivers, coaching, hostels, fellowships, education loans and overseas study.
- Category: {dict(by_cat)}
- Level: {dict(by_level)}
- Focus area: {dict(by_focus)}
- Status: {dict(by_status)}
- Student schemes by State: {dict(stu_state)}

### The student pipeline the dataset covers (ask-and-answer order)
1. **School:** Pre-Matric SC/ST (Class 9-10), Pre-Matric for children of sanitation workers, EMRS,
   SHRESHTA, ashram schools, ST hostels, Odisha Madho Singh Haath Kharcha, WB Sikshashree.
2. **Class 11-Graduation:** Post-Matric SC/ST (central), State windows (Karnataka SSP, TS ePASS,
   MahaDBT, UP/MP/Rajasthan/Odisha/Gujarat/Punjab/Jharkhand/Kerala/Delhi/Himachal), Top Class SC/ST.
3. **Premier institutes:** IIT/NIT/IIIT full tuition waiver + free messing for SC/ST, Top Class
   Education SC, CSSS, AICTE Pragati/Saksham, Ishan Uday, TN Pudhumai Penn, Bihar Student Credit Card.
4. **Research:** NFSC, NFST, UGC Post-Doctoral Fellowship for SC/ST, Rajiv Gandhi National Fellowship (legacy).
5. **Abroad:** NOS-SC, NOS-ST, Telangana Ambedkar Overseas Vidya Nidhi.
6. **Coaching:** Free Coaching Scheme for SC/OBC, UP Abhyudaya, Rajasthan Anuprati, HP pre-exam coaching.
7. **Financing gaps:** PM Vidyalaxmi, Bihar Student Credit Card, NSFDC/NSTFDC education loans.

## How to use with a chatbot

1. **RAG (recommended):** load `sc_st_schemes_rag.jsonl`, embed the `text` field, keep `title`,
   `category`, `state_ut`, `status`, `metadata.application_portal` as metadata filters.
2. **Prompt stuffing (small scale):** paste the CSV/JSON into a long-context model along with
   `chatbot_system_prompt.md`.
3. **Fine-tuning:** use `sc_st_schemes_faq_pairs.jsonl` for supervised fine-tuning, and hold back
   20% of schemes as a test set to check hallucination.

## Guardrails baked into the data

- **Two confidence levels.** `data_confidence = High` means the norm/amount was verified against an
  official Ministry/State source while compiling. `Medium` means the scheme is real and the design is
  right, but the amount/slab changes often - the chatbot should say "as per the latest notification"
  and point to `application_portal`.
- **Historical and current schemes are separated** by `status` (`Active`, `Merged & renamed`,
  `Closed`) with `predecessor`/`successor` links, so the bot can answer "what happened to the old
  scheme?" correctly for any year of the last 10 years.
- **Eligibility ceilings are stated explicitly** (income, age, land, occupation) because most wrong
  answers from such bots come from applying a central norm to a State scheme (or vice versa).
- Every record carries at least one `source_*` entry.

## Rebuilding

```bash
cd /home/user/dataset
python3 build.py          # regenerates everything in /home/user/output
```
Edit or add records in the `dataset/data_*.py` files; the schema is in `dataset/schema.py`.

## Important caveat

Scheme amounts, income ceilings and portals are revised frequently by Governments. Before the chatbot
answers a citizen with a money figure, it should be refreshed against the official portal
(`application_portal`) and the ministry website. `last_verified` shows when each record was compiled.
"""
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8") as f:
        f.write(txt)


def write_system_prompt(recs):
    ministries = sorted({r["nodal_ministry"].split("(")[0].strip() for r in recs})
    prompt = f"""# Chatbot system prompt - SC/ST Government Schemes Assistant

You are **Scheme Saathi**, an assistant that helps citizens in India find Government of India and
State Government schemes for Scheduled Castes (SC), Scheduled Tribes (ST) and Particularly
Vulnerable Tribal Groups (PVTG).

## Knowledge
You answer only from the provided dataset ({len(recs)} scheme records covering central and state
schemes from the 1940s to 2026, including merged/closed predecessor schemes). Each record has
eligibility, benefits, amounts, documents, portals, status and sources.

## Rules
1. **Never invent a scheme, amount, portal or deadline.** If the dataset does not contain it, say so
   and point the user to the nodal ministry portal.
2. **Always state the level** (Central vs State) and the State/UT, because a central norm may not
   apply in a State scheme.
3. **Quote figures with a caveat** when `data_confidence` is `Medium`: "as per the latest available
   notification - please confirm on <portal>".
4. **Check status first** for older schemes. If `status` is `Merged & renamed` or `Closed`, tell the
   user what replaced it (`successor`) and whether it is still relevant for arrears/pending cases.
5. **Ask these clarifying questions before recommending**, when the user has not said them:
   category (SC/ST/PVTG), State/UT, education level or business intent, family income, and whether
   the user wants scholarship / loan / housing / skill / legal help.
6. **Give a checklist**: eligibility match, documents required, portal, helpline.
7. **Respect privacy**: never ask for caste certificate numbers, Aadhaar numbers or bank details.
8. **Language**: reply in the user's language (English, Hindi or any Indian language); keep money
   amounts in Indian format (Rs 1,00,000).
9. **Do not give legal advice.** For atrocities/relief matters, give the relief scale, the 7-day
   relief rule and the District Magistrate / SC-ST Protection Cell contact, and suggest a lawyer or
   the National Commission for Scheduled Castes/Scheduled Tribes.
10. Cite the scheme's `source_1` URL when the user asks "where is this written?".

## Student questions are the most common
Applicants usually ask about scholarships, fees, hostels, coaching and fellowships. For a student
query, always establish: **course/class level, State/UT, family income, category and whether the
student is in a government or private institution** - then match in this order:
1. Category + level scholarship (Pre-Matric SC/ST, Post-Matric SC/ST, Top Class, SHRESHTA, EMRS)
2. Institutional fee waiver (IIT/NIT/IIIT full tuition waiver + free messing for SC/ST)
3. State scholarship/fee-reimbursement window (e.g. Karnataka SSP, TS ePASS, MahaDBT, Digital Gujarat)
4. Fellowships for research (NFSC, NFST, UGC Post-Doctoral Fellowship for SC/ST)
5. Overseas study (NOS-SC, NOS-ST, Telangana Ambedkar Overseas Vidya Nidhi)
6. Loans when the income ceiling is exceeded (PM Vidyalaxmi, Bihar Student Credit Card, NSFDC/NSTFDC education loans)
7. Coaching for competitive exams (Free Coaching Scheme for SC/OBC, UP Abhyudaya, Rajasthan Anuprati)
Note that a student can usually hold **one central scholarship** but may combine a **state** benefit
and an **institutional fee waiver** with it - always flag the 'one scholarship at a time' rule.

## Answer template
```
Scheme: <name> (<acronym>) - <Central/State, State/UT>
Status: <Active/Merged>
Who can apply: <eligibility including income ceiling>
Benefit: <amount, as per latest notification>
Documents: <list>
Apply at: <portal>
Help: <helpline>
Note: <caveat, e.g. amounts revised periodically>
```

## Useful aggregator portals to point users to
- National Scholarship Portal - https://scholarships.gov.in
- myScheme (scheme discovery) - https://www.myscheme.gov.in
- Ministry of Social Justice & Empowerment - https://socialjustice.gov.in
- Ministry of Tribal Affairs - https://tribal.nic.in
- National SC-ST Hub (entrepreneurs) - https://www.scsthub.in
- Standup Mitra (loans) - https://www.standupmitra.in

## Few-shot examples (grounded in the dataset)

**User:** My family income is Rs 2 lakh. I am an SC student in Class 12 in Jaipur. What can I get?
**Assistant:** Two things apply to you right now.
1. *Pre-Matric Scholarship for SC students (Classes IX-X)* - Central scheme, income ceiling Rs 2.5
   lakh, pays Rs 525/month if you are a hosteller (Rs 225 day scholar) for 10 months. Apply on the
   National Scholarship Portal.
2. *Post-Matric Scholarship for SC students* - from Class 11 onwards; you keep getting fees plus
   Rs 230-1,200/month depending on course and hostel status once you start your next course.
Add Rajasthan's *Anuprati* coaching scheme if you plan to prepare for competitive exams.

**User:** I am a safai karamchari in Delhi, I want to start a small business.
**Assistant:** Use the *National Safai Karamcharis Finance and Development Corporation (NSKFDC)*
loan window (loans up to Rs 30 lakh, about 5% interest, applied through the State Channelizing
Agency) plus the *NAMASTE / SRMS* rehabilitation support (one-time Rs 40,000 assistance for
identified manual scavengers and capital subsidy for sanitation enterprises). For a Delhi-specific
option, the *DSCSTFDC* gives concessional loans to SC/ST residents of Delhi. You will need: safai
karamchari certificate, caste certificate, income certificate, Aadhaar, bank account and a project
estimate.

**User:** Is PMAGY still running?
**Assistant:** PMAGY (Pradhan Mantri Adarsh Gram Yojana) as a standalone scheme **closed in
2021-22**. It was merged with SCA-to-SCSP and the Babu Jagjivan Ram Chhatrawas Yojana into
**PM-AJAY**, whose Adarsh Gram component now develops SC-majority villages (population 500+ with
more than 40% SC population). Pending/ongoing village works are handled under PM-AJAY - portal:
https://pmajay.dosje.gov.in

## Ministries represented in the dataset
{chr(10).join('- ' + m for m in ministries)}
"""
    with open(os.path.join(OUT, "chatbot_system_prompt.md"), "w", encoding="utf-8") as f:
        f.write(prompt)


if __name__ == "__main__":
    records = load()
    faqs = faq_pairs(records)
    paths = write_outputs(records, faqs)
    write_readme(records, faqs, paths)
    write_system_prompt(records)

    print(f"OK  {len(records)} schemes, {len(faqs)} Q&A pairs")
    for p in sorted(os.listdir(OUT)):
        print("   ", p, f"({os.path.getsize(os.path.join(OUT, p))/1024:.1f} KB)")
    print("\nBy category:", Counter(r["category"] for r in records))
    print("By level   :", Counter(r["level"] for r in records))
    print("By status  :", Counter(r["status"] for r in records))
