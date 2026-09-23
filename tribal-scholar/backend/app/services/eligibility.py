from typing import List, Dict, Any
from datetime import datetime, date
import re

def evaluate_rules(scheme, application_data: Dict[str, Any], applicant_profile: Dict[str, Any], documents_present: List[str]):
    """
    Deterministic eligibility engine
    Returns: {eligible: bool, status: str, results: [...], summary: str}
    """
    results = []
    overall_pass = True
    needs_deficiency = False
    needs_manual_review = False

    # Helper to get value
    def get_value(field_key: str):
        # check application_data, then applicant_profile
        if field_key in application_data:
            return application_data[field_key]
        if field_key in applicant_profile:
            return applicant_profile[field_key]
        # special keys
        if field_key == "category":
            return applicant_profile.get("category") or application_data.get("category")
        if field_key == "annual_family_income" or field_key == "annual_income":
            return applicant_profile.get("annual_family_income") or application_data.get("annual_family_income") or application_data.get("annual_income")
        if field_key == "course":
            return applicant_profile.get("course") or application_data.get("course")
        if field_key == "age":
            dob_str = applicant_profile.get("dob") or application_data.get("dob")
            if dob_str:
                try:
                    dob = datetime.fromisoformat(dob_str.replace("Z",""))
                    today = date.today()
                    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                    return age
                except:
                    return None
            return application_data.get("age")
        return None

    # Built-in checks based on scheme config
    # 1. Category check
    if scheme.target_category:
        actual = get_value("category")
        expected = scheme.target_category
        # target_category may be like "ST" or "ST,SC"
        allowed = [c.strip() for c in expected.split(",")]
        passed = actual in allowed if actual else False
        results.append({
            "rule": "Category Eligibility",
            "field": "category",
            "operator": "in",
            "expected": expected,
            "actual": actual,
            "result": "PASS" if passed else "FAIL",
            "explanation": f"Category '{actual}' is {'within' if passed else 'not within'} allowed categories {allowed}" if actual else "Category not provided",
            "action": "fail" if not passed else "pass"
        })
        if not passed:
            overall_pass = False

    # 2. Income limit
    if scheme.income_limit:
        actual = get_value("annual_family_income")
        try:
            actual_num = int(actual) if actual is not None else None
        except:
            actual_num = None
        passed = actual_num is not None and actual_num <= scheme.income_limit
        results.append({
            "rule": "Income Eligibility",
            "field": "annual_family_income",
            "operator": "<=",
            "expected": scheme.income_limit,
            "expected_display": f"₹{scheme.income_limit:,}",
            "actual": actual_num,
            "actual_display": f"₹{actual_num:,}" if actual_num else str(actual),
            "result": "PASS" if passed else "FAIL",
            "explanation": f"Applicant income ₹{actual_num:,} is {'within' if passed else 'above'} configured limit ₹{scheme.income_limit:,}" if actual_num else "Income not provided or invalid",
            "action": "fail" if not passed else "pass"
        })
        if not passed:
            overall_pass = False

    # 3. Age limits
    if scheme.age_min is not None or scheme.age_max is not None:
        actual_age = get_value("age")
        if actual_age is not None:
            try:
                actual_age = int(actual_age)
            except:
                actual_age = None
        if actual_age is not None:
            if scheme.age_max is not None and actual_age > scheme.age_max:
                results.append({
                    "rule": "Age Eligibility (Max)",
                    "field": "age",
                    "operator": "<=",
                    "expected": scheme.age_max,
                    "actual": actual_age,
                    "result": "MANUAL_REVIEW",
                    "explanation": f"Applicant age {actual_age} exceeds maximum {scheme.age_max}, requires manual review",
                    "action": "manual_review"
                })
                needs_manual_review = True
            elif scheme.age_min is not None and actual_age < scheme.age_min:
                results.append({
                    "rule": "Age Eligibility (Min)",
                    "field": "age",
                    "operator": ">=",
                    "expected": scheme.age_min,
                    "actual": actual_age,
                    "result": "FAIL",
                    "explanation": f"Applicant age {actual_age} below minimum {scheme.age_min}",
                    "action": "fail"
                })
                overall_pass = False
            else:
                results.append({
                    "rule": "Age Eligibility",
                    "field": "age",
                    "operator": "range",
                    "expected": f"{scheme.age_min} - {scheme.age_max}",
                    "actual": actual_age,
                    "result": "PASS",
                    "explanation": f"Age {actual_age} within allowed range",
                    "action": "pass"
                })
        else:
            results.append({
                "rule": "Age Eligibility",
                "field": "age",
                "operator": "present",
                "expected": "age provided",
                "actual": None,
                "result": "DEFICIENCY",
                "explanation": "Age/DOB not provided, cannot verify age eligibility",
                "action": "deficiency"
            })
            needs_deficiency = True

    # 4. Document missing checks - will be added via scheme_rules

    # Evaluate custom scheme_rules
    from ..models.models import SchemeRule
    # scheme.rules relationship may not be loaded; caller should provide
    custom_rules = getattr(scheme, 'custom_rules', []) if hasattr(scheme, 'custom_rules') else []
    # Try to get from scheme_rules table if available via argument
    # For now, we expect scheme object has rules attribute loaded separately

    return {
        "eligible": overall_pass and not needs_deficiency and not needs_manual_review,
        "status": "DEFICIENCY" if needs_deficiency else "MANUAL_REVIEW" if needs_manual_review else ("ELIGIBLE" if overall_pass else "INELIGIBLE"),
        "results": results,
        "summary": "Eligible" if overall_pass and not needs_deficiency else "Deficiency" if needs_deficiency else "Manual Review" if needs_manual_review else "Not Eligible"
    }

def evaluate_custom_rules(scheme_rules: List[Any], application_data: Dict[str, Any], applicant_profile: Dict[str, Any], documents_present: List[str]):
    results = []
    for rule in scheme_rules:
        field_key = rule.field_key
        operator = rule.operator
        value = rule.value
        action = rule.action
        # Resolve actual
        if field_key == "required_document":
            # value is document key
            actual_present = value in documents_present if value else False
            if operator == "missing":
                passed = not actual_present
                # If missing, then deficiency
                results.append({
                    "rule": f"Required Document: {value}",
                    "field": field_key,
                    "operator": operator,
                    "expected": value,
                    "actual": "present" if actual_present else "missing",
                    "result": "DEFICIENCY" if passed else "PASS",
                    "explanation": f"Document '{value}' is {'missing' if passed else 'provided'}",
                    "action": action if passed else "pass"
                })
            continue
        # Generic field evaluation
        actual = application_data.get(field_key) or applicant_profile.get(field_key)
        # Normalize
        expected = value
        result = "PASS"
        explanation = ""
        passed = True
        try:
            if operator == "=":
                passed = str(actual) == str(expected)
                explanation = f"Field '{field_key}' value '{actual}' {'matches' if passed else 'does not match'} expected '{expected}'"
            elif operator == "!=":
                passed = str(actual) != str(expected)
                explanation = f"Field '{field_key}' value '{actual}' {'differs' if passed else 'equals'} '{expected}'"
            elif operator == "<=":
                passed = float(actual) <= float(expected) if actual is not None else False
                explanation = f"{actual} <= {expected} is {passed}"
            elif operator == ">=":
                passed = float(actual) >= float(expected) if actual is not None else False
                explanation = f"{actual} >= {expected} is {passed}"
            elif operator == "<":
                passed = float(actual) < float(expected) if actual is not None else False
                explanation = f"{actual} < {expected} is {passed}"
            elif operator == ">":
                passed = float(actual) > float(expected) if actual is not None else False
                explanation = f"{actual} > {expected} is {passed}"
            elif operator == "in":
                allowed = [v.strip() for v in expected.split(",")]
                passed = str(actual) in allowed
                explanation = f"'{actual}' in {allowed} is {passed}"
            elif operator == "not_in":
                allowed = [v.strip() for v in expected.split(",")]
                passed = str(actual) not in allowed
                explanation = f"'{actual}' not in {allowed} is {passed}"
            elif operator == "contains":
                passed = expected.lower() in str(actual).lower() if actual else False
                explanation = f"'{expected}' in '{actual}' is {passed}"
            elif operator == "missing":
                passed = actual is None or str(actual).strip() == ""
                explanation = f"Field '{field_key}' is {'missing' if passed else 'present'}"
            else:
                passed = True
                explanation = f"Unknown operator {operator}"
        except Exception as e:
            passed = False
            explanation = f"Evaluation error: {e}"

        # Invert logic: if rule action is fail and passed means fail?
        # Our convention: rule defines condition that if true, then action applies
        # So we report result accordingly
        if passed:
            if action == "fail" or action == "ineligible":
                result = "FAIL"
            elif action == "deficiency":
                result = "DEFICIENCY"
            elif action == "manual_review":
                result = "MANUAL_REVIEW"
            else:
                result = "PASS"  # eligible condition met
        else:
            result = "PASS" if action in ["eligible","pass"] else "PASS"

        results.append({
            "rule": getattr(rule, 'message', None) or f"{field_key} {operator} {value}",
            "field": field_key,
            "operator": operator,
            "expected": expected,
            "actual": actual,
            "result": result,
            "explanation": explanation,
            "action": action
        })
    return results
