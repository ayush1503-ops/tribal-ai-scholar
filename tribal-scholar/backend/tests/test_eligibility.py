import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.services.eligibility import evaluate_rules, evaluate_custom_rules
from types import SimpleNamespace

def make_scheme():
    return SimpleNamespace(
        target_category="ST",
        income_limit=500000,
        age_min=18,
        age_max=35
    )

def test_eligibility_pass():
    scheme = make_scheme()
    applicant = {"category":"ST","annual_family_income":240000,"course":"PhD","dob":"1998-04-12"}
    app_data = {}
    result = evaluate_rules(scheme, app_data, applicant, ["st_certificate"])
    assert result["eligible"] == True
    assert any(r["result"]=="PASS" and "Category" in r["rule"] for r in result["results"])
    assert any(r["result"]=="PASS" and "Income" in r["rule"] for r in result["results"])

def test_eligibility_fail_category():
    scheme = make_scheme()
    applicant = {"category":"SC","annual_family_income":240000}
    result = evaluate_rules(scheme, {}, applicant, [])
    assert result["eligible"] == False

def test_eligibility_fail_income():
    scheme = make_scheme()
    applicant = {"category":"ST","annual_family_income":600000}
    result = evaluate_rules(scheme, {}, applicant, [])
    assert result["eligible"] == False

def test_custom_rules():
    rule = SimpleNamespace(field_key="category", operator="!=", value="ST", action="fail", message="Only ST")
    applicant = {"category":"ST"}
    res = evaluate_custom_rules([rule], {}, applicant, [])
    # category ST != ST is False, so no FAIL
    assert res[0]["result"]=="PASS"
    applicant2 = {"category":"SC"}
    res2 = evaluate_custom_rules([rule], {}, applicant2, [])
    assert res2[0]["result"]=="FAIL"

def test_fuzzy():
    from rapidfuzz import fuzz
    assert fuzz.ratio("Laxmi Hembram".lower(), "Laxmi Hembrom".lower()) > 85

if __name__=="__main__":
    test_eligibility_pass()
    test_eligibility_fail_category()
    test_eligibility_fail_income()
    test_custom_rules()
    test_fuzzy()
    print("All tests passed")
