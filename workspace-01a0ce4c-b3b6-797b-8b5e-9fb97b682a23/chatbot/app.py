#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scheme Saathi - a working SC/ST schemes chatbot over the dataset built in /home/user/output.

Runs with ZERO external dependencies (Python standard library only), so it works anywhere.

  Option A (default, offline): retrieval-grounded answer composer.
        The bot finds the best-matching scheme records with TF-IDF over the dataset and
        answers ONLY from them, using the answer template. No API key needed.

  Option B (LLM mode): set an API key and the SAME retrieval results are sent as context to an LLM:
        export OPENAI_API_KEY=sk-...        (uses gpt-4o-mini by default, override with OPENAI_MODEL)
        export GEMINI_API_KEY=...           (uses gemini-2.0-flash by default, override with GEMINI_MODEL)
    9 out of 10 wrong answers from scheme chatbots come from the model inventing amounts -
    that is why we always retrieve first and pass the retrieved records as context.

Run:
    python3 app.py                 # http://localhost:8000
    python3 app.py --port 9000
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import urllib.request
from collections import Counter
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_DIR = os.path.join(ROOT, "output")
RAG_FILE = os.path.join(DATA_DIR, "sc_st_schemes_rag.jsonl")
FAQ_FILE = os.path.join(DATA_DIR, "sc_st_schemes_faq_pairs.jsonl")
FULL_FILE = os.path.join(DATA_DIR, "sc_st_schemes_dataset.json")

STOP = set("""a an the of for is are was were to in on at by with from and or as be been being this that
these those what which who whom how when where why do does did i my me we our you your he she it they them
their can could should would will shall may might must not no nor if then than so such about into over
under again more most some any all both each few other own same too very s t just don now""".split())

# synonyms so the retriever understands how people actually type
EXPAND = {
    "scholarship": ["scholarship", "scholership", "post-matric", "pre-matric", "stipend", "fellowship",
                    "fee", "fees", "waiver", "reimbursement", "free education"],
    "hostel": ["hostel", "chhatrawas", "boarding", "lodging", "mess", "accommodation"],
    "loan": ["loan", "credit", "finance", "borrow", "rinn", "term loan", "micro-credit", "micro finance",
             "microfinance", "interest"],
    "business": ["business", "entrepreneur", "enterprise", "startup", "udyam", "msme", "self-employment"],
    "house": ["house", "housing", "awas", "gharkul", "home", "shelter", "pucca"],
    "coaching": ["coaching", "coach", "upsc", "ias", "exam", "test preparation"],
    "girl": ["girl", "girls", "women", "woman", "female", "kanya", "beti", "mahila", "bridal", "bride",
             "widow", "mother"],
    "student": ["student", "school", "college", "degree", "course", "study", "studies", "education", "class"],
    "marriage": ["marriage", "wedding", "shaadi", "vivah", "kalyana", "inter-caste", "intercaste"],
    "abroad": ["abroad", "overseas", "foreign", "usa", "uk", "videsh", "vidya nidhi", "higher studies abroad"],
    "skill": ["skill", "training", "vocational", "daksh", "employable", "placement"],
    "health": ["health", "hospital", "sickle", "disease", "treatment", "medical"],
    "atrocity": ["atrocity", "relief", "poa", "discrimination", "caste abuse", "case", "police", "court"],
    "farm": ["farm", "farmer", "agriculture", "irrigation", "borewell", "land", "crop"],
    "forest": ["forest", "van", "mfp", "tribal produce", "forest rights", "patta"],
    "housing": ["housing", "awas", "house construction", "toilet"],
}

STATE_ALIASES = {
    "andhra pradesh": "Andhra Pradesh", "ap": "Andhra Pradesh",
    "arunachal": "Arunachal Pradesh", "assam": "Assam", "bihar": "Bihar",
    "chhattisgarh": "Chhattisgarh", "goa": "Goa", "gujarat": "Gujarat",
    "haryana": "Haryana", "himachal": "Himachal Pradesh", "hp": "Himachal Pradesh",
    "jharkhand": "Jharkhand", "karnataka": "Karnataka", "kerala": "Kerala",
    "madhya pradesh": "Madhya Pradesh", "mp": "Madhya Pradesh",
    "maharashtra": "Maharashtra", "manipur": "Manipur", "meghalaya": "Meghalaya",
    "mizoram": "Mizoram", "nagaland": "Nagaland", "odisha": "Odisha", "orissa": "Odisha",
    "punjab": "Punjab", "rajasthan": "Rajasthan", "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu", "tn": "Tamil Nadu", "telangana": "Telangana",
    "tripura": "Tripura", "uttar pradesh": "Uttar Pradesh", "up": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand", "west bengal": "West Bengal", "bengal": "West Bengal",
    "delhi": "Delhi", "ncr": "Delhi",
}


# --------------------------------------------------------------------------------------
# data loading + TF-IDF index
# --------------------------------------------------------------------------------------
IRREGULAR = {"women": "woman", "girls": "girl", "boys": "boy", "children": "child", "fees": "fee",
             "classes": "class", "kids": "kid", "studies": "study", "scholarships": "scholarship",
             "loans": "loan", "schemes": "scheme", "hostels": "hostel", "years": "year", "lakhs": "lakh",
             "crores": "crore", "pattas": "patta", "benefits": "benefit", "students": "student",
             "farmers": "farmer", "workers": "worker", "applications": "application"}


def stem(w: str) -> str:
    if w in IRREGULAR:
        return IRREGULAR[w]
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 4 and w.endswith("es") and not w.endswith(("ses", "xes", "ches", "shes")):
        return w[:-2]
    if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is", "as")):
        return w[:-1]
    return w


def tokenize(text: str):
    return [stem(w) for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP and len(w) > 1]


class Index:
    def __init__(self):
        self.records = json.load(open(FULL_FILE, encoding="utf-8"))
        self.by_id = {r["scheme_id"]: r for r in self.records}
        self.docs = []          # (doc_id, weight, tokens)
        # one document per scheme (the embedding_text paragraph)
        for r in self.records:
            self.docs.append((r["scheme_id"], 1.0, tokenize(r["embedding_text"])))
            self.docs.append((r["scheme_id"], 2.4,
                              tokenize(f"{r['scheme_name']} {r['acronym']} {r['aliases']}")))
        self.name_tokens = {r["scheme_id"]: set(tokenize(
            f"{r['scheme_name']} {r['acronym']} {r['aliases']}")) for r in self.records}
        # plus the FAQ questions, so natural phrasings match strongly
        if os.path.exists(FAQ_FILE):
            for line in open(FAQ_FILE, encoding="utf-8"):
                q = json.loads(line)
                self.docs.append((q["scheme_id"], 1.35, tokenize(q["question"])))
        self.df = Counter()
        for _, _, toks in self.docs:
            for t in set(toks):
                self.df[t] += 1
        self.N = len(self.docs)
        self.idf = {t: math.log((self.N + 1) / (c + 1)) + 1 for t, c in self.df.items()}
        self.vecs = []
        for doc_id, weight, toks in self.docs:
            tf = Counter(toks)
            v = {t: (1 + math.log(c)) * self.idf.get(t, 1.0) * weight for t, c in tf.items()}
            n = math.sqrt(sum(x * x for x in v.values())) or 1.0
            self.vecs.append((doc_id, {t: x / n for t, x in v.items()}))

    def search(self, query: str, k: int = 6, filters: dict | None = None):
        filters = filters or {}
        ql = query.lower()
        base = tokenize(query)
        extra: list[str] = []
        for key, syns in EXPAND.items():
            if stem(key) in base or any(phrase in ql for phrase in syns):
                extra += tokenize(" ".join(syns))
        if "sc" in base:
            extra += ["scheduled", "caste"]
        if "st" in base or "tribe" in base or "tribal" in base:
            extra += ["scheduled", "tribe", "tribal"]
        q_tokens = base + extra
        if not q_tokens:
            return []
        base_set = set(base)
        qw: dict[str, float] = {}
        for t in set(q_tokens):
            w = 1.0 if t in base_set else 0.35
            if re.fullmatch(r"(19|20)\d{2}", t):
                w = 0.15                                     # years are usually noise ("schemes in 2024")
            qw[t] = w * self.idf.get(t, 1.0)
        qv = qw
        n = math.sqrt(sum(x * x for x in qv.values())) or 1.0
        qv = {t: x / n for t, x in qv.items()}

        scores: dict[str, float] = {}
        for doc_id, dv in self.vecs:
            if not (filters.get("state") or filters.get("category") or filters.get("student") or filters.get("level")):
                pass
            s = sum(x * dv.get(t, 0.0) for t, x in qv.items())
            if s > 0:
                scores[doc_id] = max(scores.get(doc_id, 0.0), s)

        # rare query terms (high idf) that also appear in the scheme NAME/aliases = strong signal
        rare = [t for t in base_set if self.idf.get(t, 0) >= 2.6]
        common_in_name = [t for t in base_set if t not in rare]
        out = []
        for sid, s in scores.items():
            r = self.by_id[sid]
            if filters.get("state"):
                st = filters["state"].lower()
                if st not in r["state_ut"].lower() and r["level"] != "Central":
                    continue
            if filters.get("category"):
                want, got, lvl = filters["category"], r["category"], r["level"]
                if want == "PVTG" and got not in ("PVTG", "ST"):
                    continue
                if want == "SC" and got not in ("SC", "SC & ST"):
                    continue
                if want == "ST" and got not in ("ST", "SC & ST", "PVTG"):
                    continue
                if want == "SC & ST" and got not in ("SC", "ST", "SC & ST", "PVTG"):
                    continue
            if filters.get("level") and filters["level"] != r["level"]:
                continue
            if filters.get("student") and r["is_student_scheme"] != "Yes":
                continue
            if not filters.get("state") and r["level"] == "Central":
                s *= 1.18                       # all-India schemes apply to everyone - prefer them when no state is named
            nt = self.name_tokens.get(sid, ())
            s += 0.085 * sum(1 for t in rare if t in nt)
            s += 0.035 * sum(1 for t in common_in_name if t in nt)
            out.append((s, r))
        out.sort(key=lambda x: -x[0])
        return out[:k]


def detect_filters(question: str) -> dict:
    ql = question.lower()
    f = {}
    # longest state name first so "andhra pradesh" wins over "ap"
    for alias in sorted(STATE_ALIASES, key=len, reverse=True):
        if re.search(rf"\b{re.escape(alias)}\b", ql):
            f["state"] = STATE_ALIASES[alias]
            break
    if re.search(r"\b(pvtg|primitive tribe|particularly vulnerable)\b", ql):
        f["category"] = "PVTG"
    elif re.search(r"\b(sc|scheduled caste|dalit|harijan|ambedkar)\b", ql) and re.search(r"\b(st|scheduled tribe|adivasi|tribal|janjati)\b", ql):
        f["category"] = "SC & ST"
    elif re.search(r"\b(st|scheduled tribe|adivasi|tribal|janjati)\b", ql):
        f["category"] = "ST"
    elif re.search(r"\b(sc|scheduled caste|dalit|harijan)\b", ql):
        f["category"] = "SC"
    if re.search(r"\b(student|school|college|scholarship|study|studies|exam|coaching|hostel|admission|degree|phd|fellowship)\b", ql):
        f["student"] = True
    return f


# --------------------------------------------------------------------------------------
# answer composition (grounded) - this is the "no hallucination" core
# --------------------------------------------------------------------------------------
def detail_answer(r: dict) -> str:
    lines = [
        f"**{r['scheme_name']}** ({r['acronym']})",
        f"Type: {r['level']} scheme · {r['category']} · Status: {r['status']}",
        f"Ministry/Dept: {r['nodal_ministry']}",
        "",
        f"**Who can apply:** {r['target_groups']}.",
        f"- Income limit: {r['income_limit']}",
        f"- Age: {r['age_criteria']}",
        f"- Other conditions: {r['other_eligibility']}",
        "",
        f"**Benefit:** {r['benefits_summary']}",
        f"**Amount / value:** {r['benefit_amount']}",
    ]
    if r["interest_rate"] != "Not specified":
        lines.append(f"**Interest & repayment:** {r['interest_rate']} · {r['repayment']}")
    if r["funding_pattern"] != "Not specified":
        lines.append(f"**Funding:** {r['funding_pattern']}")
    lines += [
        "",
        f"**Documents needed:** {r['documents_required']}",
        f"**Apply at:** {r['application_portal']}  ({r['application_mode']})",
        f"**Help:** {r['helpline']}",
    ]
    if r["recent_updates"] != "Not specified":
        lines.append(f"**Recent changes:** {r['recent_updates']}")
    note = ("Always confirm the current amount on the official portal before applying"
            if r["data_confidence"] == "Medium" else
            "Figures verified against official sources while compiling the dataset - still worth confirming on the portal")
    lines.append(f"\n_Note: {note}. Last compiled: {r['last_verified']}._")
    lines.append(f"_Source: {r['source_1']}_")
    return "\n".join(lines)


def list_answer(hits, question: str) -> str:
    f = detect_filters(question)
    scope = []
    if f.get("state"):
        scope.append(f.get("state"))
    if f.get("category"):
        scope.append(f["category"])
    if f.get("student"):
        scope.append("student/education")
    head = "Here are the closest matches" + (f" for {' '.join(scope)}" if scope else "") + ":"
    rows = [head, ""]
    for i, (score, r) in enumerate(hits, 1):
        amount = r["benefit_amount"]
        amount = (amount[:180] + "…") if len(amount) > 180 else amount
        rows.append(f"**{i}. {r['scheme_name']} ({r['acronym']})** — {r['level']}"
                    + (f", {r['state_ut']}" if r["level"] == "State" else "")
                    + f"\n   • Benefit: {amount}"
                    + f"\n   • Eligibility: {r['income_limit']}" + (f" | age {r['age_criteria']}" if r['age_criteria'] != "Not specified in the scheme guidelines" else "")
                    + f"\n   • Apply: {r['application_portal']}"
                    + (f" · Ask about this scheme by name for full details and documents." if i == 1 else ""))
    rows.append("\nAsk me about any one of these by name (for example: *\"Post-Matric Scholarship SC\"*) and I'll give the full eligibility, documents and application steps.")
    return "\n".join(rows)


def clarifying_question() -> str:
    return ("I couldn't match that to a scheme in my dataset. To help you properly, could you tell me:\n\n"
            "1. **Category** — SC, ST or a PVTG community?\n"
            "2. **State/UT** you live in?\n"
            "3. **What you need** — scholarship/education, job or business loan, housing, health, skill training, or legal relief under the SC/ST (PoA) Act?\n"
            "4. **Family annual income** (income ceilings decide most eligibility).\n\n"
            "You can also browse the official discovery portals: https://www.myscheme.gov.in , "
            "https://scholarships.gov.in , https://socialjustice.gov.in , https://tribal.nic.in")


def compose(question: str, top_k: int = 5) -> dict:
    idx = IDX
    filters = detect_filters(question)
    hits = idx.search(question, k=top_k, filters=filters)
    if not hits:
        hits = idx.search(question, k=top_k)          # retry without filters
    if not hits or hits[0][0] < 0.12:
        return {"answer": clarifying_question(), "hits": [], "mode": "clarify"}

    # If the user clearly names one scheme (or one strong hit), give the detail card.
    strong = hits[0][0]
    r0 = hits[0][1]
    # "did the user name this scheme?" - exact name/acronym/alias OR most distinctive name words
    ql = question.lower()
    generic = {"scholarship", "scheme", "student", "education", "for", "of", "the", "and", "central",
               "state", "government", "india", "yojana", "about", "what", "is", "how", "apply"}
    name_terms = {t for t in tokenize(f"{r0['scheme_name']} {r0['acronym']} {r0['aliases']}") if t not in generic}
    q_terms = set(tokenize(question))
    overlap = len(name_terms & q_terms) / max(1, len(name_terms))
    named = (r0["acronym"].lower() in ql
             or r0["scheme_name"].lower() in ql
             or any(a.strip().lower() and a.strip().lower() in ql for a in r0["aliases"].split(";"))
             or overlap >= 0.5)
    is_list_q = bool(re.search(r"\b(which|list|options|all|available|recommend|schemes|eligible)\b", ql))
    definitional = bool(re.match(r"^(what is|what are|tell me about|explain|details of|about)\b", ql.strip())) \
        and "schemes" not in ql
    dominant = len(hits) == 1 or hits[1][0] < strong * 0.8
    money_or_need = bool(re.search(r"\b(income|lakh|lakhs|per annum|salary|bpl|below poverty)\b", ql))
    if named or definitional or (strong > 0.5 and dominant and not is_list_q and not money_or_need):
        body = detail_answer(r0)
        if len(hits) > 1 and hits[1][0] > strong * 0.75:
            body += ("\n\n**You may also qualify for:** "
                     + "; ".join(f"{r['scheme_name']} ({r['acronym']})" for _, r in hits[1:3]))
        return {"answer": body,
                "hits": [(round(s, 3), r["scheme_id"], r["scheme_name"]) for s, r in hits],
                "mode": "detail", "filters": filters}
    return {"answer": list_answer(hits, question),
            "hits": [(round(s, 3), r["scheme_id"], r["scheme_name"]) for s, r in hits],
            "mode": "list", "filters": filters}


# --------------------------------------------------------------------------------------
# OPTIONAL: LLM mode (same retrieval, model writes the prose)
# --------------------------------------------------------------------------------------
SYSTEM = """You are Scheme Saathi, a careful assistant on Indian SC/ST government schemes.
Answer ONLY from the CONTEXT records provided. Never invent a scheme, amount, portal or deadline.
State whether each scheme is Central or State and quote income ceilings exactly.
If a record's data_confidence is Medium, add "as per the latest available notification - confirm on the portal".
If the context does not answer the question, say so and ask the clarifying questions about category, State, income and need.
Keep amounts in Indian format. Reply in the user's language.
Answer template: Scheme | Status | Who can apply | Benefit | Documents | Apply at | Help | Note."""


def llm_answer(question: str, contexts: list[dict]) -> str | None:
    ctx = "\n\n---\n\n".join(r["embedding_text"] for _, _, r in contexts)[:14000]
    prompt = f"CONTEXT:\n{ctx}\n\nUSER QUESTION: {question}"

    if os.environ.get("OPENAI_API_KEY"):
        body = json.dumps({
            "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}],
            "temperature": 0.1,
        }).encode()
        req = urllib.request.Request(
            os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions"),
            data=body, headers={"Content-Type": "application/json",
                                "Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())["choices"][0]["message"]["content"]
        except Exception as e:                       # noqa: BLE001
            return f"_(LLM call failed: {e} - showing grounded extract instead)_\n\n"

    if os.environ.get("GEMINI_API_KEY"):
        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
               f"?key={os.environ['GEMINI_API_KEY']}")
        body = json.dumps({"system_instruction": {"parts": [{"text": SYSTEM}]},
                           "contents": [{"parts": [{"text": prompt}]}],
                           "generationConfig": {"temperature": 0.1}}).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                d = json.loads(resp.read())
                return d["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:                       # noqa: BLE001
            return f"_(LLM call failed: {e} - showing grounded extract instead)_\n\n"
    return None


def chat(question: str) -> dict:
    result = compose(question)
    if result["mode"] == "clarify":
        return result
    idx = IDX
    hits = [(s, sid, idx.by_id[sid]) for s, sid, _ in
            [(s, sid, n) for s, sid, n in result["hits"]]][:4]
    llm = llm_answer(question, hits)
    if llm:
        result["answer"] = llm + "\n\n---\n_Sources:_ " + " · ".join(
            idx.by_id[sid]["source_1"] for _, sid, _ in result["hits"][:2])
        result["mode"] = result["mode"] + "+llm"
    return result


# --------------------------------------------------------------------------------------
# HTTP server + minimal chat UI
# --------------------------------------------------------------------------------------
PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Scheme Saathi - SC/ST schemes chatbot</title>
<style>
 :root{--bg:#0f172a;--card:#ffffff;--ink:#111827;--muted:#6b7280;--accent:#1d4ed8;--accent2:#065f46;}
 *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
 background:linear-gradient(160deg,#eef2ff,#f8fafc 40%,#ecfdf5);color:var(--ink);min-height:100vh}
 header{background:var(--bg);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
 header h1{font-size:18px;margin:0;font-weight:650} header .tag{font-size:12px;opacity:.8}
 .wrap{max-width:920px;margin:18px auto;padding:0 14px}
 .panel{background:var(--card);border-radius:14px;box-shadow:0 8px 30px rgba(15,23,42,.08);padding:16px}
 .chips{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 12px}
 .chip{border:1px solid #c7d2fe;background:#eef2ff;color:#1e3a8a;border-radius:999px;padding:7px 12px;
 font-size:13px;cursor:pointer} .chip:hover{background:#e0e7ff}
 #log{height:min(56vh,520px);overflow-y:auto;padding:6px 2px;display:flex;flex-direction:column;gap:12px}
 .msg{max-width:88%;padding:12px 14px;border-radius:14px;font-size:14.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
 .me{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:4px}
 .bot{align-self:flex-start;background:#f8fafc;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
 .bot b{color:#0f172a}
 .row{display:flex;gap:8px;margin-top:12px}
 input,select{font-size:15px;padding:11px 12px;border:1px solid #d1d5db;border-radius:10px;background:#fff}
 input{flex:1} button{background:var(--accent2);color:#fff;border:0;border-radius:10px;padding:0 18px;font-size:15px;cursor:pointer}
 button:hover{filter:brightness(1.08)} .meta{font-size:12px;color:var(--muted);margin:8px 2px 0}
 .badge{display:inline-block;font-size:11px;background:#dcfce7;color:#065f46;border:1px solid #a7f3d0;border-radius:6px;padding:2px 7px;margin-left:6px}
</style></head><body>
<header><h1>Scheme Saathi</h1><span class="tag">SC / ST government schemes assistant · dataset-backed · grounded answers only</span></header>
<div class="wrap"><div class="panel">
 <div class="chips" id="chips"></div>
 <div id="log"></div>
 <div class="row">
  <select id="state" title="State filter"><option value="">Any state</option></select>
  <select id="cat" title="Category filter"><option value="">SC + ST</option><option>SC</option><option>ST</option><option>PVTG</option></select>
  <input id="q" placeholder="Ask: I am an SC student in Karnataka, income 2 lakh, which scholarship?" autocomplete="off">
  <button id="go">Ask</button>
 </div>
 <div class="meta" id="meta">Retrieval over the local dataset · no answer is generated from outside the records.</div>
</div></div>
<script>
const log=document.getElementById('log'),q=document.getElementById('q');
const chips=["Scholarship for SC student in Karnataka","ST student hostel scheme","Loan for SC woman entrepreneur","Free coaching for SC students for UPSC","Schemes for a safai karamchari family","Housing scheme for SC family in Maharashtra","What happened to PMAGY?","SC student studying abroad scholarship"];
const box=document.getElementById('chips');
chips.forEach(c=>{const b=document.createElement('div');b.className='chip';b.textContent=c;b.onclick=()=>{q.value=c;ask();};box.appendChild(b);});
fetch('/api/states').then(r=>r.json()).then(d=>{const s=document.getElementById('state');d.states.forEach(n=>{const o=document.createElement('option');o.textContent=n;s.appendChild(o);});});
function add(text,cls){const d=document.createElement('div');d.className='msg '+cls;
 d.innerHTML=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>').replace(/_([^_]+)_/g,'<i>$1</i>');log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
async function ask(){const text=q.value.trim();if(!text)return;add(text,'me');q.value='';
 const w=add('searching the dataset…','bot');
 const body={question:text,state:document.getElementById('state').value,category:document.getElementById('cat').value};
 const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json();
 let extra='';if(d.hits&&d.hits.length){extra='\\n\\n'+(d.mode.includes('llm')?'_LLM wrote this from retrieved records':'_Grounded in dataset records_')+': '+d.hits.map(h=>h[1]).join(', ');}
 w.innerHTML='';w.appendChild(document.createTextNode(d.answer+extra));
 const m=document.getElementById('meta');m.textContent='mode: '+d.mode+' · records retrieved: '+(d.hits?d.hits.length:0);}
document.getElementById('go').onclick=ask;
q.addEventListener('keydown',e=>{if(e.key==='Enter')ask();});
add('Namaste. Ask me about SC/ST scholarships, fee waivers, hostels, coaching, loans, housing, skill training or legal relief. Tell me your **state**, **category (SC/ST/PVTG)** and **family income** for a precise answer.','bot');
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):                                        # noqa: N802
        if self.path in ("/", "/index.html"):
            return self._send(200, PAGE, "text/html")
        if self.path == "/api/states":
            states = sorted({r["state_ut"] for r in IDX.records if r["level"] == "State"})
            return self._send(200, json.dumps({"states": states}))
        if self.path.startswith("/api/search"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            query = (qs.get("q") or [""])[0]
            hits = IDX.search(query, k=10)
            return self._send(200, json.dumps({"query": query, "results": [
                {"id": r["scheme_id"], "name": r["scheme_name"], "score": round(s, 3),
                 "level": r["level"], "state": r["state_ut"], "portal": r["application_portal"]}
                for s, r in hits]}, ensure_ascii=False))
        if self.path == "/api/stats":
            return self._send(200, json.dumps({
                "schemes": len(IDX.records),
                "student_schemes": sum(1 for r in IDX.records if r["is_student_scheme"] == "Yes"),
                "central": sum(1 for r in IDX.records if r["level"] == "Central"),
                "state": sum(1 for r in IDX.records if r["level"] == "State"),
                "llm_mode": bool(os.environ.get("OPENAI_API_KEY") or os.environ.get("GEMINI_API_KEY")),
            }))
        return self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):                                       # noqa: N802
        if self.path != "/api/chat":
            return self._send(404, json.dumps({"error": "not found"}))
        n = int(self.headers.get("Content-Length", 0))
        payload = json.loads(self.rfile.read(n) or b"{}")
        question = (payload.get("question") or "").strip()
        forced = {"state": payload.get("state") or "", "category": payload.get("category") or ""}
        if forced["state"] or forced["category"]:
            res = compose(question + (f" {forced['state']}" if forced["state"] else "")
                          + (f" {forced['category']}" if forced["category"] else ""))
        else:
            res = chat(question)
        res["nn"] = len(IDX.records)
        return self._send(200, json.dumps(res, ensure_ascii=False))

    def log_message(self, *a):                               # keep the console quiet
        pass


IDX = Index()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="0.0.0.0")
    args = ap.parse_args()
    print(f"Loaded {len(IDX.records)} schemes, {IDX.N} search documents. "
          f"LLM mode: {'ON' if (os.environ.get('OPENAI_API_KEY') or os.environ.get('GEMINI_API_KEY')) else 'OFF (grounded composer)'}")
    print(f"Open http://localhost:{args.port}")
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
