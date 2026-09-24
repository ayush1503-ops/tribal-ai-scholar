from pydantic_settings import BaseSettings
from typing import Optional
import os

def _default_db_url():
    # Vercel serverless has read-only filesystem except /tmp
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
        return "sqlite:////tmp/tribal_scholar.db"
    return "sqlite:///./tribal_scholar.db"

def _default_upload_dir():
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
        return "/tmp/uploads"
    return "./uploads"

class Settings(BaseSettings):
    DATABASE_URL: str = _default_db_url()
    SECRET_KEY: str = "change-me-to-a-strong-random-secret-key-demo-only-32chars-for-vercel-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    UPLOAD_DIR: str = _default_upload_dir()
    MAX_FILE_SIZE_MB: int = 5
    ENVIRONMENT: str = os.getenv("VERCEL_ENV", os.getenv("ENVIRONMENT", "development"))

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
# Ensure upload dir exists (best effort, /tmp may not exist at import on Vercel cold start)
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass
