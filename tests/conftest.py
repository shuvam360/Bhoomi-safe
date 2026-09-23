"""
Pytest configuration and shared fixtures for BhoomiSafe backend tests.
"""

import os
import sys
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient

# Ensure project root (bhoomi-safe/) is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Guarantee test environment variables if not present in .env
os.environ.setdefault("BHOOMI_API_KEY", "bhoomi-admin-key-2026")
os.environ.setdefault("JWT_SECRET_KEY", "bhoomi-test-jwt-secret-key-2026")

from backend.main import app
from backend.limiter import limiter

# Disable rate limiting during automated test suite execution
limiter.enabled = False


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """
    TestClient fixture wrapping the FastAPI application.
    Uses context manager to properly trigger startup/shutdown lifespan events.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_prediction_payload() -> dict:
    """
    Valid payload representing typical monsoon conditions in NER (Cherrapunji/East Khasi Hills).
    """
    return {
        "district": "Cherrapunji",
        "state": "Meghalaya",
        "latitude": 25.2833,
        "longitude": 91.7167,
        "rainfall_24h_mm": 185.0,
        "rainfall_72h_mm": 380.0,
        "antecedent_rainfall_mm": 510.0,
        "soil_moisture_percent": 82.5,
        "slope_degrees": 36.0,
        "elevation_m": 1280.0,
        "ndvi": 0.38,
        "lithology_code": 2,
    }


@pytest.fixture
def sample_report_payload() -> dict:
    """
    Valid citizen landslide report payload with legitimate coordinates in NER.
    """
    return {
        "reporter_name": "Tenzing Lhadon",
        "reporter_phone": "+919436009876",
        "district": "Tawang",
        "state": "Arunachal Pradesh",
        "latitude": 27.5860,
        "longitude": 91.8655,
        "description": "Debris and mud blocking mountain pass road near Bap Teng Kang.",
        "severity": "HIGH",
    }
