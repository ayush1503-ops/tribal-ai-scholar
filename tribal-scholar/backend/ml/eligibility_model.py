"""
Eligibility predictor - synthetic ML advisory (not deterministic engine)
Deterministic engine remains source of truth; this model gives Potential Match score.
"""
import numpy as np
import os, pickle, random
from typing import Dict, Any, List

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    SK_AVAILABLE = True
except ImportError:
    SK_AVAILABLE = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "eligibility_model.pkl")

class EligibilityModel:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = ["income_ratio","category_match","course_match","age_ok","marks_norm","is_ST"]
        self.version = "eligibility-v1-synthetic"
        self.trained = False
        self._load_or_train()

    def _synthetic_data(self, n=800):
        X=[]; y=[]
        for _ in range(n):
            income_ratio = random.uniform(0.2, 1.6)  # income / limit
            category_match = random.choice([0,1,1,1])  # weighted
            course_match = random.choice([0,1,1])
            age_ok = random.choice([0,1,1,1])
            marks = random.uniform(45, 92)
            marks_norm = marks/100
            is_ST = 1 if random.random()>0.3 else 0
            # label heuristic
            eligible = 1 if (income_ratio<=1.0 and category_match==1 and course_match==1 and age_ok==1) else 0
            # add noise 8%
            if random.random()<0.08:
                eligible = 1-eligible
            X.append([income_ratio, category_match, course_match, age_ok, marks_norm, is_ST])
            y.append(eligible)
        return np.array(X), np.array(y)

    def _load_or_train(self):
        if os.path.exists(MODEL_PATH) and SK_AVAILABLE:
            try:
                with open(MODEL_PATH,"rb") as f:
                    data=pickle.load(f)
                    self.model=data["model"]; self.scaler=data["scaler"]
                    self.trained=True
                    return
            except: pass
        self.train()

    def train(self):
        if not SK_AVAILABLE:
            self.trained=False
            return
        X,y=self._synthetic_data()
        self.scaler=StandardScaler()
        Xs=self.scaler.fit_transform(X)
        self.model=LogisticRegression(max_iter=400)
        self.model.fit(Xs,y)
        self.trained=True
        try:
            with open(MODEL_PATH,"wb") as f:
                pickle.dump({"model":self.model,"scaler":self.scaler},f)
        except: pass

    def predict(self, features: Dict[str,Any]) -> Dict[str,Any]:
        """
        features: income, income_limit, category, target_category, course, allowed_courses, age, marks
        Returns advisory score + explanation, never final decision.
        """
        income = float(features.get("income",0) or 0)
        limit = float(features.get("income_limit",500000) or 500000)
        income_ratio = income/limit if limit>0 else 1.0
        category_match = 1 if str(features.get("category","")).upper()==str(features.get("target_category","ST")).upper() else 0
        allowed = features.get("allowed_courses") or []
        course = str(features.get("course",""))
        course_match = 1 if not allowed or course in allowed else 0
        age_ok = 1 if features.get("age_ok", True) else 0
        marks = float(features.get("marks",70) or 70)
        marks_norm = marks/100 if marks>1 else marks
        is_ST = 1 if str(features.get("category","")).upper()=="ST" else 0
        vec = np.array([[income_ratio, category_match, course_match, age_ok, marks_norm, is_ST]])
        if self.trained and SK_AVAILABLE:
            xs=self.scaler.transform(vec)
            prob = float(self.model.predict_proba(xs)[0][1])
            pred = int(prob>0.5)
        else:
            # fallback heuristic
            score = 0
            if income_ratio<=1: score+=0.3
            if category_match: score+=0.25
            if course_match: score+=0.2
            if age_ok: score+=0.15
            if marks_norm>0.6: score+=0.1
            prob = min(0.95, max(0.05, score))
            pred = 1 if prob>0.5 else 0

        label = "Potential match" if pred==1 else "Additional check needed"
        # explain
        reasons=[]
        if income_ratio>1:
            reasons.append(f"Income ₹{income:,.0f} above limit ₹{limit:,.0f}")
        elif income_ratio<=1:
            reasons.append(f"Income within limit ({income_ratio:.2f}×)")
        if not category_match:
            reasons.append(f"Category {features.get('category')} may not match {features.get('target_category')}")
        else:
            reasons.append("Category matches scheme")
        if not course_match:
            reasons.append(f"Course {course} not in {allowed} - verify")
        confidence = round(55 + prob*35,1)  # 55-90 range
        # Clamp advisory: never 100% fraud
        return {
            "model": self.version,
            "prediction": pred,
            "label": label,
            "probability": round(prob,3),
            "confidence": confidence,
            "reasons": reasons,
            "features": dict(zip(self.feature_names, vec[0].tolist())),
            "disclaimer": "Advisory only - final eligibility decided by officer after verification."
        }

# singleton
_elig_model=None
def get_eligibility_model():
    global _elig_model
    if _elig_model is None:
        _elig_model=EligibilityModel()
    return _elig_model
