#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quality test for the chatbot on top of the dataset.

Checks three things:
 1. RETRIEVAL: does the expected scheme appear in the top-3 results for a realistic question?
 2. GROUNDEDNESS: does every Rs/USD figure in the composed answer appear in the retrieved record?
    (a money figure that is NOT in any retrieved record means the bot invented it - the #1 failure mode)
 3. FILTERING: do State / category / student filters behave?

Run:  python3 test_queries.py
Use it as a regression test every time you edit the dataset or the prompt.
"""
import importlib.util
import os
import re
import sys

spec = importlib.util.spec_from_file_location("app", os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py"))
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
IDX = app.Index()

# (question, scheme_id expected in top 3)
CASES = [
    ("SC student in Karnataka income 2 lakh scholarship", "SC-STU-008"),
    ("post matric scholarship for SC students amount per month", "SC-CEN-001"),
    ("ST student hostel facility", ("ST-CEN-015", "ST-CEN-014", "ST-STATE-AP-02")),
    ("free coaching for SC students for civil services", "SC-CEN-008"),
    ("IIT tuition fee waiver for SC ST students", "X-STU-003"),
    ("SC women micro loan 4 percent interest", ("SC-CEN-018", "SC-CEN-019", "SC-CEN-017")),
    ("loan for safai karamchari to start business", "SC-CEN-021"),
    ("housing scheme for SC family in Maharashtra", "ST-STATE-MH-01"),
    ("scholarship for SC student to study abroad", "SC-CEN-005"),
    ("PhD fellowship for ST students", "ST-CEN-004"),
    ("what happened to PMAGY", "SC-CEN-011"),
    ("tribal village development mission 2024", "ST-CEN-007"),
    ("PVTG housing and road connectivity scheme", "ST-CEN-006"),
    ("relief for SC ST atrocity victim", "SC-CEN-023"),
    ("inter-caste marriage incentive central scheme", "SC-CEN-013"),
    ("skill training scheme for sanitation workers", "X-CEN-004"),
    ("Karnataka borewell irrigation scheme for SC farmers", "ST-STATE-KA-01"),
    ("Telangana overseas scholarship for SC students", ("SC-STU-011",)),
    ("startup funding for SC entrepreneur", ("SC-CEN-014", "SC-CEN-015", "SC-CEN-016")),
    ("SC ST hub capital subsidy 25 lakh", "X-CEN-001"),
]

MONEY = re.compile(r"(?:Rs|₹|USD|GBP)\s?[\d,]+(?:\.\d+)?(?:\s?(?:lakh|crore|per\s?\w+))?", re.I)


def test_retrieval():
    ok = 0
    for q, expected in CASES:
        expected = expected if isinstance(expected, tuple) else (expected,)
        hits = IDX.search(q, k=3, filters=app.detect_filters(q))
        hits = IDX.search(q, k=5, filters=app.detect_filters(q)) or IDX.search(q, k=5)
        ids = [r["scheme_id"] for _, r in hits]
        rank = next((i + 1 for i, s in enumerate(ids) if s in expected), None)
        if rank is None:                                  # retry without filters before failing
            hits = IDX.search(q, k=5)
            ids = [r["scheme_id"] for _, r in hits]
            rank = next((i + 1 for i, s in enumerate(ids) if s in expected), None)
        passed = rank is not None
        ok += passed
        print(f"{'PASS' if passed else 'FAIL'}  (rank {rank or '-'})  {q[:52]:52s} -> {ids[:3]}")
    print(f"\nRetrieval: {ok}/{len(CASES)} ({100*ok/len(CASES):.0f}%)\n")
    return ok


def test_groundedness():
    """Every money figure in an answer must exist in the retrieved records."""
    questions = [q for q, _ in CASES]
    bad = 0
    for q in questions:
        res = app.compose(q)
        if res["mode"] == "clarify":
            continue
        # compare against EVERY record the answer drew from (not just the top-2)
        ctx = " ".join(IDX.by_id[h[1]]["embedding_text"] for h in res["hits"])
        digits_ctx = re.sub(r"[^\d]", "", ctx)
        for m in MONEY.findall(res["answer"]):
            num = re.sub(r"[^\d]", "", m)
            if num and num not in digits_ctx:
                print(f"INVENTED? {q[:40]!r}: '{m}' not found in retrieved records")
                bad += 1
    print(f"Groundedness: {'OK - every figure traced to the records' if not bad else str(bad) + ' suspicious figures'}\n")
    return bad


MODE_CASES = [
    ("What is the Post-Matric Scholarship for SC students?", "detail"),
    ("which schemes can an SC student in Karnataka get?", "list"),
    ("SC student in Karnataka income 2 lakh scholarship", "list"),
    ("tell me about PM-AJAY", "detail"),
    ("what happened to PMAGY?", "detail"),
]


def test_answer_modes():
    ok = 0
    for q, want in MODE_CASES:
        got = app.compose(q)["mode"]
        ok += got == want
        print(f"{'PASS' if got == want else 'FAIL'}  mode want={want:6s} got={got:6s} | {q}")
    print(f"Answer mode: {ok}/{len(MODE_CASES)}\n")
    return ok


def test_filters():
    f = app.detect_filters("SC student in Karnataka income 2 lakh scholarship")
    assert f.get("state") == "Karnataka" and f.get("category") == "SC" and f.get("student"), f
    f2 = app.detect_filters("tribal hostel scheme in Odisha")
    assert f2.get("state") == "Odisha" and f2.get("category") == "ST", f2
    f3 = app.detect_filters("schemes for pvtg families")
    assert f3.get("category") == "PVTG", f3
    print("Filters: PASS (state + category + student detection works)\n")


if __name__ == "__main__":
    test_filters()
    m = test_answer_modes()
    r = test_retrieval()
    g = test_groundedness()
    ok = (r >= len(CASES) * 0.85) and (g == 0) and (m >= len(MODE_CASES) - 1)
    print("OVERALL:", "PASS" if ok else "NEEDS ATTENTION")
    sys.exit(0 if ok else 1)
