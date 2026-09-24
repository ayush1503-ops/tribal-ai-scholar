"""
Unified ML services wrapper - exposes all models to routes.
Advisory only, with human-in-loop.
Resilient to missing sklearn/scipy on Vercel.
"""
from typing import Dict, Any
import os

def _safe_import(module_path, getter_name, fallback_class):
    try:
        mod = __import__(module_path, fromlist=[getter_name])
        getter = getattr(mod, getter_name)
        return getter()
    except Exception as e:
        print(f"ML import warning {module_path}.{getter_name}: {e}")
        return fallback_class()

class _FallbackModel:
    def predict(self, *args, **kwargs):
        return {"predicted": "unknown", "confidence": 50, "needs_review": True, "fallback": True, "message": "ML model not available - using heuristic fallback"}
    def audit(self, stats):
        return {"fairness_score": 75, "issues": [], "fallback": True, "message": "Fairness model fallback"}

class MLServices:
    def __init__(self):
        # Lazy load with fallback
        try:
            from ml.eligibility_model import get_eligibility_model
            self.eligibility = get_eligibility_model()
        except Exception as e:
            print(f"Eligibility model fallback: {e}")
            self.eligibility = _FallbackModel()
        
        try:
            from ml.document_classifier import get_document_classifier
            self.doc_classifier = get_document_classifier()
        except Exception as e:
            print(f"Doc classifier fallback: {e}")
            self.doc_classifier = _FallbackModel()
            
        try:
            from ml.verification_priority_model import get_verification_model
            self.verification = get_verification_model()
        except Exception as e:
            print(f"Verification model fallback: {e}")
            self.verification = _FallbackModel()
            
        try:
            from ml.fairness_model import get_fairness_model
            self.fairness = get_fairness_model()
        except Exception as e:
            print(f"Fairness model fallback: {e}")
            self.fairness = _FallbackModel()

    def eligibility_check(self, features: Dict[str,Any]) -> Dict[str,Any]:
        try:
            return self.eligibility.predict(features)
        except Exception as e:
            return {"eligible": True, "confidence": 50, "fallback": True, "error": str(e)[:100]}

    def classify_document(self, text:str, filename:str) -> Dict[str,Any]:
        try:
            return self.doc_classifier.predict(text, filename)
        except Exception as e:
            return {"predicted": filename.split(".")[-1] if "." in filename else "document", "confidence": 50, "fallback": True}

    def verification_priority(self, features: Dict[str,Any]) -> Dict[str,Any]:
        try:
            return self.verification.predict(features)
        except Exception as e:
            return {"priority": 50, "level": "Medium", "fallback": True}

    def fairness_audit(self, stats: Dict[str,Any]) -> Dict[str,Any]:
        try:
            return self.fairness.audit(stats)
        except Exception as e:
            return {"fairness_score": 75, "issues": [], "fallback": True}

_singleton=None
def get_ml_services():
    global _singleton
    if _singleton is None:
        _singleton=MLServices()
    return _singleton

