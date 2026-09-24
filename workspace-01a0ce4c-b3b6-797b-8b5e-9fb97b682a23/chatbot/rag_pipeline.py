#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PRODUCTION RAG PIPELINE for the SC/ST schemes dataset.

This is the "real" version of what chatbot/app.py does with TF-IDF, but using
embeddings + a vector store + an LLM. Copy this file into your project.

Three modes, pick by what you have:
  --mode local   sentence-transformers (multilingual, works offline, no API key) + numpy cosine search
  --mode openai  OpenAI embeddings + chat model           (needs OPENAI_API_KEY)
  --mode gemini  Google embeddings + chat model           (needs GEMINI_API_KEY)

Install (only what you use):
  pip install numpy openai
  pip install sentence-transformers          # for --mode local (large download, but free & offline)
  pip install chromadb                       # optional persistent vector DB instead of numpy
  pip install google-generativeai            # for --mode gemini

Index once (saves embeddings to disk), then query cheaply:
  python3 rag_pipeline.py --mode local  --index
  python3 rag_pipeline.py --mode local  --ask "SC student in Bihar, income 2 lakh, which scholarship?"
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAG_FILE = os.path.join(ROOT, "output", "sc_st_schemes_rag.jsonl")      # <- the file you embed
FAQ_FILE = os.path.join(ROOT, "output", "sc_st_schemes_faq_pairs.jsonl")  # optional extra recall
CACHE = os.path.join(HERE, "vector_store.json")

SYSTEM_PROMPT = """You are Scheme Saathi, an assistant on Indian Government schemes for Scheduled
Castes (SC), Scheduled Tribes (ST) and Particularly Vulnerable Tribal Groups (PVTG).
Rules:
1. Answer ONLY from the CONTEXT records. Never invent a scheme, amount, portal or deadline.
2. Always say whether the scheme is Central or State, and name the State for state schemes.
3. Quote income ceilings, age limits and amounts exactly as given. If a record says
   data_confidence is Medium, add: "as per the latest available notification - confirm on the portal".
4. If the context does not contain the answer, say so and ask for: category (SC/ST/PVTG),
   State/UT, education or business intent, and family annual income.
5. Respect privacy - never ask for Aadhaar, caste certificate numbers or bank details.
6. Reply in the user's language (English, Hindi or any Indian language). Indian number format.
7. End with the official portal link from the record.
Template: Scheme | Status (Central/State) | Who can apply | Benefit | Documents | Apply at | Note."""


# ---------------------------------------------------------------- load + embed
def load_records(with_faq: bool = True):
    docs = []
    for line in open(RAG_FILE, encoding="utf-8"):
        d = json.loads(line)
        docs.append({"id": d["id"], "text": d["text"], "metadata": d.get("metadata", {}),
                     "title": d["title"], "type": "scheme"})
    if with_faq and os.path.exists(FAQ_FILE):
        for line in open(FAQ_FILE, encoding="utf-8"):
            q = json.loads(line)
            docs.append({"id": q["scheme_id"], "text": f"Q: {q['question']}\nA: {q['answer']}",
                         "metadata": {}, "title": q["scheme_name"], "type": "faq"})
    return docs


def embed(texts, mode: str):
    if mode == "local":
        from sentence_transformers import SentenceTransformer           # type: ignore
        model = embed.model or SentenceTransformer("intfloat/multilingual-e5-small")
        embed.model = model
        return model.encode(texts, normalize_embeddings=True, batch_size=32).tolist()
    if mode == "openai":
        from openai import OpenAI                                        # type: ignore
        client = OpenAI()
        out = []
        for i in range(0, len(texts), 256):                              # batch to stay under limits
            resp = client.embeddings.create(model="text-embedding-3-small", input=texts[i:i + 256])
            out += [d.embedding for d in resp.data]
        return out
    raise SystemExit("gemini embeddings: use the google-generativeai SDK client.embed_content - "
                     "or switch to --mode openai / --mode local")


embed.model = None  # type: ignore


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


# ---------------------------------------------------------------- index
def build_index(mode: str):
    docs = load_records()
    print(f"Embedding {len(docs)} chunks with mode={mode} …")
    vecs = embed([d["text"] for d in docs], mode)
    json.dump({"mode": mode, "docs": docs, "vectors": vecs}, open(CACHE, "w"), ensure_ascii=False)
    print(f"Saved {CACHE}  (size {os.path.getsize(CACHE)/1024/1024:.1f} MB)")


def retrieve(question: str, k: int = 5, state: str | None = None, mode: str = "local"):
    store = json.load(open(CACHE, encoding="utf-8"))
    qv = embed([question], store["mode"] if store.get("mode") else mode)[0]
    scored = []
    for d, v in zip(store["docs"], store["vectors"]):
        if state and state.lower() not in (d["text"] or "").lower():
            continue
        scored.append((cosine(qv, v), d))
    scored.sort(key=lambda x: -x[0])
    return scored[:k]


# ---------------------------------------------------------------- answer
def answer(question: str, k: int = 4, state: str | None = None):
    hits = retrieve(question, k=k, state=state)
    context = "\n\n---\n\n".join(h[1]["text"] for h in hits)
    sources = sorted({h[1]["metadata"].get("source_1", "") for h in hits if h[1]["metadata"].get("source_1")})

    if os.environ.get("OPENAI_API_KEY"):
        from openai import OpenAI                                        # type: ignore
        client = OpenAI()
        r = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.1,
            messages=[{"role": "system", "content": SYSTEM_PROMPT},
                      {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {question}"}])
        text = r.choices[0].message.content
    elif os.environ.get("GEMINI_API_KEY"):
        import urllib.request
        model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        url = (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
               f"?key={os.environ['GEMINI_API_KEY']}")
        body = json.dumps({"system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                           "contents": [{"parts": [{"text": f"CONTEXT:\n{context}\n\nQUESTION: {question}"}]}],
                           "generationConfig": {"temperature": 0.1}}).encode()
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = json.loads(resp.read())["candidates"][0]["content"]["parts"][0]["text"]
    else:
        # no LLM configured -> return the retrieved records verbatim (still useful, never wrong)
        text = ("No LLM key configured, so here are the exact dataset records retrieved for your question:\n\n"
                + context)

    return {"answer": text, "sources": sources,
            "retrieved": [{"id": h[1]["id"], "title": h[1]["title"], "score": round(h[0], 3)} for h in hits]}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="local", choices=["local", "openai", "gemini"])
    ap.add_argument("--index", action="store_true", help="build/refresh the vector store")
    ap.add_argument("--ask", type=str, help="question to ask")
    ap.add_argument("--state", type=str, default=None)
    ap.add_argument("--k", type=int, default=4)
    a = ap.parse_args()
    if a.index:
        build_index(a.mode)
    if a.ask:
        out = answer(a.ask, k=a.k, state=a.state)
        print(out["answer"])
        print("\nRetrieved:", ", ".join(f"{r['title']} ({r['score']})" for r in out["retrieved"]))
