from rapidfuzz import fuzz
def compare_names(a:str,b:str)->dict:
    score=fuzz.ratio(a.strip().lower(),b.strip().lower())
    status="MATCH" if score>=90 else ("POSSIBLE_VARIATION" if score>=70 else "REVIEW")
    return {"score":score,"status":status,"human_review":status!="MATCH"}
