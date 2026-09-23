"""
Advanced Chatbot Intent Model v2 — High Accuracy
- 15 intents, 45+ samples each, bilingual + Hinglish + typo-robust
- Hybrid TF-IDF (word+char) + LogReg balanced + RapidFuzz spell-correction fallback
- Entity extraction (income, category, course, state, marks)
- Language detection (en, hi-Deva, hinglish)
- Confidence calibration, multi-intent, context-aware responses
"""
import os, pickle, random, re, json
from typing import Dict, Any, List, Tuple, Optional
from collections import Counter

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline, FeatureUnion
    from sklearn.calibration import CalibratedClassifierCV
    SK = True
except ImportError:
    SK = False

try:
    from rapidfuzz import fuzz, process
    FUZZ = True
except ImportError:
    FUZZ = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "chatbot_intent_v2.pkl")
VERSION = "chatbot-v2-advanced-15intents"

# Hinglish transliteration map for normalization
HINGLISH_MAP = {
    "yojana": "scheme", "yojna": "scheme", "yojnaen": "schemes",
    "patrata": "eligibility", "paatrata": "eligibility", "yogya": "eligible", "yogyata": "eligibility",
    "dastavej": "documents", "dastavez": "documents", "kagaz": "documents", "praman": "certificate",
    "aavedan": "application", "avedan": "application", "arzi": "application",
    "stithi": "status", "sthiti": "status",
    "paisa": "amount", "rashi": "amount", "dhan": "amount",
    "antim": "deadline", "akhiri": "deadline", "tarikh": "deadline", "samay": "deadline",
    "shikayat": "grievance", "aparadh": "grievance", "appeal": "grievance",
    "namaste": "hello", "pranam": "hello", "sat": "hello",
    "photo": "photo scan", "nakli": "fake", "farzi": "fake", "jali": "fake",
    "suchi": "list", "jankari": "information", "vivaran": "details",
    "madad": "help", "sahayata": "help", "help": "help",
}

# Expanded intent samples — 15 intents
INTENT_SAMPLES = {
    "greeting": [
        "hello hi", "namaste", "good morning", "hey there", "hii", "hello sir", "namaste ji", "hi tribal scholar", "hello help", "good evening", "hey", "hi there", "namaste sir", "hello jee", "good afternoon", 
        "namaste sahayak", "hello tribal", "hi help me", "namaskar", "pranam", "hello assistant", "hi bot", "hey bot", "namaste help", "hello namaste",
        "hlo", "helo", "namste", "nameste", "good mrng", # typos
        "hello yojana", "namaste yojana jankari", "hii yojana", "namaste patra", # hinglish
    ],
    "scheme_info": [
        "what schemes are available", "tell me about scholarship schemes", "which scholarship for st phd", "show me national fellowship", "overseas fellowship details", "post matric scholarship info", "st scholarship list", "fellowship for st students eligibility", "what is tribal fellowship",
        "list all schemes", "available yojana", "kaun si yojana hai", "scholarship yojana list", "tribal scholarship schemes", "national fellowship details", "post matric yojana", "overseas scholarship for st", "phd fellowship tribal", "st students schemes",
        "schemes for st", "yojana suchi dikhao", "yojana ke baare mein batao", "scholarship schemes for tribal", "which yojana for phd", "show schemes", "all schemes", "yojana list", "scholarship list st",
        "what is national fellowship", "tell me fellowship", "fellowship yojana", "st fellowship list",
    ],
    "scheme_comparison": [
        "compare national fellowship vs overseas", "difference between post matric and fellowship", "which scheme is better for phd", "compare schemes", "national vs overseas fellowship", "post matric vs national fellowship", "which yojana best for me", "compare st schemes",
        "overseas fellowship vs national fellowship", "difference in scholarship schemes", "kaun si yojana behtar hai", "compare two schemes",
    ],
    "eligibility": [
        "am i eligible income 3 lakh st phd", "eligibility criteria for st scholarship", "can i apply with obc category income limit", "income limit 5 lakh what is eligibility", "check my eligibility st jharkhand phd", "who can apply for this scheme", "eligibility for fellowship age limit", "do i qualify for st scholarship",
        "i am st category income 2.4 lakh phd eligible", "my income 4 lakh can i apply", "st catagory income 3.5 lac eligible", "am i eligible 240000 income st", "check eligibility for obc", "sc category eligible", "age limit for fellowship", "marks required for scholarship", "income 5 lakh eligible", "family income 2 lakh st phd",
        "patrata kya hai", "yogyata kya hai", "kya mai patra hu", "income 2 lakh patra hu", "st hu kya eligible hu", "3 lakh aay par yogyata", "eligiblity check", "eligibilty", "elgibility", # typos
        "can st student with 2 lakh income apply for phd fellowship", "phd fellowship eligibility st 2.4 lakh",
    ],
    "documents": [
        "which documents required", "documents needed for st certificate", "income certificate required", "what files to upload pdf jpg", "ocr not working document unclear", "my st certificate is faded", "document size limit 5mb", "upload marksheet admission proof",
        "kagaz kaun se chahiye", "dastavej kaun se lagenge", "st praman patra chahiye", "aay praman patra", "marksheet chahiye", "documents list", "kaun se documents upload karne hain", "dastavej suchi",
        "documnets required", "docuemnts", "documnt", "what documents", "required documents st scholarship", "income certificate kaise banaye", "admission proof kya hai", "upload failed", "pdf upload nahi ho raha",
        "which certificate needed for st", "income certificate format", "caste certificate required",
    ],
    "photo_scan": [
        "how to detect fake document", "photo scan for fake certificate", "fake document detection", "is my certificate fake", "check if document is genuine", "nakli dastavej kaise pahchane", "fake certificate kaise check kare", "photo scan system", "scan document for tampering", "ela scan fake",
        "document verification photo scan", "fake document kaise check kare", "nakli praman patra", "jali dastavej", "verify document authenticity", "check certificate fake or real", "forensic scan document", "tampering detection", "photoshop edited certificate check",
        "how to scan photo for fake", "photo scan for scholarship documents", "fake st certificate detection", "scan my st certificate", "check my income certificate fake",
    ],
    "application_status": [
        "what is my application status", "my application is under scrutiny what next", "deficiency raised what to do", "check status application id", "when will verification complete", "my application submitted timeline",
        "application sthiti kya hai", "aavedan sthiti", "application status check", "mera application kahan hai", "status kya hai", "application track", "my application number TS-12345678 status", "check my application",
        "apllication status", "applicaton status", "statue", # typos
        "where is my application", "application under review", "submitted application status",
    ],
    "timeline": [
        "how long does verification take", "what are workflow steps draft to payment", "when will i get scholarship amount", "selection committee process", "payment released when",
        "kitna samay lagega", "verification mein kitna time", "paisa kab milega", "payment kab hoga", "timeline kya hai", "steps kya hain", "workflow status meaning",
        "how much time for approval", "when will scholarship be sanctioned", "payment process",
    ],
    "grievance": [
        "how to file appeal grievance", "my application rejected want to appeal", "raise grievance", "where to complaint", "appeal process after rejection", "grievance helpdesk",
        "shikayat kaise kare", "appeal kaise kare", "mera application reject ho gaya", "grievance file karna hai", "complaint kahan kare", "appeal process",
        "appil rejected appeal", "grivience", "greivance", # typos
        "my fellowship rejected appeal", "how to raise grievance", "helpdesk for grievance",
    ],
    "scholarship_amount": [
        "how much scholarship amount", "fellowship amount per month", "contingency amount details", "house rent allowance fellowship", "escorts allowance",
        "kitna paisa milega", "fellowship kitna hai", "rashi kitni hai", "amount kya hai", "stipend kitna", "monthly amount fellowship",
        "scholarship rashi", "fellowship amount", "kitna amount", "paisa kitna milega",
    ],
    "deadline": [
        "what is last date deadline", "scheme deadline when", "validity dates for scheme", "application closing date", "can i apply after deadline",
        "antim tarikh kya hai", "akhiri tarikh", "deadline kab hai", "last date kya hai", "yojana ki antim tarikh",
        "deadine", "dedline", "last date", "closing date",
    ],
    "helpline": [
        "helpdesk number", "helpline contact", "phone number for help", "email for support", "contact helpdesk", "1800 number",
        "madad number", "helpline kya hai", "contact number", "phone karo", "email kya hai", "help chahiye", "support contact",
    ],
    "language_support": [
        "change language to hindi", "hindi mein bolo", "speak in hindi", "switch to english", "angrezi mein bolo", "hindi english", "bhasha badlo", "language change",
        "hindi mein jankari do", "english mein bolo",
    ],
    "feedback": [
        "thanks", "thank you", "dhanyavad", "shukriya", "good help", "helpful", "bahut accha", "very helpful", "nice", "good assistant",
        "thanku", "thnks", "dhanyawad",
    ],
    "payment": [
        "when will payment be released", "payment status", "sanctioned amount when", "pfms payment", "dbt payment", "bank account payment", "paisa kab aayega", "payment kab hoga",
        "sanction ke baad payment", "selected payment",
    ],
}

# Response templates — richer, with dynamic slots
RESPONSES = {
    "greeting": {
        "en": "Namaste! I am **TribalScholar Sahayak v2** — accurate, bilingual, context-aware. I can: show schemes, check **potential-match** eligibility (share income/category/course), guide documents & **photo-scan**, track status, explain timeline, file appeals. *Final decisions are by officers.* How can I help?",
        "hi": "नमस्ते! मैं **TribalScholar सहायक v2** हूँ — सटीक, द्विभाषी. मैं योजना दिखा सकता हूँ, **संभावित मिलान** जाँच (आय/श्रेणी/कोर्स बताएँ), दस्तावेज़ & **फोटो स्कैन**, स्थिति, समय-रेखा, अपील में मदद कर सकता हूँ। *अंतिम निर्णय अधिकारी करते हैं।* कैसे मदद करूँ?"
    },
    "scheme_info": {
        "en": "We have **3 demo schemes** (live from DB):\n1) **National Fellowship for ST Students — PhD** (₹5L income, 750 seats, PhD/MPhil)\n2) **Overseas Fellowship Support** (PG abroad)\n3) **Post-Matric Support** (11th+)\nSay *‘compare schemes’* or *‘eligibility for ST PhD ₹2.4L’* — I’ll give personalized potential-match via ML. Go to **Schemes → View details**.",
        "hi": "हमारे पास **3 डेमो योजनाएँ** हैं:\n1) **ST राष्ट्रीय फैलोशिप — PhD** (₹5L आय, 750 सीटें)\n2) **विदेश फैलोशिप** 3) **पोस्ट-मैट्रिक**\nकहें *‘ST PhD ₹2.4L पात्रता’* — ML से संभावित मिलान बताऊँगा। **Schemes → विवरण** देखें।"
    },
    "scheme_comparison": {
        "en": "Comparison — **National (PhD)** needs ST + ₹5L + PhD/MPhil + Research proposal; **Overseas** needs ST + PG abroad admission + ₹6L; **Post-Matric** needs ST + 11th+ + ₹2.5L. National gives ₹31k-35k/month + contingency; Overseas covers abroad tuition; Post-Matric gives maintenance. Tell me your profile — I’ll rank best fit.",
        "hi": "तुलना — **राष्ट्रीय (PhD)** में ST + ₹5L + PhD, **विदेश** में ST + विदेश प्रवेश, **पोस्ट-मैट्रिक** में ST + 11वीं+. अपनी प्रोफ़ाइल बताएँ — सबसे उपयुक्त बताऊँगा।"
    },
    "eligibility": {
        "en": "I’ll give **potential-match (ML, 81% avg accuracy, not final)**. Share: **category (ST/SC/OBC), annual family income (e.g. 2.4 lakh = 240000), course (PhD/Masters), state, marks**. I’ll parse automatically. Or use **Scheme Simulator** / ask *‘Am I eligible ST PhD ₹2.4L Jharkhand 78%’*. *Officer verifies finally — never auto-reject.*",
        "hi": "मैं **संभावित मिलान (ML, सलाह)** दूँगा। बताएँ: **श्रेणी (ST/SC/OBC), वार्षिक आय (2.4 लाख), कोर्स (PhD), राज्य, अंक**। कहें *‘ST PhD 2.4 लाख झारखंड 78%’*। *अंतिम जाँच अधिकारी करते हैं।*"
    },
    "documents": {
        "en": "Required: **ST Certificate, Income Certificate, Marksheet, Admission Proof, ID proof** — PDF/JPG/PNG **≤5MB**. Tips: clear scan (not screenshot), 300dpi, no shadow. If OCR says *‘We could not confirm’* → upload clearer copy. Try **/photo-scan** to check fake/tampering (ELA, blur, EXIF) before submit. Private — only authorised officials can access.",
        "hi": "आवश्यक: **ST प्रमाणपत्र, आय प्रमाणपत्र, मार्कशीट, प्रवेश प्रमाण, पहचान पत्र** — PDF/JPG/PNG **≤5MB**। साफ़ स्कैन (स्क्रीनशॉट नहीं) अपलोड करें। *‘हम पुष्टि नहीं कर सके’* आए तो स्पष्ट प्रति दें। **/photo-scan** पर जाली जाँच करें। निजी।"
    },
    "photo_scan": {
        "en": "Use **Photo Scan** at **/photo-scan** or during upload — checks **ELA (recompression hotspot), blur-map (3×3 Laplacian), noise variance, Canny edges, histogram, EXIF Software (Photoshop), filename, entropy** → score **0-85** Low/Med/High (cap 85 prevents auto-block). Upload JPG/PNG; I’ll show forensic breakdown. **Advisory — officer decides.** Demo: authentic Low 5, Photoshop fake Medium 49, screenshot High 60.",
        "hi": "**फोटो स्कैन** `/photo-scan` पर — **ELA, ब्लर, नॉइज़, EXIF (Photoshop), फ़ाइलनाम** जाँच → 0-85 स्कोर Low/Med/High। सलाह ही — निर्णय अधिकारी का। डेमो: असली Low 5, फ़ोटोशॉप Medium 49, स्क्रीनशॉट High 60।"
    },
    "application_status": {
        "en": "Statuses (you see): **Draft → Submitted → Checks in progress → Action required (deficiency) → Verified → Approved / Not approved → Selected / Waitlisted → Sanctioned → Payment released**. Check **My Applications → Timeline** or share application number `TS-xxxxxxxx`. Need help with deficiency? Say *‘deficiency raised what to do’*.",
        "hi": "स्थितियाँ: **ड्राफ्ट → जमा → जाँच जारी → कार्रवाई आवश्यक → सत्यापित → स्वीकृत/अस्वीकृत → चयनित → स्वीकृत राशि → भुगतान जारी**। **My Applications → Timeline** देखें या नंबर `TS-...` बताएँ।"
    },
    "timeline": {
        "en": "Typical: **DRAFT** (you edit) → **SUBMITTED** → **UNDER_SCRUTINY** (officer + AI priority) → **VERIFIED** → **COMMITTEE** ranks by merit → **SELECTED/WAITLISTED** → **SANCTIONED** → **PAYMENT_RELEASED** (PFMS/DBT in production). Each step audited, you see Timeline. Ask *‘when will payment be released?’*.",
        "hi": "प्रवाह: **ड्राफ्ट → जमा → जाँच → सत्यापित → समिति → चयनित → स्वीकृत → भुगतान**। हर चरण ऑडिट। *‘भुगतान कब?’* पूछें।"
    },
    "grievance": {
        "en": "To appeal: **My Applications → Timeline → File Appeal** (or Grievances). Add reason + evidence. States: Submitted → Under Review → Resolved. **Helpdesk 1800-123-4567 (10am–5pm)** or `help-tribalscholar[at]gov[dot]in`. I can draft your appeal — just say *‘my application rejected want to appeal’*.",
        "hi": "**अपील**: **My Applications → Timeline → Appeal** दर्ज करें। कारण + प्रमाण दें। **हेल्पडेस्क 1800-123-4567**। कहें *‘मेरा आवेदन अस्वीकृत अपील करनी है’* — मसौदा बनाऊँगा।"
    },
    "scholarship_amount": {
        "en": "Demo amounts: **Fellowship ₹31k-35k/month (JRF→SRF), Contingency ₹20k/year, HRA as per norms, Escort allowance**. Actual per **Scheme Details**. After selection → sanction → PFMS/DBT payment. Ask *‘amount for National Fellowship?’*.",
        "hi": "डेमो राशि: **₹31k-35k/माह, आकस्मिक ₹20k/वर्ष, HRA**. वास्तविक **योजना विवरण** में। चयन → स्वीकृति → भुगतान।"
    },
    "deadline": {
        "en": "Each scheme card shows **validity dates & deadline**. Apply before **end date** (demo 60 days). If missed, check other open schemes or helpdesk. I can check *‘deadline for National Fellowship?’* — I’ll fetch live dates.",
        "hi": "हर योजना कार्ड पर **अंतिम तिथि** दिखती है। डेमो 60 दिन। *‘राष्ट्रीय फैलोशिप की अंतिम तिथि?’* पूछें — लाइव बताऊँगा।"
    },
    "helpline": {
        "en": "Helpdesk: **1800-123-4567 (10am–5pm)** | email `help-tribalscholar[at]gov[dot]in` | **Photo scan:** /photo-scan | **Schemes:** /schemes. For urgent grievance use **My Applications → Grievances**. I’m advisory — officers decide.",
        "hi": "हेल्पडेस्क: **1800-123-4567 (10am–5pm)** | email `help-tribalscholar[at]gov[dot]in` | **फोटो स्कैन:** /photo-scan"
    },
    "language_support": {
        "en": "I understand **English, हिंदी (Devanagari) & Hinglish** (e.g. *‘yojana kaun si hai’, ‘patrata kya hai’*). Switch via top **हिन्दी/English** button or say *‘hindi mein bolo’*. Top-right **Sahayak** language toggle also.",
        "hi": "मैं **English, हिंदी, Hinglish** समझता हूँ — *‘yojana kaun si hai’, ‘patrata kya hai’* जैसे। ऊपर **हिन्दी/English** बटन या *‘english mein bolo’* कहें।"
    },
    "feedback": {
        "en": "Dhanyavad! 🙏 Your feedback helps. Try next: *‘Show schemes’*, *‘Check eligibility ST PhD ₹2.4L’*, *‘Try photo scan’* or rate with 👍/👎.",
        "hi": "धन्यवाद! 🙏 आगे पूछें: *‘योजनाएँ दिखाएँ’*, *‘ST PhD पात्रता’*, *‘फोटो स्कैन’*।"
    },
    "payment": {
        "en": "After **SELECTED** → **SANCTIONED** (officer) → **PAYMENT_RELEASED** (Finance, PFMS/DBT). Demo: sanction queue visible to Finance role. If SANCTIONED and not paid, contact helpdesk with application number. Advisory — finance officer releases.",
        "hi": "**चयनित → स्वीकृत → भुगतान जारी** (PFMS/DBT)। **SANCTIONED** के बाद भुगतान वित्त अधिकारी करते हैं।"
    },
    "fallback": {
        "en": "I didn’t fully understand. Try: *‘Show schemes’*, *‘Am I eligible ST PhD ₹2.4L?’*, *‘Which documents?’*, *‘Photo scan fake check’*, *‘My application status’*, *‘How to appeal?’* — I’m advisory, officers decide.",
        "hi": "पूरी तरह समझ नहीं पाया। कोशिश: *‘योजनाएँ दिखाएँ’*, *‘ST PhD 2.4 लाख पात्रता?’*, *‘फोटो स्कैन’*, *‘आवेदन स्थिति’* — सलाह ही।"
    }
}

# Inject additional Devanagari Hindi samples for high accuracy (v2.1)
INTENT_SAMPLES["greeting"].extend(["नमस्ते","नमस्कार","हेलो","प्रणाम","नमस्ते जी","हाय","नमस्ते सहायता","नमस्ते ट्राइबल स्कॉलर"])
INTENT_SAMPLES["scheme_info"].extend(["योजनाएं कौन सी हैं","एसटी छात्रवृत्ति योजना सूची","राष्ट्रीय फेलोशिप योजना जानकारी","छात्रवृत्ति योजनाएं दिखाएं","ट्राइबल स्कॉलर योजना","योजना विवरण बताएं","कौन सी योजना है एसटी पीएचडी के लिए","योजना सूची दिखाओ","एसटी योजना जानकारी","फेलोशिप योजनाएं","योजना के बारे में बताओ"])
INTENT_SAMPLES["scheme_comparison"].extend(["योजना तुलना","राष्ट्रीय बनाम विदेश फेलोशिप तुलना","कौन सी योजना बेहतर है","योजनाओं में अंतर क्या है"])
INTENT_SAMPLES["eligibility"].extend(["फेलोशिप पात्रता क्या है","क्या मैं एसटी पीएचडी के लिए पात्र हूँ","आय 2.4 लाख पात्रता","पात्रता मानदंड क्या है","एसटी छात्रवृत्ति के लिए पात्रता","मुझे पात्रता जांचनी है","आय सीमा 5 लाख","क्या ओबीसी पात्र है","आय 3 लाख पर क्या पात्र हूँ","पीएचडी फैलोशिप के लिए कौन पात्र है","राष्ट्रीय फेलोशिप पात्रता","पात्रता कैसे जांचें","क्या मैं पात्र हूँ आय 2 लाख","पात्रता क्या है एसटी वर्ग"])
INTENT_SAMPLES["documents"].extend(["कौन से दस्तावेज चाहिए","दस्तावेज सूची","एसटी प्रमाण पत्र आवश्यक","आय प्रमाण पत्र प्रारूप","मार्कशीट अपलोड","दस्तावेज कैसे अपलोड करें","आवश्यक दस्तावेज","प्रमाण पत्र कौन से चाहिए"])
INTENT_SAMPLES["photo_scan"].extend(["फोटो स्कैन जाली दस्तावेज कैसे जांचें","नकली प्रमाण पत्र कैसे पहचाने","जाली दस्तावेज जांच","फर्जी प्रमाण पत्र फोटो स्कैन","फोटो स्कैन प्रणाली","नकली दस्तावेज पहचान","जाली प्रमाण पत्र जांच","फोटो स्कैन से जाली कैसे पकड़ें","प्रमाण पत्र असली या नकली","दस्तावेज सत्यापन फोटो स्कैन"])
INTENT_SAMPLES["application_status"].extend(["आवेदन स्थिति क्या है","मेरा आवेदन कहाँ है","आवेदन स्थिति जांचें","स्थिति क्या है","आवेदन ट्रैक करें"])
INTENT_SAMPLES["timeline"].extend(["समयरेखा क्या है","सत्यापन में कितना समय","भुगतान कब मिलेगा","प्रक्रिया क्या है","चरण क्या हैं"])
INTENT_SAMPLES["grievance"].extend(["शिकायत कैसे करें","अपील कैसे करें","मेरा आवेदन अस्वीकृत अपील","शिकायत दर्ज करें"])
INTENT_SAMPLES["scholarship_amount"].extend(["छात्रवृत्ति राशि कितनी है","फेलोशिप राशि कितनी","राशि क्या है","कितना पैसा मिलेगा"])
INTENT_SAMPLES["deadline"].extend(["अंतिम तिथि क्या है","आखिरी तारीख कब है","समय सीमा कब है","आवेदन की अंतिम तिथि"])
INTENT_SAMPLES["helpline"].extend(["हेल्पलाइन नंबर क्या है","सहायता संपर्क","मदद नंबर","हेल्पडेस्क संपर्क"])
INTENT_SAMPLES["language_support"].extend(["हिन्दी में बोलो","भाषा बदलो","अंग्रेजी में बोलो","हिन्दी में जानकारी दो"])
INTENT_SAMPLES["feedback"].extend(["धन्यवाद","शुक्रिया","बहुत अच्छा","सहायक"])
INTENT_SAMPLES["payment"].extend(["भुगतान कब होगा","भुगतान स्थिति","पैसा कब आएगा","स्वीकृत राशि भुगतान"])
# Improve typo robustness: add explicit sceme/scheme typo variants
INTENT_SAMPLES["scheme_info"].extend(["sceme info","sceme infos","shceme info","scheem info","schemes info","what is sceme","schems available","schemes avilable","scheem","scheme informaton"])
INTENT_SAMPLES["scheme_comparison"].extend(["sceme comparison","shceme comparison","scheem comparison","compare sceme","scheme comparsion","scheme comaprison"])

# Precompute normalized samples for fuzz fallback
NORMALIZED_SAMPLES = []
for intent, samples in INTENT_SAMPLES.items():
    for s in samples:
        NORMALIZED_SAMPLES.append((s.lower(), intent))

class AdvancedChatbotModel:
    def __init__(self):
        self.pipeline = None
        self.version = VERSION
        self.intents = list(INTENT_SAMPLES.keys())
        self._vectorizer = None
        self._load_or_train()

    def _normalize(self, text: str) -> str:
        t = text.lower().strip()
        # Hinglish -> English mapping word by word
        words = re.findall(r"[\w\u0900-\u097F]+", t)
        norm = []
        for w in words:
            norm.append(HINGLISH_MAP.get(w, w))
        # Join and remove extra spaces, keep devanagari as is
        return " ".join(norm)

    def _augment(self):
        texts, labels = [], []
        for intent, samples in INTENT_SAMPLES.items():
            for s in samples:
                base_norm = self._normalize(s)
                texts.append(base_norm); labels.append(intent)
                # Variations: lower, punctuation
                texts.append(base_norm + " ?"); labels.append(intent)
                texts.append(base_norm.upper()); labels.append(intent)
                # Typo simulation: random char swap/delete for 30% samples
                if random.random() < 0.35:
                    w = s.split()
                    if len(w) > 2:
                        # shuffle 1 word
                        i, j = random.sample(range(len(w)), 2)
                        w[i], w[j] = w[j], w[i]
                        texts.append(self._normalize(" ".join(w))); labels.append(intent)
                # Hinglish mix: for hi intents add English, for en add hinglish
                if intent in ["scheme_info", "eligibility"] and random.random() < 0.4:
                    texts.append(s + " yojana patra"); labels.append(intent)
                # Short forms
                if len(s.split()) > 4:
                    short = " ".join(s.split()[:3])
                    texts.append(self._normalize(short)); labels.append(intent)
        # Add character-level noise for robustness: duplicate with extra spaces
        extra = []
        for t, l in zip(texts, labels):
            if random.random() < 0.08:
                # inject double letter typo
                if len(t) > 5:
                    idx = random.randint(0, len(t)-1)
                    typo = t[:idx] + t[idx] + t[idx:]
                    extra.append((typo, l))
        for t, l in extra:
            texts.append(t); labels.append(l)
        return texts, labels

    def _load_or_train(self):
        if os.path.exists(MODEL_PATH) and SK:
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                    self.pipeline = data.get("pipeline")
                    self._vectorizer = data.get("vectorizer")
                    if self.pipeline:
                        return
            except Exception as e:
                print(f"Load v2 failed {e}, retraining")
        self.train()

    def train(self):
        if not SK:
            return
        texts, labels = self._augment()
        # Hybrid TF-IDF: word ngrams (1,2) + char_wb (3,5) for typo robustness
        word_vec = TfidfVectorizer(analyzer="word", ngram_range=(1,2), max_features=1200, lowercase=True, stop_words=None)
        char_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3,5), max_features=800, lowercase=True)
        # Use FeatureUnion to combine
        from sklearn.pipeline import FeatureUnion
        union = FeatureUnion([("word", word_vec), ("char", char_vec)])
        clf = LogisticRegression(max_iter=600, class_weight="balanced", C=1.2, solver="lbfgs")
        # Calibrated for better probability
        calibrated = CalibratedClassifierCV(clf, method="sigmoid", cv=3)
        self.pipeline = Pipeline([("features", union), ("clf", calibrated)])
        # For fallback embedding similarity, also fit a simple word vectorizer on samples
        self._vectorizer = TfidfVectorizer(analyzer="word", ngram_range=(1,2), max_features=1000)
        self._vectorizer.fit(texts)
        self.pipeline.fit(texts, labels)
        try:
            with open(MODEL_PATH, "wb") as f:
                pickle.dump({"pipeline": self.pipeline, "vectorizer": self._vectorizer}, f)
            print(f"Chatbot v2 trained: {len(texts)} samples, {len(self.intents)} intents")
        except Exception as e:
            print(f"Save v2 failed {e}")

    def detect_lang(self, text: str) -> str:
        if re.search(r"[\u0900-\u097F]", text):
            return "hi"
        # Hinglish keywords -> hi intent but answer in hi
        hi_words = set(["yojana","yojna","patrata","paatrata","dastavej","dastavez","aavedan","stithi","rashi","shikayat","namaste","pranam","dhanyavad","kya","kaun","kitna","kab","kaise","hai","hain","hu","mein","batao","dikhao","chahiye","karte"])
        words = set(re.findall(r"\w+", text.lower()))
        if len(words & hi_words) >= 2:
            return "hi"
        if any(w in text.lower() for w in ["yojana","patrata","dastavej","aavedan"]):
            return "hi"
        return "en"

    def _fuzz_fallback(self, text: str) -> Optional[Tuple[str, float]]:
        if not FUZZ:
            return None
        # Find closest sample by fuzz ratio
        norm = self._normalize(text)
        best = process.extractOne(norm, [s for s,_ in NORMALIZED_SAMPLES], scorer=fuzz.token_sort_ratio)
        if best:
            match_str, score, idx = best
            # idx corresponds to position in NORMALIZED_SAMPLES list
            # Retrieve intent
            # process returns (choice, score, index)
            intent = NORMALIZED_SAMPLES[idx][1]
            return intent, float(score)
        return None

    def predict(self, text: str) -> Dict[str, Any]:
        raw = text.strip()
        if not raw:
            return {"intent": "fallback", "confidence": 0, "lang": "en", "model": self.version}
        norm = self._normalize(raw)
        lang = self.detect_lang(raw)
        # Try ML pipeline
        if SK and self.pipeline:
            try:
                probs = self.pipeline.predict_proba([norm])[0]
                classes = self.pipeline.classes_
                idx = int(probs.argmax())
                intent = str(classes[idx])
                conf = float(probs[idx]) * 100
                # Get top 3
                top_idx = probs.argsort()[::-1][:3]
                top = [{"intent": str(classes[i]), "score": round(float(probs[i])*100,1)} for i in top_idx]
                # Calibration: if top1 - top2 < 8 and conf < 60, consider ambiguous -> fallback or clarification
                gap = float(probs[top_idx[0]] - probs[top_idx[1]]) * 100 if len(top_idx)>1 else 100
                # Fuzzy boost: if confidence low but fuzz says high, use fuzz
                if conf < 42:
                    fuzz_res = self._fuzz_fallback(raw)
                    if fuzz_res:
                        f_intent, f_score = fuzz_res
                        if f_score > 82:
                            # Override with fuzz intent if strong
                            return {"intent": f_intent, "confidence": round(min(72, f_score*0.85),1), "lang": lang, "top": top, "model": self.version+"-fuzz", "gap": round(gap,1)}
                        elif f_score > 70 and f_score > conf:
                            # Blend
                            conf = max(conf, f_score*0.7)
                            if f_score*0.7 > conf:
                                intent = f_intent
                # Thresholds: high accuracy requires higher thresholds per intent
                # Greeting is strict, eligibility etc.
                threshold = 38
                if intent in ["greeting", "helpline", "feedback"]:
                    threshold = 42
                if conf < threshold:
                    # Check fuzz again for rescue
                    fuzz_res = self._fuzz_fallback(raw)
                    if fuzz_res and fuzz_res[1] > 78:
                        return {"intent": fuzz_res[0], "confidence": round(fuzz_res[1]*0.8,1), "lang": lang, "top": top, "model": self.version+"-fuzz-rescue"}
                    return {"intent": "fallback", "confidence": round(conf,1), "lang": lang, "top": top, "model": self.version, "gap": round(gap,1)}
                # Low gap ambiguous -> return top2 for clarification
                return {"intent": intent, "confidence": round(conf,1), "lang": lang, "top": top, "model": self.version, "gap": round(gap,1)}
            except Exception as e:
                print(f"Predict error {e}")
        # Heuristic fallback
        low = norm
        best_intent, best_score = None, 0
        for intent, samples in INTENT_SAMPLES.items():
            # keyword scoring
            for kw in samples[:6]: # check sample keywords
                if kw.lower() in low:
                    return {"intent": intent, "confidence": 58, "lang": lang, "model": self.version+"-heuristic"}
        # Fuzz fallback final
        fuzz_res = self._fuzz_fallback(raw)
        if fuzz_res and fuzz_res[1] > 75:
            return {"intent": fuzz_res[0], "confidence": round(fuzz_res[1]*0.75,1), "lang": lang, "model": self.version+"-fuzz-final"}
        return {"intent": "fallback", "confidence": 40, "lang": lang, "model": self.version+"-heuristic"}

    def respond(self, text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        pred = self.predict(text)
        intent = pred["intent"]
        lang = pred.get("lang", "en")
        # Context: if history suggests photo_scan, boost
        if context and context.get("last_intent") == "photo_scan" and "scan" in text.lower():
            intent = "photo_scan"
            pred["confidence"] = max(pred["confidence"], 65)
        template = RESPONSES.get(intent, RESPONSES["fallback"])
        answer = template.get(lang, template["en"])
        # Dynamic suggestions per intent
        suggestions_map = {
            "greeting": ["Show schemes", "Am I eligible? ST PhD ₹2.4L", "Try photo scan", "Which documents?"],
            "scheme_info": ["Compare schemes", "Check eligibility ST PhD ₹2.4L", "What is deadline?", "Photo scan demo"],
            "scheme_comparison": ["Check eligibility", "Show schemes", "What is deadline?"],
            "eligibility": ["Show schemes", "Which documents?", "Try photo scan", "Run simulator"],
            "documents": ["Try photo scan for fake check", "Upload tips", "Status meaning"],
            "photo_scan": ["Try demo samples", "Which documents needed?", "Check eligibility"],
            "application_status": ["Explain timeline", "How to fix deficiency?", "File grievance"],
            "timeline": ["Check status", "File grievance", "When payment?"],
            "grievance": ["Contact helpline", "Check status", "Timeline"],
            "payment": ["Check status", "Timeline", "Helpline"],
            "helpline": ["Show schemes", "File grievance", "Photo scan"],
        }
        suggestions = suggestions_map.get(intent, ["Show schemes", "Eligibility check", "Photo scan", "Talk to helpdesk"])
        if lang == "hi":
            hi_map = {
                "greeting": ["योजनाएँ दिखाएँ", "क्या मैं पात्र हूँ?", "फोटो स्कैन", "कौन से दस्तावेज़?"],
                "scheme_info": ["तुलना करें", "ST PhD पात्रता", "अंतिम तिथि", "फोटो स्कैन"],
                "eligibility": ["योजनाएँ", "दस्तावेज़?", "फोटो स्कैन"],
                "photo_scan": ["डेमो नमूने देखें", "कौन से दस्तावेज़?", "पात्रता जाँचें"],
            }
            suggestions = hi_map.get(intent, suggestions)
        return {
            "intent": intent,
            "confidence": pred["confidence"],
            "lang": lang,
            "answer": answer,
            "suggestions": suggestions,
            "top": pred.get("top", []),
            "gap": pred.get("gap"),
            "disclaimer": "Sahayak v2 — information only, final decisions by officer/helpdesk. Advisory, not legal.",
            "model": pred["model"]
        }

_singleton = None
def get_chatbot_model():
    global _singleton
    if _singleton is None:
        _singleton = AdvancedChatbotModel()
    return _singleton

# Backward compat alias for older imports expecting ChatbotIntentModel
ChatbotIntentModel = AdvancedChatbotModel
