from fastapi import APIRouter,HTTPException
from ..data import APPLICATIONS
from ..models import Decision
router=APIRouter(tags=["officer"])
@router.get("/officer/queue")
def queue(): return [a for a in APPLICATIONS if a["status"] in {"INSTITUTE_VERIFICATION","OFFICER_SCRUTINY","COMMITTEE_REVIEW"}]
@router.post("/officer/applications/{application_id}/decision")
def decision(application_id:str,p:Decision):
    a=next((x for x in APPLICATIONS if x["id"]==application_id),None)
    if not a: raise HTTPException(404,"Application not found")
    a["officer_decision"]={"decision":p.decision,"reason":p.reason,"officer":p.officer}; a["status"]=p.decision
    return a
