from .models import Scheme, SchemeField, SchemeDocument

SCHEMES = [Scheme(
 id="nfst-demo-2026",
 name="National Fellowship for ST Students — Demo",
 description="Synthetic configurable fellowship scheme.",
 income_limit=500000,
 fields=[
  SchemeField(key="category",label="Category",field_type="select",options=["ST","SC","OBC","General"]),
  SchemeField(key="annual_income",label="Annual family income (INR)",field_type="number"),
  SchemeField(key="research_area",label="Research area"),
  SchemeField(key="course",label="Course / Programme"),
  SchemeField(key="age",label="Age",field_type="number")
 ],
 documents=[
  SchemeDocument(key="caste_certificate",label="ST Certificate"),
  SchemeDocument(key="income_certificate",label="Income Certificate"),
  SchemeDocument(key="marksheet",label="Marksheet"),
  SchemeDocument(key="admission_proof",label="Admission / Institute Proof")
 ],
 score_weights={"academic":40,"research":25,"institution":15,"need":10,"interview":10}
)]

APPLICATIONS = [{
 "id":"APP-1001","applicant_name":"Laxmi Hembram","scheme_id":"nfst-demo-2026",
 "status":"INSTITUTE_VERIFICATION",
 "values":{"category":"ST","annual_income":240000,"research_area":"Tribal education","course":"PhD","age":27},
 "documents":["caste_certificate","income_certificate","marksheet","admission_proof"],
 "flags":["Name spelling variation: Hembrom / Hembram — manual review"],
 "risk_score":20,"merit_score":82
}]
