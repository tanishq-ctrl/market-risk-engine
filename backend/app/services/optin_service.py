"""Opt-in capture service: append name/email to Google Sheets.

This is intentionally simple and safe-by-default:
- Uses a dedicated service account.
- Spreadsheet ID and service account JSON are provided via environment variables.
- If configuration is missing or fails, we log and return gracefully (no 500s).
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import gspread
from google.oauth2 import service_account

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_sheets_client() -> Optional[gspread.Client]:
    """Create a gspread client from a JSON service account in env.

    Returns None if configuration is missing or invalid.
    """
    raw_json = settings.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
    spreadsheet_id = settings.GOOGLE_SHEETS_SPREADSHEET_ID

    if not raw_json or not spreadsheet_id:
        logger.info(
            "Google Sheets opt-in not configured; "
            "set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON and GOOGLE_SHEETS_SPREADSHEET_ID to enable."
        )
        return None

    try:
        info = json.loads(raw_json)
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        client = gspread.authorize(creds)
        return client
    except Exception as exc:
        logger.error("Failed to create Google Sheets client: %s", exc, exc_info=True)
        return None


def record_optin(
    name: str,
    email: str,
    user_agent: Optional[str] = None,
    ip: Optional[str] = None,
) -> bool:
    """Append a new opt-in row to Google Sheets.

    Returns:
        bool: True on success, False if configuration is missing or an error occurred.
    """
    client = _get_sheets_client()
    if client is None:
        return False

    spreadsheet_id = settings.GOOGLE_SHEETS_SPREADSHEET_ID
    worksheet_title = settings.GOOGLE_SHEETS_WORKSHEET_TITLE or "OptIns"

    try:
        sh = client.open_by_key(spreadsheet_id)
        try:
            ws = sh.worksheet(worksheet_title)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=worksheet_title, rows=100, cols=10)
            # Add header row
            ws.append_row(
                ["timestamp", "name", "email", "user_agent", "ip"],
                value_input_option="USER_ENTERED",
            )

        from datetime import datetime

        timestamp = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        ws.append_row(
            [timestamp, name, email, user_agent or "", ip or ""],
            value_input_option="USER_ENTERED",
        )
        logger.info("Recorded opt-in for %s", email)
        return True
    except Exception as exc:
        logger.error("Failed to record opt-in to Google Sheets: %s", exc, exc_info=True)
        return False


