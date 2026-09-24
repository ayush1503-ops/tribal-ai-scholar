from fastapi import APIRouter,HTTPException
from ..data import APPLICATIONS,SCHEMES
from ..models import ApplicationCreate,StatusUpdate
from ..rules.engine import evaluate_eligibility
router=APIRouter(tags=["applications"])
@router.get("/applications")
def list_applications(): return APPLICATIONS
@router.get("/applications/{application_id}")
def get_application(application_id:str):
    a=next((x for x in APPLICATIONS if x["id"]==application_id),None)
    if not a: raise HTTPException(404,"Application not found")
    return a
@router.post("/applications")
def create_application(p:ApplicationCreate):
    if not any(s.id==p.scheme_id for s in SCHEMES): raise HTTPException(404,"Scheme not found")
    a={"id":f"APP-{1001+len(APPLICATIONS)}","applicant_name":p.applicant_name,"scheme_id":p.scheme_id,
       "status":"DRAFT","values":p.values,"documents":[],"flags":[],"risk_score":0,"merit_score":None}
    APPLICATIONS.append(a); return a
@router.post("/applications/{application_id}/evaluate")
def evaluate(application_id:str):
    a=next((x for x in APPLICATIONS if x["id"]==application_id),None)
    if not a: raise HTTPException(404,"Application not found")
    s=next(s for s in SCHEMES if s.id==a["scheme_id"])
    return evaluate_eligibility(s,a["values"],a["documents"])
@router.patch("/applications/{application_id}/status")
def update_status(application_id:str,p:StatusUpdate):
    a=next((x for x in APPLICATIONS if x["id"]==application_id),None)
    if not a: raise HTTPException(404,"Application not found")
    a["status"]=p.status; a.setdefault("status_history",[]).append({"status":p.status,"reason":p.reason})
    return a
