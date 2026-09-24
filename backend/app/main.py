from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import schemes, applications, documents, officer, admin

app = FastAPI(title="TribalScholar AI API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(schemes.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(officer.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"name":"TribalScholar AI","status":"prototype"}

@app.get("/api/v1/health")
def health():
    return {"status":"ok"}
