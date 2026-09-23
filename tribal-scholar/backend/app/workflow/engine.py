from typing import Optional, List, Dict

# Valid transitions map
VALID_TRANSITIONS = {
    "DRAFT": ["SUBMITTED"],
    "SUBMITTED": ["AUTOMATED_CHECK", "DEFICIENCY_RAISED"],
    "AUTOMATED_CHECK": ["DEFICIENCY_RAISED", "INSTITUTE_VERIFICATION", "OFFICER_SCRUTINY"],
    "DEFICIENCY_RAISED": ["RESUBMITTED", "REJECTED"],
    "RESUBMITTED": ["AUTOMATED_CHECK", "INSTITUTE_VERIFICATION"],
    "INSTITUTE_VERIFICATION": ["OFFICER_SCRUTINY", "DEFICIENCY_RAISED", "REJECTED"],
    "OFFICER_SCRUTINY": ["COMMITTEE_REVIEW", "DEFICIENCY_RAISED", "REJECTED"],
    "COMMITTEE_REVIEW": ["SELECTED", "WAITLISTED", "REJECTED"],
    "SELECTED": ["SANCTIONED", "REJECTED"],
    "WAITLISTED": ["SELECTED", "REJECTED"],
    "REJECTED": [],
    "SANCTIONED": ["PAYMENT_RELEASED"],
    "PAYMENT_RELEASED": ["FELLOWSHIP_MONITORING"],
    "FELLOWSHIP_MONITORING": []
}

ROLE_PERMISSIONS = {
    "DRAFT->SUBMITTED": ["applicant"],
    "SUBMITTED->AUTOMATED_CHECK": ["system", "scheme_officer", "district_officer", "super_admin"],
    "AUTOMATED_CHECK->INSTITUTE_VERIFICATION": ["system", "scheme_officer", "institute_verifier"],
    "AUTOMATED_CHECK->DEFICIENCY_RAISED": ["system", "scheme_officer", "district_officer", "institute_verifier"],
    "DEFICIENCY_RAISED->RESUBMITTED": ["applicant"],
    "INSTITUTE_VERIFICATION->OFFICER_SCRUTINY": ["institute_verifier", "super_admin"],
    "INSTITUTE_VERIFICATION->DEFICIENCY_RAISED": ["institute_verifier"],
    "OFFICER_SCRUTINY->COMMITTEE_REVIEW": ["district_officer", "scheme_officer", "super_admin"],
    "OFFICER_SCRUTINY->REJECTED": ["district_officer", "scheme_officer", "super_admin"],
    "OFFICER_SCRUTINY->DEFICIENCY_RAISED": ["district_officer", "scheme_officer"],
    "COMMITTEE_REVIEW->SELECTED": ["selection_committee", "super_admin"],
    "COMMITTEE_REVIEW->WAITLISTED": ["selection_committee", "super_admin"],
    "COMMITTEE_REVIEW->REJECTED": ["selection_committee", "super_admin"],
    "SELECTED->SANCTIONED": ["finance_officer", "super_admin"],
    "SANCTIONED->PAYMENT_RELEASED": ["finance_officer", "super_admin"],
    "PAYMENT_RELEASED->FELLOWSHIP_MONITORING": ["scheme_officer", "super_admin"],
}

def is_valid_transition(from_state: str, to_state: str) -> bool:
    return to_state in VALID_TRANSITIONS.get(from_state, [])

def get_allowed_roles(from_state: str, to_state: str) -> List[str]:
    key = f"{from_state}->{to_state}"
    return ROLE_PERMISSIONS.get(key, [])

def can_transition(from_state: str, to_state: str, user_roles: List[str]) -> (bool, str):
    if not is_valid_transition(from_state, to_state):
        return False, f"Invalid transition {from_state} -> {to_state}"
    allowed = get_allowed_roles(from_state, to_state)
    # system allowed transitions can be triggered by any officer in prototype? allow super_admin bypass
    if "super_admin" in user_roles:
        return True, "allowed"
    if not allowed:
        # If no explicit mapping, allow any officer?
        return False, f"No role permission defined for {from_state}->{to_state}"
    if "system" in allowed and to_state in ["AUTOMATED_CHECK", "INSTITUTE_VERIFICATION"]:
        # Allow officer roles to trigger system steps
        allowed.extend(["district_officer", "scheme_officer", "institute_verifier"])
    if any(r in user_roles for r in allowed):
        return True, "allowed"
    # Also allow applicant for specific
    if any(r in user_roles for r in allowed):
        return True, "allowed"
    return False, f"Role(s) {user_roles} not allowed for {from_state}->{to_state}, requires {allowed}"

def next_possible_states(current: str) -> List[str]:
    return VALID_TRANSITIONS.get(current, [])
