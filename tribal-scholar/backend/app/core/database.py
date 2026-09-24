from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings
import os

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Ensure directory exists for file-based sqlite
    try:
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        # Handle sqlite:////tmp/... vs sqlite:///./...
        if db_path.startswith("/"):
            dir_path = os.path.dirname(db_path)
        else:
            dir_path = os.path.dirname(os.path.abspath(db_path))
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
    except Exception:
        pass

# For Vercel, pool settings need to be conservative
engine = create_engine(
    settings.DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,
    # Avoid connection pooling issues on serverless
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
