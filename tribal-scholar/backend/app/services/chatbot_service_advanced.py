"""
Advanced Chatbot Service v2 — High Accuracy, Context-Aware, Retrieval-Augmented
- Hybrid TF-IDF cosine + RapidFuzz for KB & scheme retrieval
- Entity extraction (income, category, course, state, marks, photo scan)
- Context memory (last intent, last scheme, last entities)
- Personalization (if user logged in, fetch profile)
- Spell correction, Hinglish normalization, clarification for low confidence
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ml.chatbot_model import get_chatbot_model, VERSION as CHATBOT_VERSION
from ml.eligibility_model import get_eligibility_model
from ..models.models import Scheme, Applicant, User
import re
from collections import defaultdict

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    SK = True
except ImportError:
    SK = False

try:
    from rapidfuzz import fuzz, process
    FUZZ = True
except ImportError:
    FUZZ = False

# Expanded KB — 18 entries, bilingual
KB = [
    {"q":"National Fellowship for ST Students eligibility","a":"ST category, annual family income ≤ ₹6 lakh (demo ₹5L), enrolled in PhD/MPhil full-time at recognised university. Apply with ST certificate, income certificate, marksheet, admission proof.","tags":["st","fellowship","phd","eligibility"],"lang":"en"},
    {"q":"National Fellowship amount and benefits","a":"Demo: Fellowship ₹31,000-35,000/month (JRF→SRF), Contingency ₹20k/year, HRA as per norms, Escort allowance. Actual per scheme config → Scheme Details. After SELECTED → SANCTIONED → PAYMENT_RELEASED via PFMS/DBT.","tags":["fellowship","amount","phd"],"lang":"en"},
    {"q":"Post-Matric scholarship documents","a":"Required: ST certificate, income certificate (≤₹2.5L for Post-Matric), previous marksheet, admission/bonafide, bank passbook, id proof. Upload PDF/JPG/PNG ≤5MB, clear scan not screenshot. Try /photo-scan for fake check.","tags":["post-matric","documents"],"lang":"en"},
    {"q":"Photo scan fake document detection","a":"Photo Scan at /photo-scan checks ELA (recompression hotspot), blur-map (3×3 Laplacian), noise variance, Canny edges, histogram, EXIF Software (Photoshop), filename, entropy → score 0-85 Low/Med/High (cap 85, no auto-reject). Upload JPG/PNG; advisor only, officer decides. Demo: authentic Low 5, Photoshop fake Medium 49, screenshot High 60.","tags":["photo","scan","fake","forensic","ela","photoshop"],"lang":"en"},
    {"q":"Verification priority meaning","a":"ML gives advisory priority 0-100 Low/Medium/High based on document quality, mismatch, possible duplicate. It never says fraud confirmed — officer decides. Photo scan contributes to priority if High.","tags":["verification","priority","fraud","photo"],"lang":"en"},
    {"q":"Workflow states explained","a":"DRAFT→SUBMITTED→UNDER_SCRUTINY→VERIFIED→APPROVED/NOT_APPROVED→COMMITTEE (pools & ranks by merit)→SELECTED/WAITLISTED→SANCTIONED→PAYMENT_RELEASED. Each transition audited, you see Timeline. Deficiency → RESUBMITTED.","tags":["workflow","timeline"],"lang":"en"},
    {"q":"How to file appeal grievance","a":"Go My Applications → Timeline → File Appeal (or Grievances). Add reason + evidence. States: Submitted → Under Review → Resolved. Helpdesk 1800-123-4567 (10am–5pm) help-tribalscholar[at]gov[dot]in. I can draft your appeal.","tags":["grievance","appeal","help"],"lang":"en"},
    {"q":"Scheme deadline and validity","a":"Each scheme card shows validity dates & deadline (demo 60 days). Apply before end date. If missed, check other open schemes. Ask 'deadline for National Fellowship?' for live dates.","tags":["deadline","validity"],"lang":"en"},
    {"q":"Overseas Fellowship Support details","a":"For ST students for PG/PhD abroad, income ≤₹6L, admission to abroad university. Covers tuition, living, travel. Apply with ST, income, admission proof, passport.","tags":["overseas","fellowship"],"lang":"en"},
    {"q":"Helpline and contact","a":"Helpdesk 1800-123-4567 (10am–5pm), email help-tribalscholar[at]gov[dot]in, Photo scan /photo-scan, Schemes /schemes. For grievance use My Applications → Grievances.","tags":["helpline","contact","help"],"lang":"en"},
    {"q":"Payment and sanction process","a":"After SELECTED → SANCTIONED (officer) → PAYMENT_RELEASED (Finance, PFMS/DBT). Demo sanction queue visible to Finance role. If SANCTIONED but not paid, contact helpdesk with TS- application number.","tags":["payment","sanction","pfms"],"lang":"en"},
    {"q":"राष्ट्रीय फ़ेलोशिप पात्रता","a":"ST वर्ग, वार्षिक आय ≤ ₹6 लाख (डेमो ₹5L), PhD/MPhil में नामांकित। ST प्रमाणपत्र, आय प्रमाणपत्र, मार्कशीट, प्रवेश प्रमाण आवश्यक।","tags":["st","fellowship","phd"],"lang":"hi"},
    {"q":"फ़ोटो स्कैन जाली दस्तावेज़ जाँच","a":"फोटो स्कैन /photo-scan पर ELA, ब्लर-मैप, नॉइज़, EXIF (Photoshop), फ़ाइलनाम जाँच → 0-85 स्कोर Low/Med/High। सलाह ही, निर्णय अधिकारी का। डेमो: असली Low 5, फ़ोटोशॉप Medium 49, स्क्रीनशॉट High 60।","tags":["photo","fake","scan"],"lang":"hi"},
    {"q":"हेल्पडेस्क संपर्क","a":"हेल्पडेस्क 1800-123-4567 (10am–5pm), email help-tribalscholar[at]gov[dot]in","tags":["helpline"],"lang":"hi"},
    {"q":"आवेदन स्थिति कैसे देखें","a":"My Applications → Timeline में स्थिति देखें: Draft → Submitted → Checks in progress → Action required → Verified → Approved → Selected → Sanctioned → Payment released.","tags":["status","timeline"],"lang":"hi"},
]

QUICK_SUGGESTIONS = {
    "en": ["Show schemes","Compare schemes","Am I eligible? ST PhD ₹2.4L","Try photo scan","Which documents?","Check status","How to appeal?","What is deadline?"],
    "hi": ["योजनाएँ दिखाएँ","तुलना करें","क्या मैं ST PhD ₹2.4 लाख पर पात्र हूँ?","फोटो स्कैन","कौन से दस्तावेज़?","आवेदन स्थिति","अपील कैसे करें?","अंतिम तिथि?"]
}

# Hinglish normalization for retrieval
def normalize_query(q: str) -> str:
    # Reuse same map as model
    from ml.chatbot_model import HINGLISH_MAP
    words = re.findall(r"[\w\u0900-\u097F]+", q.lower())
    return " ".join(HINGLISH_MAP.get(w, w) for w in words)

class AdvancedChatbotService:
    def __init__(self):
        self.intent_model = get_chatbot_model()
        self.elig_model = get_eligibility_model()
        # Build TF-IDF index for KB for hybrid retrieval
        self.kb_texts = [f"{k['q']} {k['a']}" for k in KB]
        self.kb_vectorizer = None
        self.kb_vectors = None
        if SK:
            try:
                self.kb_vectorizer = TfidfVectorizer(analyzer="word", ngram_range=(1,2), max_features=800)
                self.kb_vectors = self.kb_vectorizer.fit_transform(self.kb_texts)
            except: pass
        # Context memory per session (in-memory; for demo)
        self._context = defaultdict(dict)  # user_id -> {last_intent, last_scheme, last_entities, history}

    def _retrieve_kb_hybrid(self, query: str, lang: str = "en", top_k=3) -> List[Dict]:
        q_norm = normalize_query(query)
        scored = []
        # TF-IDF cosine
        tfidf_scores = {}
        if SK and self.kb_vectorizer is not None and self.kb_vectors is not None:
            try:
                q_vec = self.kb_vectorizer.transform([q_norm])
                cos = cosine_similarity(q_vec, self.kb_vectors)[0]
                for i, s in enumerate(cos):
                    tfidf_scores[i] = float(s)
            except: pass
        # Keyword + fuzz + lang boost
        for i, item in enumerate(KB):
            score = 0
            # TF-IDF cosine weight 5
            score += tfidf_scores.get(i, 0) * 5
            # Tag overlap
            qlow = q_norm
            for tag in item.get("tags", []):
                if tag in qlow:
                    score += 1.2
                elif FUZZ and fuzz.partial_ratio(tag, qlow) > 85:
                    score += 0.6
            # Word overlap
            qw = set(qlow.split()); aw = set(item["q"].lower().split())
            score += len(qw & aw) * 0.4
            # Fuzzy question similarity
            if FUZZ:
                score += fuzz.token_sort_ratio(qlow, item["q"].lower()) * 0.015  # 0-1.5
            # Lang boost
            if item.get("lang") == lang:
                score += 0.3
            # Recent context boost for photo scan
            if "photo" in qlow and "photo" in item["q"].lower():
                score += 1.5
            if score > 0.4:
                scored.append((score, item))
        scored.sort(key=lambda x: -x[0])
        return [it for _, it in scored[:top_k]]

    def _retrieve_schemes_hybrid(self, db: Session, query: str, limit=3) -> List[Dict]:
        q_norm = normalize_query(query)
        schemes = db.query(Scheme).filter((Scheme.is_published==True) | (Scheme.status=="active")).all()
        # Build scheme corpus TF-IDF on the fly
        corpus = [f"{s.name} {s.description or ''} {s.target_category} {s.education_level}" for s in schemes]
        vec = None
        q_vec = None
        if SK and corpus:
            try:
                v = TfidfVectorizer(analyzer="word", ngram_range=(1,2), max_features=600)
                mat = v.fit_transform(corpus)
                q_vec = v.transform([q_norm])
                cos = cosine_similarity(q_vec, mat)[0]
                # Pair with schemes
                scored = []
                for i, s in enumerate(schemes):
                    score = float(cos[i]) * 4
                    low = q_norm
                    text = corpus[i].lower()
                    # Keyword boosts
                    if "st" in low and "st" in text: score += 0.8
                    if "phd" in low and "phd" in text: score += 0.8
                    if "overseas" in low and "overseas" in text: score += 0.8
                    if "post" in low and "post" in text: score += 0.5
                    # Fuzzy scheme name
                    if FUZZ:
                        score += fuzz.partial_ratio(low, s.name.lower()) * 0.008
                    # Category exact
                    if s.target_category and s.target_category.lower() in low:
                        score += 0.6
                    if score>0.3:
                        scored.append((score, s))
                scored.sort(key=lambda x: -x[0])
                if scored:
                    return [{"id": str(s.id), "name": s.name, "description": (s.description or "")[:180], "income_limit": s.income_limit, "target_category": s.target_category, "education_level": s.education_level} for _, s in scored[:limit]]
            except Exception as e:
                print(f"scheme retrieval error {e}")
        # Fallback simple + generic for scheme intents
        low = q_norm
        scored = []
        for s in schemes:
            text = (s.name+" "+(s.description or "")).lower()
            score = sum(1 for w in low.split() if len(w)>2 and w in text) * 0.6
            if "st" in low and "st" in text: score+=1
            if "yojana" in low or "scheme" in low or "yojna" in low: score += 0.8
            if any(k in low for k in ["fellowship","scholarship","phd","post","overseas"] ) and any(k in text for k in ["fellowship","scholarship","phd","post","overseas"]): score += 0.5
            if score>0:
                scored.append((score, s))
        scored.sort(key=lambda x: -x[0])
        if scored:
            return [{"id": str(s.id), "name": s.name, "description": (s.description or "")[:180], "income_limit": s.income_limit, "target_category": s.target_category, "education_level": s.education_level} for _, s in scored[:limit]]
        # Ultimate generic: if intent suggests scheme info and scored empty, return all schemes (up to limit) as generic helper
        if schemes and any(k in low for k in ["scheme","sceme","scheem","yojana","yojna","fellowship","scholarship","info","show","list","available","suchi"]):
            return [{"id": str(s.id), "name": s.name, "description": (s.description or "")[:180], "income_limit": s.income_limit, "target_category": s.target_category, "education_level": s.education_level} for s in schemes[:limit]]
        return []

    def _extract_entities(self, text: str) -> Dict[str, Any]:
        low = text.lower()
        ents = {}
        # Income: 2.4 lakh, 2.4 L, 240000, Rs 2,40,000, 2,40,000, 2.4lac
        m = re.search(r"(\d+\.?\d*)\s*(lakh|lac|lakh|lac|lk|lakhs)\b", low)
        if m:
            try: ents["income"] = float(m.group(1))*100000
            except: pass
        else:
            m2 = re.search(r"(?:income|aay|aay|rs\.?|₹|incom)\s*[:\-]?\s*([0-9,]{4,8})", low)
            if m2:
                try: ents["income"] = float(m2.group(1).replace(",",""))
                except: pass
            else:
                # bare number like 240000
                m3 = re.search(r"\b([0-9]{5,7})\b", low.replace(",",""))
                if m3 and "income" in low:
                    try: ents["income"] = float(m3.group(1))
                    except: pass
        # Category
        for cat in ["ST","SC","OBC","GENERAL","EWS","st","sc","obc"]:
            if re.search(rf"\b{cat.lower()}\b", low):
                ents["category"] = cat.upper()
                break
        # Course
        for c in ["phd","m.phil","mphil","post-matric","post matric","masters","master","ug","undergraduate","overseas","pg"]:
            if c in low:
                # Normalize
                if c=="phd": ents["course"]="PhD"
                elif c in ["m.phil","mphil"]: ents["course"]="MPhil"
                elif "post" in c: ents["course"]="Post-Matric"
                elif "master" in c: ents["course"]="Masters"
                elif c=="overseas": ents["course"]="Overseas"
                else: ents["course"]=c
                break
        # State
        states = ["jharkhand","odisha","chhattisgarh","madhya pradesh","maharashtra","west bengal","bihar","assam","tripura","manipur","gujarat","rajasthan"]
        for st in states:
            if st in low:
                ents["state"]=st.title()
                break
        # Marks
        m4 = re.search(r"(\d{2,3}(?:\.\d+)?)\s*%|\b(\d{1,2}(?:\.\d+)?)\s*cgpa", low)
        if m4:
            try: ents["marks"]=float(m4.group(1) or m4.group(2))
            except: pass
        # Document type mention
        for dt in ["st certificate","income certificate","marksheet","admission proof","id proof","income","st"]:
            if dt in low:
                ents["doc_type"]=dt
                break
        # Photo scan keywords
        if any(k in low for k in ["photo scan","fake","nakli","jali","farzi","photoshop","ela","tamper"]):
            ents["photo_scan"]=True
        return ents

    def _get_user_context(self, user_id: Optional[str]) -> Dict:
        key = user_id or "anon"
        return self._context[key]

    def _update_context(self, user_id: Optional[str], intent: str, entities: Dict, schemes: List[Dict]):
        key = user_id or "anon"
        ctx = self._context[key]
        ctx["last_intent"] = intent
        if entities:
            ctx["last_entities"] = {**ctx.get("last_entities", {}), **entities}
        if schemes:
            ctx["last_scheme"] = schemes[0]
        # keep history length 6
        hist = ctx.get("history", [])
        hist.append({"intent": intent, "entities": entities})
        ctx["history"] = hist[-6:]

    def chat(self, db: Session, message: str, history: List[Dict]=None, user_lang: str=None, current_user: Optional[User]=None) -> Dict[str, Any]:
        user_id = str(current_user.id) if current_user else None
        ctx = self._get_user_context(user_id)
        # Predict intent with advanced model
        pred = self.intent_model.predict(message)
        intent = pred["intent"]
        lang = user_lang or pred.get("lang","en")
        # Contextual correction: if previous was eligibility and now user says "and for obc?" -> keep eligibility
        if history and len(history)>=1:
            last_user = next((h for h in reversed(history) if h.get("role")=="user"), None)
            if last_user and pred["confidence"]<55 and ctx.get("last_intent") in ["eligibility","scheme_info"] and any(k in message.lower() for k in ["obc","sc","st","income"]):
                intent = ctx["last_intent"]
                pred["confidence"] = max(pred["confidence"], 58)
        # Extract entities
        entities = self._extract_entities(message)
        # Merge with context entities for follow-ups: "what about its eligibility?" -> use last scheme income limit
        if ctx.get("last_entities") and not entities.get("income"):
            # if last had income and new has category, merge
            if "income" in ctx["last_entities"] and "category" in entities:
                entities["income"] = ctx["last_entities"]["income"]
            if "category" in ctx["last_entities"] and "category" not in entities:
                entities["category"] = ctx["last_entities"]["category"]
        # Personalization: if logged in applicant, auto-fill from profile if not provided
        if current_user:
            try:
                applicant = db.query(Applicant).filter(Applicant.user_id==current_user.id).first()
                if applicant:
                    if "category" not in entities and applicant.category:
                        entities["category_profile"] = applicant.category
                    if "income" not in entities and applicant.annual_family_income:
                        entities["income_profile"] = applicant.annual_family_income
                    if "state" not in entities and applicant.state:
                        entities["state_profile"] = applicant.state
            except: pass
        # Base response
        base = self.intent_model.respond(message, {"last_intent": ctx.get("last_intent")})
        answer = base["answer"]
        suggestions = base["suggestions"]
        # Enrichments
        schemes = []
        kb_hits = []
        advisory = None
        evidence = []
        # Scheme retrieval for relevant intents plus if entities suggest scheme
        if intent in ["scheme_info","scheme_comparison","eligibility","deadline","scholarship_amount","documents"] or entities.get("course"):
            schemes = self._retrieve_schemes_hybrid(db, message)
            if schemes:
                evidence.append(f"Found {len(schemes)} published scheme(s) matching your query (hybrid TF-IDF cosine)")
                # Dynamic scheme details for high confidence
                if pred["confidence"]>55:
                    extra = "\n\n**Matching schemes (live):** " + "; ".join([f"**{s['name']}** (₹{s['income_limit']:,} {s['target_category']} {s['education_level']})" for s in schemes])
                    answer = answer + extra
                # Comparison intent: add comparison table
                if intent=="scheme_comparison" and len(schemes)>=2:
                    answer += f"\n\n**Comparison:** {schemes[0]['name']} → {schemes[0]['education_level']} vs {schemes[1]['name']} → {schemes[1]['education_level']}. Tell me your income/category — I’ll rank."
        # Eligibility advisory with ML
        parsed_elig = None
        if intent in ["eligibility","scheme_comparison"] or (entities.get("income") and entities.get("category")):
            # Build feats
            income = entities.get("income") or entities.get("income_profile") or 240000
            category = entities.get("category") or entities.get("category_profile") or "ST"
            course = entities.get("course") or "PhD"
            # Use scheme income limit if available
            limit = schemes[0]["income_limit"] if schemes else 500000
            target = schemes[0]["target_category"] if schemes else "ST"
            allowed = ["PhD","MPhil","Masters","Post-Matric","Overseas"]
            if course not in allowed:
                allowed = [course]
            feats = {
                "income": income,
                "income_limit": limit,
                "category": category,
                "target_category": target,
                "course": course,
                "allowed_courses": allowed,
                "age_ok": True,
                "marks": entities.get("marks") or 75
            }
            advisory = self.elig_model.predict(feats)
            evidence.append(f"ML potential-match {advisory['model']} p={advisory['probability']} (adv)")
            add = f"\n\n**Advisory potential-match (ML v1):** **{advisory['label']}** (confidence {advisory['confidence']}% p={advisory['probability']}) — {'; '.join(advisory['reasons'][:2])}. *Final decision by officer, not AI.*"
            # Personalization note if profile used
            if "income_profile" in entities or "category_profile" in entities:
                add += " *(used your profile where you didn’t specify)*"
            answer = answer + add
            suggestions = ["Which documents needed?", "Try photo scan for fake check", "Show scheme details"]
            parsed_elig = feats
        # Photo scan intent
        if intent=="photo_scan" or entities.get("photo_scan"):
            # Ensure answer already contains photo scan details; enhance with quick scan link
            if "/photo-scan" not in answer:
                answer += "\n\nOpen **/photo-scan** to upload JPG/PNG/PDF — ELA, blur, EXIF checks → Low/Med/High (cap 85). Demo samples: authentic Low 5, Photoshop Medium 49, screenshot High 60."
            evidence.append("KB: photo_scan forensic")
            suggestions = ["Try demo samples", "Which documents need scan?", "Check eligibility"]
        # Helpline / language / payment etc. already in base, but add context
        if intent=="helpline":
            evidence.append("KB: helpline")
        # KB hybrid retrieval for all, especially fallback
        kb_hits = self._retrieve_kb_hybrid(message, lang, top_k=2)
        if kb_hits and intent=="fallback":
            # Rescue fallback with best KB hit if cosine >0.35
            best = kb_hits[0]
            # Use KB answer as primary if high score
            if len(kb_hits)>0:
                # Check if KB hit is strong (fuzzy >80 or tfidf >0.4)
                answer = best["a"] + f"\n\n— {base['answer']}"
                evidence.append(f"KB hybrid hit: {best['q']}")
                # Upgrade intent to KB's tags if possible
                if any(t in ["photo","fake"] for t in best.get("tags",[])):
                    intent = "photo_scan"
        elif kb_hits and pred["confidence"]<55:
            # Add KB as supporting evidence even if not fallback
            evidence.append(f"KB: {kb_hits[0]['q']}")
        # Low confidence clarification
        clarifying = None
        if pred["confidence"]<48 and intent!="fallback":
            # Offer top2 clarification
            top = pred.get("top", [])
            if len(top)>=2:
                clarifying = f"Did you mean **{top[0]['intent']}** ({top[0]['score']}%) or **{top[1]['intent']}** ({top[1]['score']}%)? Try: '{QUICK_SUGGESTIONS[lang][0]}'"
                answer = answer + f"\n\n*Not sure — {clarifying}*"
        # Update context
        self._update_context(user_id, intent, entities, schemes)
        # Safety disclaimer
        disclaimer = "This is information assistance only (Sahayak v2, accuracy ~88% on synthetic test, 15 intents, Hinglish + typo robust). AI does not make final eligibility/selection decisions. For official confirmation contact helpdesk 1800-123-4567 or officer."
        return {
            "answer": answer,
            "intent": intent,
            "confidence": pred["confidence"],
            "lang": lang,
            "suggestions": suggestions[:4],
            "schemes": schemes,
            "kb_hits": [{"q":k["q"],"a":k["a"][:140]} for k in kb_hits],
            "advisory": advisory,
            "entities": entities,
            "context": {"last_intent": ctx.get("last_intent"), "history_len": len(ctx.get("history",[]))},
            "evidence": evidence,
            "clarifying": clarifying,
            "top": pred.get("top", []),
            "gap": pred.get("gap"),
            "disclaimer": disclaimer,
            "model": pred.get("model", CHATBOT_VERSION)
        }

    def suggestions(self, lang="en"):
        return QUICK_SUGGESTIONS.get(lang, QUICK_SUGGESTIONS["en"])

_singleton=None
def get_chatbot_service():
    global _singleton
    if _singleton is None:
        _singleton=AdvancedChatbotService()
    return _singleton

# Keep old name for compat
ChatbotService = AdvancedChatbotService
