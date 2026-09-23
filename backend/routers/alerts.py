"""
BhoomiSafe — Alerts Router
CRUD operations for active landslide alerts.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Query, Depends

from backend.models.schemas import AlertCreate, AlertOut
from backend.auth import verify_api_key

logger = logging.getLogger("bhoomi.alerts")
router = APIRouter()

# In-memory store (replace with DB in production)
_alerts_store: dict[str, dict] = {}


def _seed_demo_alerts():
    """Pre-seed some demo alerts for UI testing."""
    demo = [
        {
            "district": "Cherrapunji", "state": "Meghalaya",
            "risk_level": "VERY_HIGH", "latitude": 25.2833, "longitude": 91.7167,
            "message": "Extreme rainfall (248mm/24h). Debris flow risk. Evacuate low-lying areas.",
        },
        {
            "district": "Lunglei", "state": "Mizoram",
            "risk_level": "HIGH", "latitude": 22.8879, "longitude": 92.7378,
            "message": "Sustained heavy rainfall (198mm/24h). Road closures expected.",
        },
        {
            "district": "Tamenglong", "state": "Manipur",
            "risk_level": "HIGH", "latitude": 24.9831, "longitude": 93.5008,
            "message": "Saturated soil conditions. Monitor NH-37 for slope failures.",
        },
        {
            "district": "Nongpoh", "state": "Meghalaya",
            "risk_level": "VERY_HIGH", "latitude": 25.9005, "longitude": 91.8754,
            "message": "Gneiss-granite terrain with steep slopes. Rockfall alert issued.",
        },
        {
            "district": "Dawki", "state": "Meghalaya",
            "risk_level": "VERY_HIGH", "latitude": 25.1667, "longitude": 92.0167,
            "message": "Highest recorded 24h rainfall. All citizens advised to move to higher ground.",
        },
    ]
    for d in demo:
        alert_id = str(uuid.uuid4())
        _alerts_store[alert_id] = {
            "id": alert_id,
            "district": d["district"],
            "state": d["state"],
            "risk_level": d["risk_level"],
            "message": d["message"],
            "latitude": d.get("latitude"),
            "longitude": d.get("longitude"),
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }


_seed_demo_alerts()


@router.get("/alerts", summary="List active alerts")
async def list_alerts(
    state: Optional[str] = Query(None, description="Filter by state"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    active_only: bool = Query(True, description="Return only active alerts")
):
    """List all landslide alerts with optional filtering."""
    alerts = list(_alerts_store.values())
    
    if active_only:
        alerts = [a for a in alerts if a["is_active"]]
    if state:
        alerts = [a for a in alerts if a["state"].lower() == state.lower()]
    if risk_level:
        alerts = [a for a in alerts if a["risk_level"].upper() == risk_level.upper()]
    
    alerts.sort(key=lambda a: a["created_at"], reverse=True)
    return {"alerts": alerts, "count": len(alerts)}


@router.post("/alerts", summary="Create new alert", status_code=201, dependencies=[Depends(verify_api_key)])
async def create_alert(alert: AlertCreate):
    """Manually create a new landslide alert (admin/operator use — requires X-API-Key)."""
    alert_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    record = {
        "id": alert_id,
        **alert.model_dump(),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    _alerts_store[alert_id] = record
    logger.info(f"Alert created: {alert_id} — {alert.district}/{alert.state} [{alert.risk_level}]")
    return record


@router.get("/alerts/{alert_id}", summary="Get specific alert")
async def get_alert(alert_id: str):
    """Retrieve a specific alert by ID."""
    if alert_id not in _alerts_store:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alerts_store[alert_id]


@router.patch("/alerts/{alert_id}/deactivate", summary="Deactivate an alert", dependencies=[Depends(verify_api_key)])
async def deactivate_alert(alert_id: str):
    """Mark an alert as resolved/inactive (admin/operator use — requires X-API-Key)."""
    if alert_id not in _alerts_store:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    _alerts_store[alert_id]["is_active"] = False
    _alerts_store[alert_id]["updated_at"] = datetime.utcnow().isoformat()
    logger.info(f"Alert deactivated: {alert_id}")
    return {"message": "Alert deactivated", "id": alert_id}


@router.get("/alerts/stats/summary", summary="Alert statistics")
async def alert_stats():
    """Return aggregated alert counts by risk level and state."""
    alerts = [a for a in _alerts_store.values() if a["is_active"]]
    
    by_level = {}
    by_state = {}
    
    for a in alerts:
        level = a["risk_level"]
        state = a["state"]
        by_level[level] = by_level.get(level, 0) + 1
        by_state[state] = by_state.get(state, 0) + 1
    
    return {
        "total_active": len(alerts),
        "by_risk_level": by_level,
        "by_state": by_state,
        "generated_at": datetime.utcnow().isoformat()
    }
