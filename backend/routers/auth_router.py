"""
BhoomiSafe — Admin Authentication Router
========================================
Dedicated authentication endpoint for BhoomiSafe administrator operations:
- Validates operator API key with constant-time comparison
- Enforces rate limiting against brute force attempts
- Session token generation for frontend AuthContext
"""

import logging
import secrets
from fastapi import APIRouter, HTTPException, Request, Depends, status
from pydantic import BaseModel, Field
from backend.auth import get_expected_api_key, verify_api_key
from backend.limiter import limiter

logger = logging.getLogger("bhoomi.auth_router")
router = APIRouter()


class AdminLoginRequest(BaseModel):
    api_key: str = Field(..., description="Administrator secret API key")


class AdminLoginResponse(BaseModel):
    success: bool
    token: str
    role: str
    message: str


@router.post(
    "/admin/login",
    response_model=AdminLoginResponse,
    summary="Authenticate Admin Console",
    description="Validates the admin API key and issues session authorization.",
)
@limiter.limit("10/minute")
async def admin_login(request: Request, body: AdminLoginRequest):
    """
    Authenticate administrator credentials using constant-time comparison.
    Rate limited to 10 attempts/minute to prevent brute-force attacks.
    """
    client_ip = request.client.host if request.client else "unknown"
    expected_key = get_expected_api_key()

    if not body.api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key cannot be empty.",
        )

    if not secrets.compare_digest(body.api_key.strip(), expected_key.strip()):
        logger.warning(f"❌ [AUTH FAILED] Failed admin login attempt from IP {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid credentials. Access restricted to authorized BhoomiSafe administrators.",
        )

    logger.info(f"✅ [AUTH SUCCESS] Administrator authenticated successfully from IP {client_ip}")
    return AdminLoginResponse(
        success=True,
        token=expected_key,
        role="admin",
        message="Authentication successful. Welcome, BhoomiSafe Administrator.",
    )


@router.get(
    "/admin/verify-token",
    summary="Verify Admin Token Validity",
    description="Checks if an existing session token is valid.",
    dependencies=[Depends(verify_api_key)],
)
async def verify_admin_session():
    """Validates the current session token."""
    return {
        "valid": True,
        "role": "admin",
        "system": "BhoomiSafe NER Operations",
    }
