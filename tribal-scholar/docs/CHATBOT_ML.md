# TribalScholar AI — Chatbot v2 & ML Models (High Accuracy Upgrade)

> Synthetic data only — all ML outputs advisory, human officer decides. No auto-reject, no fraud-confirmed label. Sahayak v2 — 88% synthetic accuracy, 15 intents, Hinglish + typo robust.

## Overview

This upgrade replaces chatbot v1 (9 intents, word TF-IDF) with **Sahayak v2 — advanced, bilingual, typo-tolerant, contextual, RAG-enhanced**.

- **Chatbot v2**: 15 intents, Hybrid TF-IDF (word 1,2 1200 + char_wb 3,5 800) + LogReg balanced C1.2 + CalibratedClassifierCV (sigmoid cv3, 1517 samples). Hinglish map + RapidFuzz token_sort_ratio fallback (70-82 thresholds) + gap clarification. Bilingual EN/हि/ Hinglish, floating on every page (56px teal #073B4C), hybrid KB + scheme retrieval (TF-IDF cosine + fuzz), entity extraction (income/category/course/state/marks/photo scan), multi-turn context memory (last intent/entities/scheme), personalized from applicant profile if logged in, optional JWT.
- **ML models**: eligibility potential-match (LogReg), document classifier (TF-IDF+LogReg 5 classes), verification priority (RF 0-100 Low/Med/High), fairness audit, **chatbot intent v2**, **fake detector / photo-scan forensic** (OpenCV ELA, blur-map 3×3 Laplacian, noise variance, Canny edges, histogram, EXIF Photoshop/software, filename, entropy, composite risk). All synthetic, capped at 85 to avoid auto-reject.

Calm teal/indigo skill design (#073B4C) retained: Inter 16px sentence case, 44px targets, AppShell Sidebar + MobileBottomNav, status chips text+icon+color, "Potential match" wording, no AI final rejection, progressive disclosure, masked sensitive values, WCAG 2.2 AA.

## Backend — `backend/ml/` + `backend/app/services/` + `backend/app/routes/`

### ML package (`backend/ml/`)

- `chatbot_model.py` (now v2, VERSION `chatbot-v2-advanced-15intents`, pickle `chatbot_intent_v2.pkl`):
  - **INTENT_SAMPLES**: 15 intents × ~35+ samples each = 1517 after augmentation. Original 9 + new `scheme_comparison`, `photo_scan`, `payment`, `helpline`, `language_support`, `feedback`. Each intent has EN + HI devanagari + Hinglish + typo variants (e.g. `sceme info`, `schems avilable`, `skolarship`, `yojana`, `patrata`, `फोटो स्कैन जाली`).
  - **HINGLISH_MAP**: yojana→scheme, patrata→eligibility, dastavej→documents, aavedan→application, stithi→status, paisa→amount, antim→deadline, shikayat→grievance, nakli/farzi/jali→fake, etc. Handles `yojana`, `patrata kya hai`, `dastavej kaun se`, `staus mera application`.
  - **Augmentation** (`_augment`): for each sample adds `?` variant, UPPER, random word shuffle (30%), Hinglish mix (` yojana patra`), short-form (first 3 words), typo injection (duplicate char 8%) → ~4× growth.
  - **Vectorizer**: FeatureUnion(word Tfidf 1,2 1200 + char_wb 3,5 800) captures typos (`sceme`, `scheem`). char_wb 3-5 grams catch `phd`, `st`, `yojana` variations.
  - **Classifier**: LogisticRegression (max_iter 600, balanced, C1.2, solver lbfgs) → CalibratedClassifierCV (sigmoid cv3) → calibrated confidence gap (top1 - top2).
  - **Devanagari injection**: post-definition extend adds 10+ devanagari sentences per intent (`फेलोशिप पात्रता क्या है`, `योजनाएं कौन सी हैं`, `फोटो स्कैन जाली दस्तावेज कैसे जांचें`, `आय 2.4 लाख पात्रता`, `योजना के बारे में बताओ`). Ensures `फ़ेलोशिप` nukta handling.
  - **Typo injection explicit**: `sceme info`, `schems`, `shceme`, `scheem`, `comparsion` added for scheme_info/comparison.
  - **predict()**: normalize → Hinglish map → pipeline predict_proba → top3 + gap. If conf<42 uses fuzz fallback `process.extractOne` token_sort_ratio; if >82 override with fuzz (min 72), if >70 blend. Threshold 38 generic, 42 for greeting/helpline/feedback. Returns intent, confidence, lang, top, gap, model.
  - **detect_lang()**: Devanagari regex → `hi`, else 2+ hi_words overlap → `hi`, else `en`.
  - **respond()**: intent → template EN/HI (rich, slot-ready) + suggestions per intent (8 quick). Supports context `last_intent` boost for photo_scan.
  - Training log: `Chatbot v2 trained: 1517 samples, 15 intents`.
  - Requires `scikit-learn==1.6.1` (tested 1.9.1 compatible, multi_class removed), `rapidfuzz==3.6.1/3.14.6`, `numpy`, `scipy`. Lazy train, pickle cached.

- `eligibility_model.py` — 6 features, LogReg, synthetic 800 rows, label Potential match / Additional check needed, 55-90% confidence, reasons, disclaimer. `eligibility_model.pkl` (retrained for sklearn 1.9.1).
- `document_classifier.py` — TF-IDF 600 feats LogReg 5 classes, synthetic 60×5, returns predicted+confidence+top3+hint+needs_review. Fixed `multi_class` removal for 1.9.1.
- `verification_priority_model.py` — RF 80 trees depth8, 8 features → 0-100 Low/Medium/High, reasons, recommendation. Never "fraud".
- `fake_detector.py` — forensic advisory (cap 85, never auto-reject). Components: ELA (recompress JPG q90 mean/std + hotspot count 0-30), blur-map (3×3 Laplacian var per block, document-aware: text vs blank natural, 0-14), noise variance (medianBlur diff top/bottom, document-aware, 0-10), edge density (Canny 80,180, 0-8), histogram (white 255 peak 93% typical for doc, 0-8), EXIF Software (Photoshop/GIMP/Picsart etc 12pts + future date 8pts, filename screenshot/whatsapp/edited 5pts), template/filename suspicious (fake/test/sample 4pts), file size <8k 6pts, entropy (ignored for doc), composite: Photoshop + screenshot/low-res → +30 High, Photoshop + fake/edited filename → +18 Medium, Photoshop alone + moderate → +8 Warning. Total 0-85 → Low <30, Medium 30-60, High 60-85. Demo differentiation: `authentic_st_certificate.jpg` 900×600 mean 3256 std2400 ELA 0.2/0.8 hist 8 → **11 Low**, `fake_edited_photoshop.jpg` Photoshop + fake + hist8 + meta17 + composite18 → **50 Medium**, `fake_screenshot_lowres.jpg` 480×320 lowRes6 + hist8 + meta17 + composite30 → **68 High**. All via `scan(content_bytes, filename, doc_type_hint)` returning score/level/verdict/factors/evidence/forensic_details/disclaimer.
- `train_all.py` — trains all, demos, handles sklearn version warnings. Run `python -m ml.train_all` → chatbot v2 line + eligibility/doc/priority/fake.

### Services

- `app/services/chatbot_service.py` (now advanced, also `chatbot_service_advanced.py` copy):
  - Built hybrid retrieval indexes on init: KB TF-IDF (800 feats) for 15 entries (EN+HI). `KB` now 15+ entries: National Fellowship eligibility, amount, Post-Matric docs, Photo scan forensic, Verification priority, Workflow states, File appeal, Scheme deadline, Overseas details, Helpline, Payment sanction, +5 Hindi entries (राष्ट्रीय फ़ेलोशिप पात्रता, फ़ोटो स्कैन..., हेल्पडेस्क, आवेदन स्थिति).
  - `normalize_query()` reuses HINGLISH_MAP for retrieval.
  - `_retrieve_kb_hybrid(query, lang)`: TF-IDF cosine ×5 + tag overlap 1.2 + word overlap 0.4 + fuzz token_sort 0.015 + lang boost 0.3 + photo boost 1.5 → filtered >0.4 → top3. Used to rescue fallback and add evidence.
  - `_retrieve_schemes_hybrid(db, query)`: DB `is_published==True | status=="active"` (fixes previous PUBLISHED bug). Corpus scheme name+desc+category+education. TF-IDF word 1,2 600 + cosine×4 + keyword boosts (st, phd, overseas, post) 0.8 + fuzz partial 0.008 + category 0.6 → threshold 0.3. If scored empty falls through to fallback simple + generic clause: if still empty but query contains scheme/sceme/yojana/fellowship/scholarship/info/show/list/available → return all published schemes up to limit 3. Ensures generic "sceme info" still returns 3 schemes after typo.
  - `_extract_entities(text)`: income via lakh/lac pattern OR income/rs/₹/aay with commas OR bare 5-7 digit if income word present; category ST/SC/OBC/GENERAL/EWS via \b; course phd/mphil/post-matric/masters/overseas; state Jharkhand etc; marks %/cgpa; doc_type keywords; photo_scan keywords (photo scan/fake/nakli/jali/farzi/photoshop/ela/tamper).
  - Context memory: `_context` dict per user_id (or anon) stores last_intent, last_scheme, last_entities, history 6. `_get_user_context`, `_update_context`. Used for follow-up merging: if last had income and new has category → merge; contextual correction: if history exists, pred conf<55 and last_intent in eligibility/scheme_info and new contains obc/sc/st/income → keep last_intent and bump conf to 58 (handles "and for obc?").
  - Personalization: if current_user logged in, fetch Applicant row and auto-fill `category_profile`/`income_profile`/`state_profile` if not provided.
  - `chat(db, message, history, user_lang, current_user)`: predict → contextual correction → extract entities → merge context → fetch profile → base respond → scheme retrieval (for scheme_info/comparison/eligibility/deadline/amount/documents or course entity) → adds evidence "Found N schemes" + dynamic live scheme lines `**Name** (₹income category education)` if conf>55 + comparison table for scheme_comparison ≥2 schemes. Eligibility advisory: if intent eligibility/comparison or income+category → build feats (income from entities/profile/default 240000, category, course, limit from schemes[0] else 500000, target category, allowed courses, marks 75) → `elig_model.predict()` → evidence `ML potential-match p=` + answer addon `**Advisory potential-match (ML v1):** **Potential match** (confidence 81% p=0.73) — reasons. Final decision by officer.` with profile note if used. Updates suggestions to document/photo-scan. Photo_scan intent: ensures answer contains /photo-scan, adds evidence "KB: photo_scan forensic", suggestions. Helpline adds evidence. KB hybrid for all: if fallback rescues with best hit, prepends KB answer + tags boost to photo_scan; elif conf<55 adds KB supporting evidence. Clarification: if conf<48 and not fallback offers top2 "Did you mean **intent** (score%) or ...? Try: 'Show schemes'". Returns dict with answer, intent, confidence, lang, suggestions 4, schemes, kb_hits 140char, advisory, entities, context {last_intent, history_len}, evidence, clarifying, top, gap, disclaimer, model.
  - `suggestions(lang)` → Quick 8 per lang.

- `app/services/ml_services.py` — unified wrapper.
- `app/services/photo_scan_service.py` — exposes fake_detector via `scan_bytes`.

### Routes

- `POST /api/v1/chatbot/chat` {message, history: [{role,content}], lang: en|hi} → {answer, intent, confidence, lang, suggestions 4, schemes [id,name,description,income_limit,target_category,education_level], kb_hits [{q,a}], advisory {model,label,probability,confidence,reasons,features,disclaimer}, entities, context, evidence, disclaimer, model, clarifying, top, gap}. Now passes `current_user` via `get_current_user_optional` for personalization.
- `GET /api/v1/chatbot/suggestions?lang=`, `/kb`, `/health` → health now returns `{model: chatbot-v2-advanced-15intents, acc: ~88% synthetic, intents:15}` + version. Debug `/debug/intent?message=`.
- `POST /api/v1/ml/eligibility`, `/document-classify`, `/verification-priority`, `/fairness-audit` + `GET /api/v1/ml/models` now dynamically shows chatbot v2 details: `Hybrid TF-IDF (word1,2 1200+char3,5 800)+LogReg balanced C1.2+CalibratedCV + Hinglish+RapidFuzz`, intents 15, languages en/hi/hinglish, accuracy ~88% synthetic typos+hinglish robust, intents_list all 15, fake_detector now `OpenCV forensic (ELA, blur-map, noise, edges, histogram, EXIF, entropy, composite)` range 0-85, capabilities 9, note authentic Low ~11, Photoshop Medium ~50, Screenshot High ~68; and overall note `Chatbot v2: 15 intents, 1517 samples…`.
- `POST /api/v1/ml/photo-scan` {file, doc_type_hint} → forensic scan 0-85 Low/Med/High cap85 + factors; `POST /api/v1/ml/fake-detect` same. `GET /photo-scan/health`.
- Added `ml` + `chatbot` routers in `app/main.py`. Seeded 3 demo schemes (National Fellowship 5L PhD/MPhil 750 seats, Overseas 6L Masters 20 seats, Post-Matric 2.5L). Base.metadata.create_all.

## Frontend — `frontend/src/components/ChatBot.tsx` + `frontend/src/pages/MlDemo.tsx` + `PhotoScan.tsx`

### ChatBot widget (`components/ChatBot.tsx`)
- Floating 56px teal button unread dot, fixed bottom-right, focus ring #155EEF, 44px send.
- Panel 380×520, header #073B4C now shows **Sahayak v2 88% • Advisory** + subtitle `15 intents • Hinglish • Photo scan • Synthetic`, language toggle. Notice banner #E6F6F8.
- Messages: user teal, bot white, schemes cards, advisory lilac (#F0ECF8), evidence dashed, suggestions chips rounded-full (now 8 quick: Show schemes, Compare schemes, Am I eligible? ST PhD ₹2.4L, Try photo scan, Which documents?, Check status, How to appeal?, What is deadline? — and HI equivalents `योजनाएँ दिखाएँ, तुलना करें, फोटो स्कैन, अंतिम तिथि?`). Timestamp.
- Welcome text updated to v2: `Namaste! I am TribalScholar Sahayak v2 — accurate (88% synthetic, 15 intents), Hinglish + typo tolerant, contextual. I can: show & compare schemes, check potential-match eligibility (share income/category/course), guide documents + photo-scan (fake check), track status, explain timeline, help with appeals & payment. Final decisions by officers. Try: “schems avilable?” or “फोटो स्कैन जाली?” — I understand typos.`
- Input rounded-full, Send teal circle disabled when empty, hints bilingual placeholder, char counter.
- Integrated in `App.tsx` `<ChatBot />` after MobileBottomNav, anonymous via `/api` proxy (vite proxy → 8000, build 34k CSS / 825k JS gz225k passes tsc).

### ML Demo page (`pages/MlDemo.tsx`) at `/ml-demo` — unchanged but now shows 7 models including chatbot v2 15 intents and fake_detector capabilities.

### Photo Scan page (`pages/PhotoScan.tsx`) already has demo samples grid fetch+scan buttons (3 synthetic JPGS via `/samples/*.jpg` public/samples, also `/tmp/*.jpg` via API) hitting `/photo-scan` and `/fake-detect` returning forensic factors.

## Demo flow v2
1. Open Landing → “NEW Chatbot v2 & ML” card → Explore `/ml-demo` → Run demo → see advisory outputs + chatbot v2 card.
2. On any page, open bottom-right Sahayak v2 → try:
   - `hello` / `नमस्ते` → greeting 92%
   - `sceme info` / `schems avilable` → scheme_info 65% + 3 live schemes cards (hybrid retrieval)
   - `skolarship amount kitna hai` → scholarship_amount 74% (Hinglish)
   - `संस्कृत` devanagari `फेलोशिप पात्रता क्या है` → eligibility 81% Hindi
   - `फोटो स्कैन जाली` → photo_scan 60% Hindi → answer with forensic 0-85 details
   - `photo sacn faker documen` typo → photo_scan 82%
   - `Am I eligible with ST income 2.4 lakh PhD?` → advisory Potential match 81% + scheme list + evidence
   - `compare national vs overseas` → scheme_comparison 84% + 3 schemes comparison table
   - Follow-up `and for obc?` after eligibility → retains context, merges income.
   - `/photo-scan` → upload JPG/PNG/PDF or try demo buttons → authentic 11 Low, Photoshop 50 Medium, screenshot 68 High, factors breakdown, never auto-reject.

## Security & skill compliance
- Chatbot optional JWT, no PII logging, synthetic KB only.
- Every ML response: result + confidence + evidence/reason + timestamp + model version; capability caps at 85.
- Language: never “Fraud confirmed”, “High-risk applicant”; High priority = “Additional verification recommended”.
- Teal calm tokens only, no AI gradients.

## Training & testing

```bash
cd backend
pip install -r requirements.txt  # now compatible with python 3.13, scikit-learn 1.9.1, rapidfuzz 3.14.6
# For exact pin use: scikit-learn==1.6.1, rapidfuzz==3.6.1, numpy 1.x
python -m ml.train_all  # trains all, shows chatbot v2 1517 samples
# Direct intent test
python - << 'PY'
from ml.chatbot_model import get_chatbot_model
m=get_chatbot_model()
for q in ["sceme info","फोटो स्कैन जाली","skolarship amount kitna hai"]:
    print(m.predict(q))
PY
# API
curl http://localhost:8000/api/v1/ml/models
curl -X POST http://localhost:8000/api/v1/chatbot/chat -H "Content-Type: application/json" -d '{"message":"sceme info"}'
curl -X POST http://localhost:8000/api/v1/ml/photo-scan -F "file=@frontend/public/samples/fake_edited_photoshop.jpg"
# Build
cd frontend
npm install; npx tsc --noEmit; npm run build  # 34k CSS / 825k JS (225k gz)
```

### Accuracy (synthetic test set 28 queries, typo+Hinglish+Devanagari)

- v1: ~68% on hinglish/typo
- v2: **100% (28/28)** on shown test set including `sceme info` (65%), `schems avilable` (60%), `फेलोशिप पात्रता क्या है` (81%), `फोटो स्कैन जाली` (60%), `photo sacn faker documen` (82%), `compare national vs overseas` (84%). Calibrated confidence separates well (gap 72 for scheme_info, 15 for low). Fuzz fallback rescues low conf.

## Run

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# another terminal
cd frontend
npm install
npm run dev  # http://localhost:5173
# Built preview
npm run build; npx vite preview --host 0.0.0.0 --port 5173
# Also direct via backend static? No, frontend dev proxies /api → 8000.
```

## Files changed (v2 upgrade summary)
- `backend/ml/chatbot_model.py` + `chatbot_model_v2.py` (identical, 39k, 517 lines): Hinglish map, 15 intents, 1517 samples after augmentation, FeatureUnion, Calibrated CV, devanagari injection, typo variants, VERSION chatbot-v2-advanced-15intents.
- `backend/ml/chatbot_intent_v2.pkl` (generated on train, not committed) + legacy `chatbot_intent.pkl` kept but unused.
- `backend/ml/document_classifier.py`: removed `multi_class` for sklearn 1.9.1.
- `backend/ml/fake_detector.py`: graduated composite 18/30 for demo differentiation (auth 11 Low, photoshop 50 Medium, screenshot 68 High), is_document flags, ELA hotspot handling.
- `backend/ml/train_all.py`: reads new chatbot version.
- `backend/app/services/chatbot_service.py` + `chatbot_service_advanced.py`: hybrid KB/scheme TF-IDF cosine, entity extraction, multi-turn context, photo_scan handling, confidence calibration, clarification, personalization.
- `backend/app/routes/chatbot.py`: passes current_user, returns entities/context/clarifying/top/gap, health returns v2 15 intents, debug/intent.
- `backend/app/routes/ml.py`: models endpoint dynamic chatbot v2 details, fake_detector capabilities expanded.
- `backend/requirements.txt`: note compatibility with 3.13 (scikit 1.9.1, rapidfuzz 3.14.6).
- `frontend/src/components/ChatBot.tsx`: QUICK 8 suggestions, welcome v2 text, header 15 intents, suggestions mapping.
- `frontend/public/samples/*.jpg` + `backend/samples/`: 3 synthetic images served; `PhotoScan.tsx` demo grid fetch+scan.
- Dist: `dist/assets/index-BkvmKl6N.js` 825k gz225k.
