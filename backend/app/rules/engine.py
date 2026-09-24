def evaluate_eligibility(scheme, values, uploaded_documents):
    results=[]; eligible=True
    if values.get("category") != "ST":
        results.append({"rule":"category","result":"FAIL","message":"Applicant category is not ST."}); eligible=False
    else:
        results.append({"rule":"category","result":"PASS","message":"Category requirement satisfied."})
    income=values.get("annual_income")
    if scheme.income_limit is not None and income is not None:
        if float(income)>scheme.income_limit:
            results.append({"rule":"income","result":"FAIL","message":f"Income exceeds INR {scheme.income_limit:,.0f}."}); eligible=False
        else: results.append({"rule":"income","result":"PASS","message":"Income is within configured limit."})
    missing=[d.key for d in scheme.documents if d.required and d.key not in uploaded_documents]
    results.append({"rule":"documents","result":"DEFICIENT" if missing else "PASS",
                    "message":"Missing: "+", ".join(missing) if missing else "Required documents uploaded."})
    return {"eligible_by_rules":eligible,"results":results}
