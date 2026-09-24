"""
Verification priority regressor - predicts 0-100 priority (advisory, not fraud score)
Features: quality_flag_count, quality_penalty, duplicate_score, mismatch_score, low_confidence_fields, doc_count_missing, days_to_deadline, resubmission_count
Never outputs fraud confirmed - only low/medium/high with reasons.
"""
import os, pickle, random
from typing import Dict, Any, List

try:
    import numpy as np
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import StandardScaler
    SK=True
except ImportError:
    SK=False

MODEL_PATH=os.path.join(os.path.dirname(__file__),"verification_model.pkl")

class VerificationPriorityModel:
    def __init__(self):
        self.model=None
        self.scaler=None
        self.version="verification-v1-rf"
        self.feature_names=["quality_count","quality_penalty","duplicate_score","mismatch","low_conf","missing_docs","deadline_pressure","resubmissions"]
        self._load_or_train()

    def _synthetic(self, n=700):
        X=[]; y=[]
        for _ in range(n):
            qc = random.randint(0,4)
            qp = qc*random.randint(8,15)
            dup = random.uniform(0,1) if random.random()<0.2 else random.uniform(0,0.3)
            mismatch = random.uniform(0,1) if random.random()<0.15 else random.uniform(0,0.25)
            lowconf = random.randint(0,3)
            missing = random.randint(0,2)
            deadline = random.uniform(0,1) # 1 = urgent
            resub = random.randint(0,2)
            # heuristic priority
            score = qp*0.6 + dup*25 + mismatch*30 + lowconf*7 + missing*14 + deadline*8 + resub*5
            score += random.uniform(-6,6)
            score = max(8, min(92, score))
            X.append([qc, qp, dup, mismatch, lowconf, missing, deadline, resub])
            y.append(score)
        return np.array(X), np.array(y)

    def _load_or_train(self):
        if os.path.exists(MODEL_PATH) and SK:
            try:
                import pickle
                with open(MODEL_PATH,"rb") as f:
                    d=pickle.load(f); self.model=d["model"]; self.scaler=d["scaler"]; return
            except: pass
        self.train()

    def train(self):
        if not SK:
            return
        X,y=self._synthetic()
        self.scaler=StandardScaler()
        Xs=self.scaler.fit_transform(X)
        self.model=RandomForestRegressor(n_estimators=80, max_depth=8, random_state=42)
        self.model.fit(Xs,y)
        try:
            with open(MODEL_PATH,"wb") as f:
                pickle.dump({"model":self.model,"scaler":self.scaler},f)
        except: pass

    def _level(self, score):
        if score<30: return "Low"
        if score<60: return "Medium"
        if score<80: return "High"
        return "High"

    def predict(self, features: Dict[str,Any]) -> Dict[str,Any]:
        qc=int(features.get("quality_count",0))
        qp=int(features.get("quality_penalty", qc*10))
        dup=float(features.get("duplicate_score",0))
        mismatch=float(features.get("mismatch",0))
        lowconf=int(features.get("low_confidence_fields",0))
        missing=int(features.get("missing_docs",0))
        deadline=float(features.get("deadline_pressure",0.2))
        resub=int(features.get("resubmissions",0))
        if self.model and SK:
            vec=np.array([[qc, qp, dup, mismatch, lowconf, missing, deadline, resub]])
            xs=self.scaler.transform(vec)
            score=float(self.model.predict(xs)[0])
        else:
            score = qp*0.55 + dup*22 + mismatch*28 + lowconf*6 + missing*12 + deadline*6 + resub*4 + random.uniform(-4,4)
        score=max(5, min(95, score))
        level=self._level(score)
        reasons=[]
        if qp>20: reasons.append({"factor":"Document quality","detail":f"{qc} quality notes, penalty {qp}"})
        if dup>0.6: reasons.append({"factor":"Possible duplicate","detail":f"Similarity {dup:.2f} with another application"})
        if mismatch>0.5: reasons.append({"factor":"Information mismatch","detail":"Name or DOB variation between form and document"})
        if lowconf>1: reasons.append({"factor":"Low OCR confidence","detail":f"{lowconf} fields below 80% confidence"})
        if missing>0: reasons.append({"factor":"Missing documents","detail":f"{missing} required document(s) not yet uploaded"})
        if not reasons:
            reasons.append({"factor":"General review","detail":"Standard verification checklist"})
        # advisory
        if score>=80:
            rec="Additional verification recommended before decision"
        elif score>=60:
            rec="Manual verification suggested"
        elif score>=30:
            rec="Standard review"
        else:
            rec="Routine check"
        return {
            "model": self.version,
            "score": round(score,1),
            "level": level,
            "recommendation": rec,
            "reasons": reasons,
            "features": dict(zip(self.feature_names, vec[0].tolist())),
            "disclaimer": "Advisory priority only - human officer decides. Never auto-reject."
        }

_singleton=None
def get_verification_model():
    global _singleton
    if _singleton is None:
        _singleton=VerificationPriorityModel()
    return _singleton
