# How to connect your SC/ST dataset to an AI chatbot

Your dataset is the **knowledge**. A chatbot needs three layers:

```
   ┌──────────────┐    retrieve the 3-5 most relevant    ┌───────────────┐
   │  YOUR DATA   │ ───────────── records ─────────────▶  │   LLM         │ ──▶ answer
   │ (100 schemes)│                                       │ (GPT/Gemini/  │
   └──────────────┘                                       │  Llama etc.)  │
          ▲                                               └───────────────┘
          └── this is what stops the model from inventing amounts ──┘
```

Never paste the whole dataset into a prompt in production (it drifts, it costs money, and the model
starts "improving" figures). **Retrieve first, then generate.** That is the difference between a
chatbot that says "₹1,200/month" and one that invents "₹2,000/month".

---

## 1. Which file do I feed the chatbot?

| File | Use it for |
|---|---|
| `output/sc_st_schemes_rag.jsonl` | **Best for AI chatbots.** One JSON object per scheme, each with a pre-written natural-language `text` field. This is the file you embed / upload. |
| `output/student_schemes_rag.jsonl` | Same, but only the 58 student/education schemes. Use if your bot is a scholarship-only bot. |
| `output/sc_st_schemes_dataset.csv` / `.xlsx` | Uploading to no-code tools (Custom GPT, NotebookLM, Chatbase) where a spreadsheet is accepted. |
| `output/sc_st_schemes_faq_pairs.jsonl` | Fine-tuning or few-shot examples (482 ready Q&A pairs). |
| `output/chatbot_system_prompt.md` | Copy the system prompt into your bot's instructions. |

---

## 2. Four ways to connect it (easiest → most control)

### Path 1 — No-code upload (5–15 minutes, ₹0)
Best if you want something working today without writing code.

**ChatGPT Custom GPT**
1. chatgpt.com → *Explore GPTs* → **Create** → *Configure*.
2. Paste the contents of `chatbot_system_prompt.md` into **Instructions**.
3. *Knowledge* → upload `sc_st_schemes_dataset.csv` (or the `.xlsx`). Keep "Code Interpreter & Data Analysis" ON so it can query the table.
4. Test with: *"SC student in Bihar, income 2 lakh, which scholarship?"*

**Google Gemini Gems / AI Studio** or **NotebookLM** — create a Gem, upload the CSV, paste the same instructions. NotebookLM gives you citations back to the exact row, which is excellent for a government bot.

**No-code chatbot platforms (Chatbase, Botsonic, Poe, Botpress, Voiceflow)**
1. Create a bot → *Knowledge base* → upload the JSON/CSV file.
2. Set "answer only from knowledge base" / temperature ≈ 0.1.
3. Paste the system prompt.
4. Embed the widget on a website or connect WhatsApp.

⚠️ Limits: no control over retrieval quality, no metadata filters ("only Karnataka schemes"), and these tools re-chunk your data in ways that can split a scheme across chunks. Fine for pilots, not for scale.

---

### Path 2 — LLM API with built-in file search (1–2 hours, low code)
Let the provider handle embeddings + retrieval.

**OpenAI (Responses API)**
```python
from openai import OpenAI
client = OpenAI()

# 1) upload the dataset once, keep the file id
f = client.files.create(file=open("output/sc_st_schemes_rag.jsonl", "rb"), purpose="assistants")

# 2) create a vector store and index the file
vs = client.vector_stores.create(name="sc-st-schemes")
client.vector_stores.files.create(vector_store_id=vs.id, file_id=f.id)

# 3) ask questions - retrieval happens automatically
def ask(q):
    r = client.responses.create(
        model="gpt-4o-mini",
        instructions=open("output/chatbot_system_prompt.md").read(),
        input=q,
        tools=[{"type": "file_search", "vector_store_ids": [vs.id]}],
    )
    print(r.output_text)
    return r

ask("I am an ST student in Odisha, income 1.5 lakh. Which hostel or scholarship scheme applies?")
```

**Google Gemini (Files API + grounding)**
```python
import google.generativeai as genai
genai.configure(api_key="YOUR_KEY")
doc = genai.upload_file("output/sc_st_schemes_dataset.csv")   # or the JSONL
model = genai.GenerativeModel("gemini-2.0-flash",
        system_instruction=open("output/chatbot_system_prompt.md").read())
print(model.generate_content(["ST student hostel scheme in Odisha?", doc]).text)
```

Pros: ~10 lines of code, managed infra, citations included.
Cons: you cannot tune the retrieval, no state/category filters, and the provider's chunker decides what "one scheme" means.

---

### Path 3 — Real RAG with a vector DB (recommended for production)
You control chunking, filters, prompts, cost and logging. A working template is in this workspace:
**`chatbot/rag_pipeline.py`**. Run it now:

```bash
cd chatbot
pip install numpy openai                       # or: pip install sentence-transformers (free, offline)
python3 rag_pipeline.py --mode local  --index                      # embed all 100 schemes + 482 Q&As
python3 rag_pipeline.py --mode local  --ask "SC student in Bihar, income 2 lakh, which scholarship?"
```

What it does, step by step:

1. **Chunk** — every scheme is already one clean chunk (`text` field). Good chunking is 80% of RAG quality; that work is already done for you.
2. **Embed** — pick a model:
   | Model | Notes |
   |---|---|
   | OpenAI `text-embedding-3-small` | cheap (~$0.02 per million tokens), English-first |
   | Gemini `text-embedding-004` | cheap, good multilingual |
   | `intfloat/multilingual-e5-small` (sentence-transformers) | **free, offline, handles Hindi/regional text** |
   | `Cohere embed-multilingual-v3` | strong multilingual |
3. **Store** — FAISS/Chroma for a demo, **pgvector** (Postgres) or Pinecone/Qdrant for production. 100 records is tiny; even a JSON file of vectors works (that is what the template does).
4. **Retrieve + filter** — top-k (k = 4–6) plus metadata filters from your dataset columns:
   ```python
   where = {"state_ut": "Karnataka", "is_student_scheme": "Yes", "category": "SC"}   # metadata filter
   hits = collection.query(query_embeddings=[qv], n_results=5, where=where)
   ```
   These filters are why this dataset is chatbot-ready: the model can be forced to answer **only**
   for the user's state and category.
5. **Generate** — send the retrieved records + the system prompt to the LLM:
   ```
   SYSTEM: answer only from CONTEXT, quote income ceilings exactly, say Central vs State,
           add "confirm on the portal" when data_confidence = Medium ...
   USER:   CONTEXT: <4 retrieved records>
           QUESTION: <user's question>
   ```
6. **Return with citations** — `metadata.source_1` gives you the official link to show the user.

**Swapping pieces later:** vector DB and embedding model are interchangeable; keep the *record* and *prompt* stable.

---

### Path 4 — Fine-tuning (only if you need a specific style or language)
Fine-tuning teaches **style**, retrieval supplies **facts**. Do not fine-tune to teach it scheme amounts — those change every budget.

```bash
# convert the Q&A pairs into chat format for OpenAI fine-tuning
python3 - <<'EOF'
import json
out = open("finetune_train.jsonl", "w")
for line in open("output/sc_st_schemes_faq_pairs.jsonl"):
    q = json.loads(line)
    out.write(json.dumps({"messages": [
        {"role": "system", "content": "You are Scheme Saathi, answering on Indian SC/ST welfare schemes."},
        {"role": "user", "content": q["question"]},
        {"role": "assistant", "content": q["answer"]},
    ]}, ensure_ascii=False) + "\n")
out.close()
EOF
# keep 20% of schemes OUT of training as a hallucination test set
```
Best combined with Path 3: fine-tuned model for tone, RAG for facts.

---

## 3. The live demo already running in this workspace

`chatbot/app.py` is a complete, dependency-free chatbot over your dataset (no API key needed):

```bash
cd chatbot && python3 app.py --port 8000        # http://localhost:8000
```

It exposes a small JSON API you can point any front-end, WhatsApp bot or IVR at:

| Endpoint | Method | What it does |
|---|---|---|
| `/` | GET | The chat UI |
| `/api/chat` | POST | `{"question": "...", "state": "", "category": ""}` → `{answer, hits, mode, filters}` |
| `/api/search?q=hostel+odisha` | GET | Raw retrieval (top 10 with scores) - useful for autocomplete |
| `/api/states` | GET | State list for dropdowns |
| `/api/stats` | GET | 100 schemes / 58 student schemes / LLM mode on-off |

**Turn the same file into an LLM chatbot** — just add a key, nothing else changes:
```bash
export OPENAI_API_KEY=sk-...        # or: export GEMINI_API_KEY=...
python3 app.py --port 8000
```
Now retrieval still comes from your dataset (so the facts are right) and the LLM only rewrites the answer in fluent Hinglish/Hindi/Tamil.

**Quality harness:** `python3 test_queries.py` checks
(1) retrieval — is the right scheme in the top 5 for 20 realistic questions,
(2) **groundedness** — does every ₹ figure in the answer exist in the retrieved records?
Current score: **20/20 retrieval, 0 invented figures.** Re-run it after every dataset edit.

**WhatsApp / website wiring (1 day of work)**
```
WhatsApp Cloud API / Twilio / Gupshup webhook  ──▶  POST /api/chat  ──▶  reply text
```
Website: the same POST from a small JS widget (the demo page's `ask()` function is ~15 lines).

---

## 4. Deployment checklist (the part people skip)

1. **Ground every answer.** Retrieve first; instruct "answer only from CONTEXT"; if nothing matches, ask the 4 clarifying questions (category, State, need, income) instead of guessing.
2. **Say Central vs State.** Most wrong answers come from quoting a central norm for a state scheme, or the reverse.
3. **Flag uncertain figures.** `data_confidence = Medium` → the bot must say "as per the latest notification — confirm on the portal" and give `application_portal`.
4. **Never ask for Aadhaar/caste certificate numbers.** Only ask for eligibility facts.
5. **Refresh cadence.** Amounts, income ceilings and portals change every Budget/financial year. Re-verify the `Medium` records quarterly; re-run `test_queries.py` after any edit.
6. **Log questions that retrieve nothing** — that list is your content roadmap (missing state scheme, missing scheme type).
7. **Add a disclaimer** in the UI: "Information compiled from official sources; verify on the official portal before applying."
8. **Multilingual** — use a multilingual embedding model and instruct the bot to answer in the user's language; keep amounts in Indian format.
9. **Accessibility** — WhatsApp and IVR reach the citizens who need these schemes most; a website alone will not.

---

## 5. Cost and latency (rough, for 100 schemes)

| Stack | Cost per 1,000 questions | Latency |
|---|---|---|
| Rules + TF-IDF only (this demo) | ₹0 | ~50 ms |
| Multilingual embeddings + free/local LLM (Ollama, Llama 3.1) | ₹0 (your server) | 2–6 s |
| OpenAI `text-embedding-3-small` + `gpt-4o-mini` | ≈ $0.15–0.40 | 1–3 s |
| Gemini embeddings + `gemini-2.0-flash` | ≈ $0.05–0.15 | 1–3 s |

Because the dataset is small, the entire retrieval step costs almost nothing — the LLM call dominates.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Bot invents amounts | No retrieval; whole file stuffed in prompt; temperature too high | Use RAG top-k, temperature ≤ 0.2, and add the "answer only from CONTEXT" rule |
| Gives a Telangana scheme to a Bihar user | No state filter | Filter by `state_ut` **and** keep `level = Central` results (central schemes apply everywhere) |
| Says "PMAGY is running" | Only current schemes indexed | Your dataset already marks predecessor/successor — instruct the bot to check `status` first |
| Mixes up pre-matric and post-matric | Chunks too large / merged | Keep one scheme per chunk (the `text` field is exactly one scheme) |
| Hindi question gets an English answer | English-only embedding model | Switch to a multilingual embedding model and instruct "reply in the user's language" |
| Student misses an existing scheme | FAQ-only index | Index both scheme texts and FAQ pairs (the demo indexes both, with FAQ weight 1.35) |
| Answers "I don't know" too often | Threshold too high / poor synonyms | Lower the threshold, add the user's phrasing as an alias in `dataset/*.py`, rebuild |

---

## 7. Fastest route, by what you have

| You have | Do this |
|---|---|
| Nothing but a browser | **Path 1**: Custom GPT / Gemini Gem + `sc_st_schemes_dataset.csv` + `chatbot_system_prompt.md` |
| An API key | **Path 2** (~25 lines) or **Path 3** with `chatbot/rag_pipeline.py` |
| A server + developer | **Path 3** with pgvector, metadata filters, logging, WhatsApp hook |
| A need for Hindi/regional + your own voice | **Path 3 + Path 4** (RAG for facts, fine-tune for tone) |

Whatever you choose, keep this invariant: **retrieve from the dataset → generate from the retrieved records → cite the portal.**
