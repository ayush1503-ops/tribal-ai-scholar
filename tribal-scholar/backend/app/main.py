from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from .core.database import Base, engine
from .core.config import settings
from .routes import auth, profile, schemes, applications, documents, officer, committee, admin, appeals, chatbot, ml

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TribalScholar AI - Prototype",
    description="AI-assisted, configurable scholarship management platform for ST applicants. Prototype with synthetic data only. AI provides evidence, human makes decisions.",
    version="1.0.0-prototype"
)

# CORS
origins = [settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "https://*.e2b.app", "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Don't expose server
    return response

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(schemes.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(officer.router)
app.include_router(committee.router)
app.include_router(admin.router)
app.include_router(appeals.router)
app.include_router(chatbot.router)
app.include_router(ml.router)

# Mount uploads as protected? For prototype allow static but with check
os.makedirs("./uploads", exist_ok=True)

@app.get("/")
def root():
    return {
        "name": "TribalScholar AI",
        "version": "1.0.0-prototype",
        "description": "Prototype / Demonstration System — Synthetic Data Only",
        "note": "AI-assisted verification, human-in-the-loop decisions, configurable schemes",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health():
    return {"status": "ok", "prototype": True, "timestamp": "2026-09-23T00:00:00Z"}

@app.get("/api/v1/health")
def api_health():
    return {"status": "ok", "api_version": "v1"}

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Don't expose stack trace
    return JSONResponse(status_code=500, content={"detail": "Internal server error (prototype). Please try again.", "error": str(exc)[:200] if os.getenv("DEBUG") else "Hidden"})

# Seed on startup
@app.on_event("startup")
async def startup_event():
    from .seed import seed_database
    try:
        seed_database()
        print("Database seeded successfully")
    except Exception as e:
        print(f"Seed failed: {e}")
