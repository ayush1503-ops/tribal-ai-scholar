from fastapi import APIRouter,HTTPException
from ..data import SCHEMES
from ..models import Scheme
router=APIRouter(tags=["schemes"])
@router.get("/schemes")
def list_schemes(): return SCHEMES
@router.get("/schemes/{scheme_id}")
def get_scheme(scheme_id:str):
    for s in SCHEMES:
        if s.id==scheme_id:return s
    raise HTTPException(404,"Scheme not found")
@router.post("/admin/schemes")
def create_scheme(scheme:Scheme):
    SCHEMES.append(scheme); return scheme
