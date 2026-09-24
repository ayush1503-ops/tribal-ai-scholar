from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from ..core.database import get_db
from ..core.security import get_current_user_optional
from ..services.chatbot_service import get_chatbot_service

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []
    lang: Optional[str] = None  # en / hi

class ChatResponse(BaseModel):
    answer: str
    intent: str
    confidence: float
    lang: str
    suggestions: List[str]
    schemes: List[dict]
    kb_hits: List[dict]
    advisory: Optional[dict] = None
    entities: Optional[dict] = None
    context: Optional[dict] = None
    evidence: List[str]
    disclaimer: str
    model: str
    clarifying: Optional[str] = None
    top: Optional[List[dict]] = None

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user_optional)):
    svc = get_chatbot_service()
    result = svc.chat(db, req.message, history=req.history, user_lang=req.lang, current_user=current_user)
    return result

@router.get("/suggestions")
def suggestions(lang: str = "en"):
    svc = get_chatbot_service()
    return {"lang": lang, "suggestions": svc.suggestions(lang)}

@router.get("/health")
def health():
    from ml.chatbot_model import VERSION
    return {"status":"ok","service":"chatbot","model":VERSION,"advisory":True,"acc":"~88% synthetic","intents":15}

@router.get("/kb")
def kb():
    from ..services.chatbot_service import KB
    return {"count": len(KB), "items": KB}

@router.get("/debug/intent")
def debug_intent(message: str):
    from ml.chatbot_model import get_chatbot_model
    m = get_chatbot_model()
    return m.predict(message)
