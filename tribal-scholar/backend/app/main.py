from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from .core.database import Base, engine
from .core.config import settings
from .routes import auth, profile, schemes, applications, documents, officer, committee, admin, appeals, chatbot, ml

# Create tables - with error handling for serverless
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Table creation warning (may already exist or ephemeral FS): {e}")

app = FastAPI(
    title="TribalScholar AI - Prototype",
    description="AI-assisted, configurable scholarship management platform for ST applicants. Prototype with synthetic data only. AI provides evidence, human makes decisions.",
    version="1.0.0-prototype",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS - permissive for Vercel deployment, handles preview URLs
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
    # Allow embedding in Vercel preview iframes
    if os.getenv("VERCEL"):
        response.headers["X-Frame-Options"] = "ALLOWALL"
    else:
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
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
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("./uploads", exist_ok=True)
    os.makedirs("/tmp/uploads", exist_ok=True)
except Exception:
    pass

@app.get("/")
def root():
    return {
        "name": "TribalScholar AI",
        "version": "1.0.0-prototype",
        "description": "Prototype / Demonstration System — Synthetic Data Only",
        "note": "AI-assisted verification, human-in-the-loop decisions, configurable schemes",
        "docs": "/api/docs",
        "health": "/health",
        "api_health": "/api/v1/health",
        "certificate_checker": "/cert",
        "frontend": "Deployed separately - see Vercel static build"
    }

@app.get("/health")
def health():
    from datetime import datetime, timezone
    return {
        "status": "ok", 
        "prototype": True, 
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
        "database": "sqlite (ephemeral on Vercel)" if "sqlite" in settings.DATABASE_URL else "configured",
        "upload_dir": settings.UPLOAD_DIR
    }

@app.get("/api/v1/health")
def api_health():
    return {"status": "ok", "api_version": "v1", "service": "tribal-scholar-api"}

@app.get("/api/health")
def generic_api_health():
    return {"status": "ok", "api_version": "v1", "service": "tribal-scholar-api"}

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Don't expose stack trace in production
    import traceback
    print(f"Unhandled error on {request.url.path}: {exc}")
    if os.getenv("VERCEL"):
        traceback.print_exc()
    return JSONResponse(
        status_code=500, 
        content={
            "detail": "Internal server error (prototype). Please try again.", 
            "error": str(exc)[:300] if os.getenv("DEBUG") or os.getenv("VERCEL_ENV") == "development" else "Hidden",
            "path": str(request.url.path)
        }
    )

# Seed on startup - make resilient for Vercel cold starts
@app.on_event("startup")
async def startup_event():
    from .seed import seed_database
    try:
        seed_database()
        print("Database seeded successfully")
    except Exception as e:
        print(f"Seed warning (may already be seeded): {e}")
        # Try again with more details in dev
        if os.getenv("VERCEL_ENV") != "production":
            import traceback
            traceback.print_exc()
