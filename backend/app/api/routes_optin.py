"""Opt-in API routes.

This endpoint accepts name/email from the frontend and (optionally) records
them in a Google Sheet via the optin_service. It is designed to:
- Be safe if Google Sheets is not configured (returns 200 with success=False).
- Never raise 500 just because Sheets is misconfigured.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr, Field
import logging

from app.services.optin_service import record_optin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/optin", tags=["optin"])


class OptInPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr


@router.post("")
async def create_optin(payload: OptInPayload, request: Request):
    """Capture name/email and forward to Google Sheets (if configured)."""
    user_agent = request.headers.get("user-agent")
    ip = request.client.host if request.client else None

    success = record_optin(
        name=payload.name.strip(),
        email=payload.email.strip(),
        user_agent=user_agent,
        ip=ip,
    )

    return {
        "success": success,
        "message": "Recorded" if success else "Opt-in received but Google Sheets is not configured.",
    }


