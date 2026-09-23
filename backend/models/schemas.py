"""
BhoomiSafe — Pydantic Schemas
Request/Response models for the FastAPI backend.
"""

from datetime import datetime
from typing import Optional, List
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, field_validator


# ─────────────────────────────────────────────
# Prediction
# ─────────────────────────────────────────────
class PredictionRequest(BaseModel):
    district: Optional[str] = Field(None, example="Cherrapunji")
    state: Optional[str] = Field(None, example="Meghalaya")
    latitude: Optional[float] = Field(None, ge=-90, le=90, example=25.2833)
    longitude: Optional[float] = Field(None, ge=-180, le=180, example=91.7167)
    rainfall_24h_mm: float = Field(..., ge=0, le=1500, example=210.0,
                                    description="24-hour cumulative rainfall in mm")
    rainfall_72h_mm: float = Field(..., ge=0, le=3000, example=525.0,
                                    description="72-hour cumulative rainfall in mm")
    antecedent_rainfall_mm: float = Field(..., ge=0, le=5000, example=720.0,
                                           description="7-day antecedent rainfall index")
    soil_moisture_percent: float = Field(..., ge=0, le=100, example=86.0,
                                          description="Volumetric soil moisture (%)")
    slope_degrees: float = Field(..., ge=0, le=90, example=38.0,
                                  description="Average slope angle (degrees)")
    elevation_m: float = Field(..., ge=0, le=9000, example=1150.0,
                                description="Elevation above sea level (m)")
    ndvi: float = Field(..., ge=0, le=1, example=0.33,
                        description="Normalized Difference Vegetation Index (0–1)")
    lithology_code: int = Field(..., ge=1, le=3, example=2,
                                 description="Rock type: 1=Alluvial, 2=Sandstone, 3=Limestone")

    @field_validator("rainfall_72h_mm")
    @classmethod
    def validate_72h_gte_24h(cls, v, values):
        if "rainfall_24h_mm" in values.data and v < values.data["rainfall_24h_mm"]:
            raise ValueError("rainfall_72h_mm must be >= rainfall_24h_mm")
        return v


class PredictionResponse(BaseModel):
    district: Optional[str]
    probability: float = Field(..., description="Landslide probability (0–1)")
    risk_level: str = Field(..., description="LOW / MODERATE / HIGH / VERY_HIGH")
    risk_color: str = Field(..., description="Hex color for map visualization")
    risk_code: int = Field(..., description="Risk code 1–4")
    trigger_alert: bool = Field(..., description="Whether to dispatch an alert")
    source: str = Field(..., description="Model used: ensemble_model or heuristic_fallback")
    model_version: str = Field(default="v2.1.0", description="Model release version (e.g. v2.1.0)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────
# Alerts
# ─────────────────────────────────────────────
class AlertCreate(BaseModel):
    district: str = Field(..., example="Cherrapunji")
    state: str = Field(..., example="Meghalaya")
    risk_level: str = Field(..., example="HIGH")
    message: str = Field(..., example="Heavy rainfall detected. High landslide risk.")
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AlertOut(BaseModel):
    id: str
    district: str
    state: str
    risk_level: str
    message: str
    latitude: Optional[float]
    longitude: Optional[float]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────
# Citizen Reports
# ─────────────────────────────────────────────
class ReportStatus:
    PENDING_REVIEW = "PENDING_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    AWAITING_GOVT_APPROVAL = "AWAITING_GOVT_APPROVAL"
    SUBMITTED_TO_GOVT = "SUBMITTED_TO_GOVT"
    READY_FOR_MANUAL_SUBMISSION = "READY_FOR_MANUAL_SUBMISSION"

    ALL_STATUSES = {
        PENDING_REVIEW,
        VERIFIED,
        REJECTED,
        AWAITING_GOVT_APPROVAL,
        SUBMITTED_TO_GOVT,
        READY_FOR_MANUAL_SUBMISSION,
    }


class ReportCreate(BaseModel):
    reporter_name: Optional[str] = Field(None, example="Anita Sharma")
    reporter_phone: Optional[str] = Field(None, example="+919876543210")
    district: str = Field(..., example="Jiribam")
    state: str = Field(..., example="Manipur")
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    description: str = Field(..., min_length=10, example="Road blocked by mud flow near village")
    severity: str = Field(..., example="HIGH",
                          description="Severity: LOW / MEDIUM / HIGH / CRITICAL")
    incident_type: str = Field(default="Landslide", example="Landslide",
                               description="Type: Landslide / Rockfall / Mudslide / Soil Creep")
    photo_url: Optional[str] = None
    video_url: Optional[str] = None
    media_urls: List[str] = Field(default_factory=list)

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v):
        allowed = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        if v.upper() not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v.upper()


class ReportVerifyRequest(BaseModel):
    status: str = Field(..., example="VERIFIED", description="Target status: VERIFIED or REJECTED")
    admin_note: Optional[str] = Field(None, example="Field verified with district liaison. Road blocked.")

    @field_validator("status")
    @classmethod
    def validate_verify_status(cls, v):
        allowed = {"VERIFIED", "REJECTED"}
        if v.upper() not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v.upper()


class GovtApprovalRequest(BaseModel):
    action: str = Field(default="APPROVE", example="APPROVE", description="APPROVE to escalate")
    notes: Optional[str] = Field(None, example="Escalate immediately to state SDMA control room.")


class AuditHistoryItem(BaseModel):
    from_status: Optional[str] = None
    to_status: str
    action: str
    actor: str = "admin"
    timestamp: datetime
    note: Optional[str] = None
    metadata: Optional[dict] = None


class ReportOut(BaseModel):
    id: str
    reporter_name: Optional[str]
    reporter_phone: Optional[str] = None
    district: str
    state: str
    latitude: Optional[float]
    longitude: Optional[float]
    description: str
    severity: str
    incident_type: str = "Landslide"
    status: str = ReportStatus.PENDING_REVIEW
    photo_url: Optional[str] = None
    video_url: Optional[str] = None
    media_urls: List[str] = Field(default_factory=list)
    verified: bool
    admin_note: Optional[str] = None
    government_portal: Optional[dict] = None
    submission_package: Optional[dict] = None
    govt_submission_id: Optional[str] = None
    history: List[dict] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─────────────────────────────────────────────
# Weather
# ─────────────────────────────────────────────
class WeatherData(BaseModel):
    district: str
    state: str
    temperature_c: float
    humidity_percent: float
    rainfall_1h_mm: float
    rainfall_24h_mm: float
    wind_speed_ms: float
    weather_description: str
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    model_loaded: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
