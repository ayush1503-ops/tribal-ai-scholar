# SC / ST Government Schemes Dataset (for an AI chatbot)

Compiled: 2026-09-23 | Records: **100 schemes** | Q&A pairs: **482**

Covers SC (Scheduled Caste) and ST (Scheduled Tribe), including PVTG-focused and cross-cutting
schemes, from **historical schemes going back to the 1940s-1970s through to schemes launched in
2026**, plus the **currently active** flagship schemes.

## Files

| File | What it is | Best used for |
|---|---|---|
| `output/sc_st_schemes_dataset.csv` | Flat table, 39 fields + embedding text | Excel/Sheets review, bulk editing |
| `output/sc_st_schemes_dataset.json` | Same records as JSON | Loading into an app / DB |
| `output/sc_st_schemes_rag.jsonl` | One JSON object per scheme with a ready-to-embed `text` paragraph | RAG (LangChain/LlamaIndex/pgvector) |
| `output/student_schemes_sc_st.csv` | **Student/education-only extract (58 schemes)** | Scholarship chatbot, admission counselling bot |
| `output/student_schemes_rag.jsonl` | Same student schemes, RAG-ready | Education-focused RAG index |
| `output/sc_st_schemes_faq_pairs.csv/.jsonl` | Auto-derived question-answer pairs (4-6 per scheme) | Fine-tuning, evaluation, few-shot prompts |
| `output/SC_ST_Schemes_Dataset.xlsx` | Workbook with 7 sheets: Student Schemes, All Schemes, Chatbot Q&A Pairs, Timeline 2015-2026, Historical & Merged, Field Dictionary, Stats | Review by a non-technical team, quick filtering |
| `output/chatbot_system_prompt.md` | Ready-to-paste system prompt + guardrails + few-shot examples | Wiring the chatbot |
| `dataset/*.py` | Source data modules (edit here, then re-run `build.py`) | Adding or updating schemes |

## Coverage at a glance

- **Student / education schemes: 58 of 100** (58% of the dataset) - scholarships,
  fee reimbursement, fee waivers, coaching, hostels, fellowships, education loans and overseas study.
- Category: {'SC': 32, 'SC & ST': 47, 'ST': 19, 'PVTG': 2}
- Level: {'Central': 57, 'State': 43}
- Focus area: {'Student / Education': 58, 'Housing': 5, 'Livelihood & Enterprise': 27, 'Infrastructure & Development': 5, 'Legal & Protection': 2, 'Health': 3}
- Status: {'Active': 95, 'Merged & renamed': 4, 'Closed / renamed into DAPST-based planning': 1}
- Student schemes by State: {'Andhra Pradesh': 2, 'Tamil Nadu': 2, 'Uttar Pradesh': 2, 'Bihar': 2, 'Rajasthan': 2, 'Haryana': 1, 'Madhya Pradesh': 2, 'Odisha': 2, 'West Bengal': 2, 'Jharkhand': 2, 'Chhattisgarh': 1, 'Kerala': 2, 'Delhi': 2, 'Karnataka': 2, 'Telangana': 2, 'Maharashtra': 1, 'Gujarat': 1, 'Punjab': 1, 'Himachal Pradesh': 1}

### The student pipeline the dataset covers (ask-and-answer order)
1. **School:** Pre-Matric SC/ST (Class 9-10), Pre-Matric for children of sanitation workers, EMRS,
   SHRESHTA, ashram schools, ST hostels, Odisha Madho Singh Haath Kharcha, WB Sikshashree.
2. **Class 11-Graduation:** Post-Matric SC/ST (central), State windows (Karnataka SSP, TS ePASS,
   MahaDBT, UP/MP/Rajasthan/Odisha/Gujarat/Punjab/Jharkhand/Kerala/Delhi/Himachal), Top Class SC/ST.
3. **Premier institutes:** IIT/NIT/IIIT full tuition waiver + free messing for SC/ST, Top Class
   Education SC, CSSS, AICTE Pragati/Saksham, Ishan Uday, TN Pudhumai Penn, Bihar Student Credit Card.
4. **Research:** NFSC, NFST, UGC Post-Doctoral Fellowship for SC/ST, Rajiv Gandhi National Fellowship (legacy).
5. **Abroad:** NOS-SC, NOS-ST, Telangana Ambedkar Overseas Vidya Nidhi.
6. **Coaching:** Free Coaching Scheme for SC/OBC, UP Abhyudaya, Rajasthan Anuprati, HP pre-exam coaching.
7. **Financing gaps:** PM Vidyalaxmi, Bihar Student Credit Card, NSFDC/NSTFDC education loans.

## How to use with a chatbot

1. **RAG (recommended):** load `sc_st_schemes_rag.jsonl`, embed the `text` field, keep `title`,
   `category`, `state_ut`, `status`, `metadata.application_portal` as metadata filters.
2. **Prompt stuffing (small scale):** paste the CSV/JSON into a long-context model along with
   `chatbot_system_prompt.md`.
3. **Fine-tuning:** use `sc_st_schemes_faq_pairs.jsonl` for supervised fine-tuning, and hold back
   20% of schemes as a test set to check hallucination.

## Guardrails baked into the data

- **Two confidence levels.** `data_confidence = High` means the norm/amount was verified against an
  official Ministry/State source while compiling. `Medium` means the scheme is real and the design is
  right, but the amount/slab changes often - the chatbot should say "as per the latest notification"
  and point to `application_portal`.
- **Historical and current schemes are separated** by `status` (`Active`, `Merged & renamed`,
  `Closed`) with `predecessor`/`successor` links, so the bot can answer "what happened to the old
  scheme?" correctly for any year of the last 10 years.
- **Eligibility ceilings are stated explicitly** (income, age, land, occupation) because most wrong
  answers from such bots come from applying a central norm to a State scheme (or vice versa).
- Every record carries at least one `source_*` entry.

## Rebuilding

```bash
cd /home/user/dataset
python3 build.py          # regenerates everything in /home/user/output
```
Edit or add records in the `dataset/data_*.py` files; the schema is in `dataset/schema.py`.

## Important caveat

Scheme amounts, income ceilings and portals are revised frequently by Governments. Before the chatbot
answers a citizen with a money figure, it should be refreshed against the official portal
(`application_portal`) and the ministry website. `last_verified` shows when each record was compiled.
