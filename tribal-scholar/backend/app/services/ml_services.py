"""
Unified ML services wrapper - exposes all models to routes.
Advisory only, with human-in-loop.
"""
from typing import Dict, Any
from ml.eligibility_model import get_eligibility_model
from ml.document_classifier import get_document_classifier
from ml.verification_priority_model import get_verification_model
from ml.fairness_model import get_fairness_model

class MLServices:
    def __init__(self):
        self.eligibility=get_eligibility_model()
        self.doc_classifier=get_document_classifier()
        self.verification=get_verification_model()
        self.fairness=get_fairness_model()

    def eligibility_check(self, features: Dict[str,Any]) -> Dict[str,Any]:
        return self.eligibility.predict(features)

    def classify_document(self, text:str, filename:str) -> Dict[str,Any]:
        return self.doc_classifier.predict(text, filename)

    def verification_priority(self, features: Dict[str,Any]) -> Dict[str,Any]:
        return self.verification.predict(features)

    def fairness_audit(self, stats: Dict[str,Any]) -> Dict[str,Any]:
        return self.fairness.audit(stats)

_singleton=None
def get_ml_services():
    global _singleton
    if _singleton is None:
        _singleton=MLServices()
    return _singleton
