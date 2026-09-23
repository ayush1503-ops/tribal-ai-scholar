"""
Document type classifier - TF-IDF + LogisticRegression on synthetic OCR text.
Classes: st_certificate, income_certificate, marksheet, admission_proof, id_proof
"""
import os, pickle, random
from typing import Dict, Any

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    SK_AVAILABLE=True
except ImportError:
    SK_AVAILABLE=False

MODEL_PATH=os.path.join(os.path.dirname(__file__),"doc_classifier.pkl")

SYNTHETIC_CORPUS={
    "st_certificate":[
        "Scheduled Tribe Certificate Government of Jharkhand issued by District Collector Tribe certificate number ST number validity",
        "Caste Certificate Tribe ST Community certificate Ranchi issuing authority Collector tribe",
        "Tribe certificate ST Jharkhand community scheduled tribe valid certificate number issuing authority"
    ],
    "income_certificate":[
        "Income Certificate annual family income Rs. 240000 issued by Tehsildar parent income certificate number",
        "Family income certificate income 240000 financial year Tehsildar block income proof",
        "Annual income certificate income details father parent income Rs. certificate issued"
    ],
    "marksheet":[
        "Marksheet Ranchi University marks 78.5% CGPA semester examination roll number year education",
        "Academic transcript marks obtained percentage university college examination result marksheet",
        "University marksheet marks CGPA grade examination roll number institution Ranchi"
    ],
    "admission_proof":[
        "Admission Proof Ranchi University PhD Anthropology admission number admission date institute provisional admission",
        "Bonafide Certificate admission proof university college course admission date admission number",
        "Admission letter institute admission proof course department admission date admission number"
    ],
    "id_proof":[
        "Aadhaar Identity proof date of birth address identity number government of India UIDAI",
        "Identity proof voter id address proof government identity card date of birth"
    ]
}

class DocumentClassifier:
    def __init__(self):
        self.pipeline=None
        self.version="doc-classifier-v1-tfidf"
        self.labels=list(SYNTHETIC_CORPUS.keys())
        self._load_or_train()

    def _synthetic_texts(self, n_per=60):
        texts=[]; labels=[]
        for label, bases in SYNTHETIC_CORPUS.items():
            for _ in range(n_per):
                base=random.choice(bases)
                # augment
                words=base.split()
                if random.random()<0.3:
                    words+=["certificate","2024","Jharkhand","ST" if label=="st_certificate" else "income" if label=="income_certificate" else "university"]
                random.shuffle(words)
                texts.append(" ".join(words[: random.randint(8,18)]))
                labels.append(label)
        return texts, labels

    def _load_or_train(self):
        if os.path.exists(MODEL_PATH) and SK_AVAILABLE:
            try:
                with open(MODEL_PATH,"rb") as f:
                    self.pipeline=pickle.load(f)
                    return
            except: pass
        self.train()

    def train(self):
        if not SK_AVAILABLE:
            return
        texts, labels=self._synthetic_texts()
        self.pipeline=Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1,2), max_features=600)),
            ("clf", LogisticRegression(max_iter=500))
        ])
        self.pipeline.fit(texts, labels)
        try:
            with open(MODEL_PATH,"wb") as f:
                pickle.dump(self.pipeline,f)
        except: pass

    def predict(self, text: str, filename: str="") -> Dict[str,Any]:
        text_low=(text+" "+filename).lower()
        # quick filename heuristic fallback
        fname_hint=None
        if any(k in filename.lower() for k in ["tribe","st","caste"]): fname_hint="st_certificate"
        elif "income" in filename.lower(): fname_hint="income_certificate"
        elif any(k in filename.lower() for k in ["mark","sheet","transcript","academic"]): fname_hint="marksheet"
        elif any(k in filename.lower() for k in ["admission","bonafide","admit"]): fname_hint="admission_proof"

        if self.pipeline and SK_AVAILABLE:
            try:
                probs=self.pipeline.predict_proba([text_low])[0]
                classes=self.pipeline.classes_
                idx=probs.argmax()
                label=str(classes[idx])
                confidence=float(probs[idx])
                # top2
                top = sorted(zip(classes, probs), key=lambda x: -x[1])[:3]
                # if filename hint disagrees strongly but confidence low, keep hint as alternative
                return {
                    "model": self.version,
                    "predicted": label,
                    "confidence": round(confidence*100,1),
                    "top_candidates": [{"label": str(k), "score": round(float(v)*100,1)} for k,v in top],
                    "filename_hint": fname_hint,
                    "needs_review": confidence<0.62,
                    "disclaimer": "Advisory classification - officer verifies document type."
                }
            except Exception as e:
                pass
        # fallback heuristic
        scores={l:0 for l in self.labels}
        for lbl, keywords in {
            "st_certificate":["tribe","st","caste","collector","scheduled"],
            "income_certificate":["income","tehsildar","family","annual","rs"],
            "marksheet":["mark","university","cgpa","percentage","roll","semester"],
            "admission_proof":["admission","bonafide","course","phd","admission number"],
            "id_proof":["aadhaar","identity","voter","uidai"]
        }.items():
            for kw in keywords:
                if kw in text_low: scores[lbl]+=1
        label=max(scores, key=scores.get)
        conf= 62 if scores[label]>0 else 38
        if fname_hint:  # boost if matches
            if fname_hint==label: conf=min(88, conf+18)
        return {
            "model": self.version+"-heuristic",
            "predicted": label,
            "confidence": conf,
            "top_candidates": sorted([{"label":k,"score":v*12} for k,v in scores.items()], key=lambda x: -x["score"])[:3],
            "filename_hint": fname_hint,
            "needs_review": conf<60,
            "disclaimer": "Heuristic classification - officer verifies."
        }

_singleton=None
def get_document_classifier():
    global _singleton
    if _singleton is None:
        _singleton=DocumentClassifier()
    return _singleton
