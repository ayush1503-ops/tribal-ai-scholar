from fastapi import APIRouter
from ..data import SCHEMES,APPLICATIONS
router=APIRouter(tags=["admin"])
@router.get("/admin/dashboard")
def dashboard(): return {"active_schemes":len(SCHEMES),"applications":len(APPLICATIONS),"ai_mode":"advisory","human_final_decision":True}
@router.get("/admin/audit")
def audit(): return [{"event":"APPLICATION_SUBMITTED","application":"APP-1001"},{"event":"OCR_FLAG","application":"APP-1001","reason":"Name spelling variation"},{"event":"OFFICER_REVIEW","application":"APP-1001"}]
