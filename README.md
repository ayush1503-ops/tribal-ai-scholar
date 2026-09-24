# TribalScholar AI Prototype
React/Vite frontend + FastAPI backend prototype for a configurable scholarship/fellowship platform.

## Run backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

## Run frontend
cd frontend
npm install
npm run dev

Backend: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs

Synthetic data only. AI is advisory; authorized humans make final decisions.
