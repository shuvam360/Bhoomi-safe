"""
BhoomiSafe — Authentication Dependency
=======================================
Header-based API key authentication for administrative / operator endpoints:
- PATCH /api/v1/reports/{id}/verify
- POST  /api/v1/alerts
- PATCH /api/v1/alerts/{id}/deactivate

The expected API key is retrieved from the BHOOMI_API_KEY environment variable.
Public citizen submissions (POST /api/v1/reports) and prediction queries remain open.
"""

import os
import secrets
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

logger = logging.getLogger("bhoomi.auth")

# Ensure .env is loaded
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


def get_expected_api_key() -> str:
    """
    Retrieve valid API key from environment variable (BHOOMI_API_KEY).
    No hardcoded keys permitted in codebase.
    """
    key = os.getenv("BHOOMI_API_KEY") or os.getenv("API_KEY")
    if not key:
        logger.error("CRITICAL: BHOOMI_API_KEY is not configured in .env or environment!")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: BHOOMI_API_KEY is not defined in .env.",
        )
    return key


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    FastAPI Depends dependency to authenticate privileged requests.
    
    Validates the 'X-API-Key' header using constant-time comparison
    to prevent timing attacks.
    """
    if not api_key:
        logger.warning("Unauthorized access attempt: Missing X-API-Key header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Provide 'X-API-Key' header for operator/admin endpoints.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    expected_key = get_expected_api_key()
    
    if not secrets.compare_digest(api_key, expected_key):
        logger.warning("Unauthorized access attempt: Invalid X-API-Key provided.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid API key.",
        )
    
    return api_key
