"""
TribalScholar AI - ML package
Heuristic + sklearn models for eligibility, document classification,
verification priority, duplicate detection, and chatbot intent.
All models are synthetic-data only, advisory, human-in-loop.
"""
from .eligibility_model import EligibilityModel
from .document_classifier import DocumentClassifier
from .verification_priority_model import VerificationPriorityModel
from .chatbot_model import ChatbotIntentModel
from .fake_detector import FakeDocumentDetector

__all__ = ["EligibilityModel","DocumentClassifier","VerificationPriorityModel","ChatbotIntentModel","FakeDocumentDetector"]
