"""
BhoomiSafe — Alert Dispatch Service
Sends SMS/email notifications for high-risk predictions.
Twilio and SendGrid integrations are stubbed — configure via env vars.
"""

import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

logger = logging.getLogger("bhoomi.alerts")

# Load environment variables
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

# ─────────────────────────────────────────────
# SMS via Twilio (stubbed)
# ─────────────────────────────────────────────
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")

# Emergency contacts for NER districts
NER_EMERGENCY_CONTACTS = {
    "Assam": {"sms": "+919435000000", "name": "ASDMA (Assam State DMA)"},
    "Meghalaya": {"sms": "+919436000000", "name": "MSDMA (Meghalaya State DMA)"},
    "Manipur": {"sms": "+913852000000", "name": "MSDMA (Manipur State DMA)"},
    "Mizoram": {"sms": "+913892000000", "name": "MSDMA (Mizoram State DMA)"},
    "Nagaland": {"sms": "+913702000000", "name": "NSDMA (Nagaland State DMA)"},
    "Tripura": {"sms": "+913812000000", "name": "TSDMA (Tripura State DMA)"},
    "Arunachal Pradesh": {"sms": "+913602000000", "name": "APSDMA (Arunachal State DMA)"},
    "Sikkim": {"sms": "+913592000000", "name": "SSDMA (Sikkim State DMA)"},
}


def send_sms_alert(
    to_number: str,
    message: str,
    district: str,
    risk_level: str
) -> dict:
    """
    Dispatch SMS alert via Twilio.
    If Twilio credentials are not configured, logs the alert instead.
    """
    full_message = (
        f"🔴 BHOOMI SAFE ALERT [{risk_level}]\n"
        f"District: {district}\n"
        f"{message}\n"
        f"Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n"
        f"NDMA Helpline: 1078"
    )
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.warning(
            f"[STUB] SMS Alert → {to_number}: {full_message}"
        )
        return {"status": "stubbed", "to": to_number, "message": full_message}
    
    try:
        # pyrefly: ignore [missing-import]
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=full_message,
            from_=TWILIO_FROM_NUMBER,
            to=to_number
        )
        logger.info(f"SMS sent: SID={msg.sid}, to={to_number}")
        return {"status": "sent", "sid": msg.sid, "to": to_number}
    
    except Exception as e:
        logger.error(f"SMS dispatch failed: {e}")
        return {"status": "error", "error": str(e)}


# ─────────────────────────────────────────────
# Email via SendGrid (stubbed)
# ─────────────────────────────────────────────
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
ALERT_FROM_EMAIL = os.getenv("ALERT_FROM_EMAIL", "alerts@bhoomi-safe.in")
ALERT_TO_EMAIL = os.getenv("ALERT_TO_EMAIL", "ndma-ner@gov.in")


def send_email_alert(
    district: str,
    state: str,
    risk_level: str,
    probability: float,
    message: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> dict:
    """
    Send detailed alert email via SendGrid.
    Falls back to logging if API key not configured.
    """
    subject = f"[BhoomiSafe] {risk_level} Landslide Risk — {district}, {state}"
    
    body_html = f"""
    <html><body style="font-family:Arial;background:#0f0f0f;color:#e0e0e0;padding:20px;">
        <h2 style="color:#ef4444;">⚠️ Landslide Risk Alert</h2>
        <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:8px;"><b>District:</b></td><td>{district}, {state}</td></tr>
            <tr><td style="padding:8px;"><b>Risk Level:</b></td>
                <td style="color:{'#ef4444' if risk_level in ['HIGH','VERY_HIGH'] else '#eab308'};">
                    <b>{risk_level}</b></td></tr>
            <tr><td style="padding:8px;"><b>Probability:</b></td><td>{probability:.1%}</td></tr>
            <tr><td style="padding:8px;"><b>Message:</b></td><td>{message}</td></tr>
            <tr><td style="padding:8px;"><b>Coordinates:</b></td>
                <td>{latitude}, {longitude}</td></tr>
            <tr><td style="padding:8px;"><b>Generated:</b></td>
                <td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;">BhoomiSafe — AI-Based Landslide Early Warning System for NER<br>
        NDMA Helpline: 1078 | Portal: https://bhoomi-safe.in</p>
    </body></html>
    """
    
    if not SENDGRID_API_KEY:
        logger.warning(f"[STUB] Email Alert → {ALERT_TO_EMAIL}: {subject}")
        return {"status": "stubbed", "subject": subject}
    
    try:
        # pyrefly: ignore [missing-import]
        import sendgrid
        # pyrefly: ignore [missing-import]
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(SENDGRID_API_KEY)
        mail = Mail(ALERT_FROM_EMAIL, ALERT_TO_EMAIL, subject, html_content=body_html)
        response = sg.send(mail)
        logger.info(f"Email sent: status={response.status_code}")
        return {"status": "sent", "status_code": response.status_code}
    except Exception as e:
        logger.error(f"Email dispatch failed: {e}")
        return {"status": "error", "error": str(e)}


# ─────────────────────────────────────────────
# Main Dispatch (orchestrates all channels)
# ─────────────────────────────────────────────
def dispatch_alert(
    district: str,
    state: str,
    risk_level: str,
    probability: float,
    message: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> dict:
    """
    Orchestrate multi-channel alert dispatch for a high-risk prediction.
    Sends SMS to state SDMA + email to NDMA dashboard.
    """
    results = {}
    
    # SMS to state emergency contact
    if state in NER_EMERGENCY_CONTACTS:
        contact = NER_EMERGENCY_CONTACTS[state]
        results["sms"] = send_sms_alert(
            to_number=contact["sms"],
            message=message,
            district=district,
            risk_level=risk_level
        )
    
    # Email to NDMA portal
    results["email"] = send_email_alert(
        district=district, state=state,
        risk_level=risk_level, probability=probability,
        message=message, latitude=latitude, longitude=longitude
    )
    
    logger.info(f"Alert dispatched: {district}/{state} [{risk_level}] — channels: {list(results.keys())}")
    return results
