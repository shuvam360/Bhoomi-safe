"""
BhoomiSafe — FastAPI Backend
Main application entry point.
"""

import sys
from pathlib import Path

# Ensure the project root (bhoomi-safe/) is on Python's path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from dotenv import load_dotenv
# Load environment variables from bhoomi-safe/.env
load_dotenv(dotenv_path=Path(_PROJECT_ROOT) / ".env")

import logging
import time
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse

# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
from backend.routers import prediction, alerts, reports, auth_router
from backend.services.ml_service import ml_service
from backend.limiter import limiter
from slowapi.errors import RateLimitExceeded

# ─────────────────────────────────────────────
# Logging Setup
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("bhoomi")


# ─────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("BhoomiSafe API starting up...")
    logger.info(f"ML model loaded: {ml_service.is_model_available}")
    if not ml_service.is_model_available:
        logger.warning("ML model not found — using heuristic fallback. Run ml/train.py to train.")
    yield
    logger.info("BhoomiSafe API shutting down...")


# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────
app = FastAPI(
    title="BhoomiSafe API",
    description=(
        "AI-Based Early Warning and Landslide Risk Monitoring System for North East India.\n\n"
        "Provides real-time landslide risk predictions, alert management, "
        "and citizen incident reporting."
    ),
    version="1.0.0",
    contact={
        "name": "BhoomiSafe Team",
        "email": "team@bhoomi-safe.in",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─────────────────────────────────────────────
# CORS (allow dashboard + citizen app origins)
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Rate Limiting Setup (SlowAPI)
# ─────────────────────────────────────────────
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    client_ip = request.client.host if request.client else "unknown"
    logger.warning(f"⚠️ [RATE LIMIT EXCEEDED] IP {client_ip} exceeded limit on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": f"Too many incident reports submitted from IP {client_ip}. Limit is 5 requests per minute to prevent spam.",
            "detail": f"Rate limit exceeded: {exc.detail}. Please wait before submitting another report.",
            "retry_after_seconds": 60,
        },
        headers={"Retry-After": "60"}
    )


# ─────────────────────────────────────────────
# Real-Time Request Logging Middleware
# ─────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"📥 [API REQ]  {request.method:<6} {request.url.path} (from {client_ip})")
    
    response = await call_next(request)
    
    duration_ms = (time.time() - start_time) * 1000
    status_icon = "🟢" if response.status_code < 400 else "🔴"
    logger.info(f"📤 [API RESP] {status_icon} {request.method:<6} {request.url.path} -> {response.status_code} ({duration_ms:.1f}ms)")
    
    return response


# ─────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────
app.include_router(prediction.router, prefix="/api/v1", tags=["Prediction"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
app.include_router(auth_router.router, prefix="/api/v1", tags=["Admin Auth"])

# Static Media Uploads Route (Photos & Videos)
_uploads_dir = Path(_PROJECT_ROOT) / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


# ─────────────────────────────────────────────
# Root & Health Check
# ─────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "project": "BhoomiSafe",
        "description": "AI-Based Landslide Early Warning System for NER",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health():
    return JSONResponse({
        "status": "ok",
        "version": "1.0.0",
        "model_loaded": ml_service.is_model_available,
        "model_source": "ensemble_model" if ml_service.is_model_available else "fallback_rule_based"
    })


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
