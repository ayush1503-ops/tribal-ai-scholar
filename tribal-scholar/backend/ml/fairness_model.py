"""
Fairness audit helper - not a classifier, computes disparity metrics advisory.
"""
from typing import Dict, Any, List
import random

class FairnessModel:
    version="fairness-v1-advisory"
    def audit(self, stats: Dict[str,Any]) -> Dict[str,Any]:
        """
        stats: {by_category:{ST:{applied, selected, rate}}, by_state:{...}, by_gender:{...}}
        Returns advisory metrics, no auto decision.
        """
        # dummy if not provided: generate
        if not stats:
            stats={
                "by_category":{"ST":{"applied":320,"selected":118},"SC":{"applied":210,"selected":64},"OBC":{"applied":180,"selected":52}},
                "by_state":{"Jharkhand":{"applied":220,"selected":85},"Odisha":{"applied":180,"selected":62},"Chhattisgarh":{"applied":150,"selected":48}},
            }
        # compute selection rates
        def rates(d):
            out={}
            for k,v in d.items():
                applied=v.get("applied",1); selected=v.get("selected",0)
                rate=selected/max(1,applied)
                out[k]={"applied":applied,"selected":selected,"rate":round(rate,3)}
            return out
        by_cat=rates(stats.get("by_category",{}))
        by_state=rates(stats.get("by_state",{}))
        # disparity: max-min rate
        def disparity(r):
            vals=[v["rate"] for v in r.values()]
            return round(max(vals)-min(vals),3) if vals else 0
        cat_disp=disparity(by_cat)
        state_disp=disparity(by_state)
        flags=[]
        if cat_disp>0.08:
            flags.append({"type":"category disparity","detail":f"Selection rate gap {cat_disp:.1%} across categories - review criteria","severity":"medium"})
        if state_disp>0.09:
            flags.append({"type":"geography disparity","detail":f"Gap {state_disp:.1%} across states - check access/outreach","severity":"low"})
        if not flags:
            flags.append({"type":"no major disparity","detail":"Rates within expected range - continue monitoring","severity":"info"})
        return {
            "model": self.version,
            "by_category": by_cat,
            "by_state": by_state,
            "disparity":{"category_gap":cat_disp, "state_gap":state_disp},
            "flags": flags,
            "disclaimer": "Advisory audit only - human reviewer interprets. Monitor thresholds configurable."
        }

_singleton=None
def get_fairness_model():
    global _singleton
    if _singleton is None:
        _singleton=FairnessModel()
    return _singleton
