"""
Train all ML models and show metrics - synthetic demo.
Run: python -m ml.train_all  or  python ml/train_all.py
"""
from .eligibility_model import get_eligibility_model
from .document_classifier import get_document_classifier
from .verification_priority_model import get_verification_model
from .chatbot_model import get_chatbot_model
from .fake_detector import get_fake_detector

def train_all():
    print("Training TribalScholar ML models (synthetic)...")
    e=get_eligibility_model()
    print(f" - Eligibility: {e.version} trained={e.trained}")
    d=get_document_classifier()
    print(f" - Document classifier: {d.version} labels={d.labels}")
    v=get_verification_model()
    print(f" - Verification priority: {v.version}")
    c=get_chatbot_model()
    print(f" - Chatbot intent: {c.version} intents={c.intents}")
    f=get_fake_detector()
    print(f" - Fake detector: {f.version} (ELA, blur-map, noise, edges, histogram, EXIF, entropy)")
    # quick demos
    print("\nDemo inferences:")
    print(" Eligibility ST PhD ₹2.4L:", e.predict({"income":240000,"income_limit":500000,"category":"ST","target_category":"ST","course":"PhD","allowed_courses":["PhD","MPhil"],"age_ok":True,"marks":78}))
    print(" Doc classify 'ST Certificate Tribe':", d.predict("Scheduled Tribe Certificate Government of Jharkhand Collector", "st_certificate.pdf"))
    print(" Priority:", v.predict({"quality_count":1,"duplicate_score":0.72,"mismatch":0.68}))
    print(" Chatbot 'what schemes available?':", c.respond("what schemes are available for st phd?"))
    # Fake detector demo on synthetic files if exist
    import os
    for p in ["/tmp/authentic2.jpg","/tmp/fake_high.jpg"]:
        if os.path.exists(p):
            with open(p,"rb") as fh:
                b=fh.read()
            r=f.scan(content_bytes=b, filename=os.path.basename(p), doc_type_hint="st_certificate")
            print(f" Fake scan {os.path.basename(p)}: {r['score']} {r['level']} — {r['verdict'][:60]}")
    print("\nAll models ready - advisory only, human decides.")

if __name__=="__main__":
    train_all()
