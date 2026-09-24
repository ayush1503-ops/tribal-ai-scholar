"""
Vercel serverless function for Tribal Scholar FastAPI backend.
This wraps the FastAPI app for Vercel's Python runtime.
"""
import os
import sys
from pathlib import Path

# Add repo root and tribal-scholar backend to path
ROOT_DIR = Path(__file__).resolve().parent.parent
TRIBAL_BACKEND_DIR = ROOT_DIR / "tribal-scholar" / "backend"

sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(TRIBAL_BACKEND_DIR))

# Set Vercel environment marker
os.environ.setdefault("VERCEL", "1")

# Ensure upload dirs exist
for p in ["/tmp/uploads", str(ROOT_DIR / "uploads"), "./uploads"]:
    try:
        os.makedirs(p, exist_ok=True)
    except Exception:
        pass

# Import FastAPI app with error handling for missing ML deps
try:
    from app.main import app as fastapi_app
except ImportError as e:
    # Fallback if ML dependencies missing - create minimal app
    print(f"Warning importing tribal app: {e}")
    # Try to create app without ML routes
    try:
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        
        # Minimal fallback app
        fastapi_app = FastAPI(title="TribalScholar AI - Minimal")
        fastapi_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        @fastapi_app.get("/")
        def root():
            return {
                "name": "TribalScholar AI - Minimal Mode",
                "warning": f"Full app import failed: {e}",
                "docs": "/api/docs",
                "health": "/health"
            }
        
        @fastapi_app.get("/health")
        def health():
            return {"status": "ok", "mode": "minimal", "error": str(e)}
            
        @fastapi_app.get("/api/v1/health")
        def api_health():
            return {"status": "ok", "mode": "minimal"}
            
    except Exception as e2:
        print(f"Critical failure creating fallback app: {e2}")
        raise

# Vercel expects `app` variable for Python runtime
app = fastapi_app

# NOTE: Do NOT define a module-level `handler` variable here. Vercel's Python
# runtime looks for `handler` before `app` and requires it to be a
# BaseHTTPRequestHandler subclass - a Mangum handler breaks the function.
