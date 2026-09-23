"""
BhoomiSafe — Reports Router
============================
Citizen incident reporting endpoints with:
- Media upload and size/type validation (images <= 10MB, videos <= 50MB)
- Admin verification workflow (PENDING_REVIEW -> VERIFIED or REJECTED)
- Regional government portal matching lookup
- Explicit human approval gate before government escalation (AWAITING_GOVT_APPROVAL -> SUBMITTED_TO_GOVT / READY_FOR_MANUAL_SUBMISSION)
- Full chronological audit trail (GET /reports/{id}/history)
"""

import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends, Request, UploadFile, File
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from backend.models.schemas import (
    ReportCreate,
    ReportOut,
    ReportStatus,
    ReportVerifyRequest,
    GovtApprovalRequest,
)
from backend.auth import verify_api_key
from backend.limiter import limiter
from backend.services.govt_portal_service import (
    match_government_portal,
    submit_to_govt_api,
    build_manual_submission_package,
)

logger = logging.getLogger("bhoomi.reports")
router = APIRouter()

# Directory for storing citizen-uploaded media files
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "reports"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png"}
ALLOWED_VIDEO_EXTS = {".mp4"}

# In-memory store (thread-safe dictionary for operational runtime)
_reports_store: dict[str, dict] = {}


def save_media_file(file: UploadFile, is_video: bool = False) -> str:
    """Validate media type and size constraints, saving file to upload directory."""
    raw_filename = file.filename or ""
    ext = Path(raw_filename).suffix.lower()
    allowed_exts = ALLOWED_VIDEO_EXTS if is_video else ALLOWED_IMAGE_EXTS
    max_size = MAX_VIDEO_SIZE_BYTES if is_video else MAX_IMAGE_SIZE_BYTES
    kind = "Video" if is_video else "Image"

    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"{kind} file type not allowed. Allowed extensions: {', '.join(allowed_exts)}",
        )

    file_bytes = file.file.read()
    if len(file_bytes) > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"{kind} file size exceeds maximum limit of {max_mb}MB.",
        )

    mime = (file.content_type or "").lower()
    if is_video and not (mime.startswith("video/") or ext == ".mp4"):
        raise HTTPException(status_code=400, detail="Invalid video content type.")
    if not is_video and not (mime.startswith("image/") or ext in ALLOWED_IMAGE_EXTS):
        raise HTTPException(status_code=400, detail="Invalid image content type.")

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with open(dest, "wb") as f:
        f.write(file_bytes)

    return f"/uploads/reports/{filename}"


@router.post("/reports", summary="Submit citizen incident report", status_code=201)
@limiter.limit("5/minute")
async def create_report(request: Request):
    """
    Submit a new citizen landslide incident report.
    Accepts application/json OR multipart/form-data with media attachments.
    Validated media: images (jpg/png <= 10MB), video (mp4 <= 50MB).
    Saved with initial status: PENDING_REVIEW and full audit history.
    """
    content_type = request.headers.get("content-type", "")
    report_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    media_urls = []
    video_url = None
    photo_url = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        try:
            district = form.get("district")
            state = form.get("state")
            description = form.get("description")
            severity = form.get("severity")
            reporter_name = form.get("reporter_name") or None
            reporter_phone = form.get("reporter_phone") or None
            incident_type = form.get("incident_type") or "Landslide"

            lat_str = form.get("latitude")
            lon_str = form.get("longitude")
            latitude = float(lat_str) if lat_str not in (None, "", "null") else None
            longitude = float(lon_str) if lon_str not in (None, "", "null") else None

            model_in = ReportCreate(
                district=district,
                state=state,
                description=description,
                severity=severity,
                reporter_name=reporter_name,
                reporter_phone=reporter_phone,
                incident_type=incident_type,
                latitude=latitude,
                longitude=longitude,
            )
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=jsonable_encoder(e.errors()))
        except Exception as e:
            raise HTTPException(status_code=422, detail=[{"loc": ["body"], "msg": str(e), "type": "value_error"}])

        # Handle photos (form key 'photos' or 'photo')
        photo_files = form.getlist("photos") or form.getlist("photo")
        for p in photo_files:
            if hasattr(p, "filename") and p.filename:
                saved_url = save_media_file(p, is_video=False)
                media_urls.append(saved_url)
                if not photo_url:
                    photo_url = saved_url

        # Handle video (form key 'video' or 'videos')
        video_files = form.getlist("video") or form.getlist("videos")
        for v in video_files:
            if hasattr(v, "filename") and v.filename:
                saved_url = save_media_file(v, is_video=True)
                media_urls.append(saved_url)
                video_url = saved_url

        report_dict = model_in.model_dump()
        report_dict["photo_url"] = photo_url
        report_dict["video_url"] = video_url
        report_dict["media_urls"] = media_urls

    else:
        # Standard JSON body for backward compatibility
        try:
            body = await request.json()
            model_in = ReportCreate(**body)
            report_dict = model_in.model_dump()
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=jsonable_encoder(e.errors()))
        except Exception as e:
            raise HTTPException(status_code=422, detail=[{"loc": ["body"], "msg": str(e), "type": "value_error"}])

    record = {
        "id": report_id,
        **report_dict,
        "status": ReportStatus.PENDING_REVIEW,
        "verified": False,
        "admin_note": None,
        "government_portal": None,
        "submission_package": None,
        "govt_submission_id": None,
        "history": [
            {
                "from_status": None,
                "to_status": ReportStatus.PENDING_REVIEW,
                "action": "CITIZEN_SUBMIT",
                "actor": "citizen",
                "timestamp": now,
                "note": "Incident report submitted by citizen.",
                "metadata": {
                    "attachments_count": len(report_dict.get("media_urls", [])),
                    "has_video": bool(report_dict.get("video_url")),
                    "has_photo": bool(report_dict.get("photo_url")),
                },
            }
        ],
        "created_at": now,
        "updated_at": now,
    }

    _reports_store[report_id] = record
    logger.info(
        f"Report submitted: {report_id} — {record['district']}/{record['state']} "
        f"[{record['severity']}] status={record['status']} attachments={len(record.get('media_urls', []))}"
    )

    return {
        "success": True,
        "report_id": report_id,
        "status": record["status"],
        "message": "Report received. District officials have been notified. Thank you for keeping NER safe.",
        "report": record,
    }


@router.get("/reports", summary="List citizen reports")
async def list_reports(
    state: Optional[str] = Query(None, description="Filter by state"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    status: Optional[str] = Query(None, description="Filter by report status"),
    verified: Optional[bool] = Query(None, description="Filter by verification status"),
    limit: int = Query(50, ge=1, le=200, description="Max results to return"),
):
    """Retrieve citizen-submitted incident reports with optional filtering."""
    reports = list(_reports_store.values())

    if state:
        reports = [r for r in reports if r["state"].lower() == state.lower()]
    if severity:
        reports = [r for r in reports if r["severity"].upper() == severity.upper()]
    if status:
        reports = [r for r in reports if r.get("status", "").upper() == status.upper()]
    if verified is not None:
        reports = [r for r in reports if r["verified"] == verified]

    reports.sort(key=lambda r: r["created_at"], reverse=True)
    reports = reports[:limit]

    return {"reports": reports, "count": len(reports)}


@router.get("/reports/{report_id}", summary="Get specific report")
async def get_report(report_id: str):
    """Retrieve a specific citizen report by ID."""
    if report_id not in _reports_store:
        raise HTTPException(status_code=404, detail="Report not found")
    return _reports_store[report_id]


@router.patch("/reports/{report_id}/verify", summary="Verify or reject a citizen report", dependencies=[Depends(verify_api_key)])
async def verify_report(
    report_id: str,
    verify_req: Optional[ReportVerifyRequest] = None,
):
    """
    Mark a citizen report as VERIFIED or REJECTED with an optional admin note.
    Protected by X-API-Key auth. Citizens cannot self-verify.
    Once VERIFIED, matches the regional government reporting channel and
    transitions to AWAITING_GOVT_APPROVAL.
    """
    if report_id not in _reports_store:
        raise HTTPException(status_code=404, detail="Report not found")

    report = _reports_store[report_id]
    target_status = verify_req.status.upper() if verify_req else ReportStatus.VERIFIED
    admin_note = verify_req.admin_note if verify_req else None
    now = datetime.utcnow().isoformat()
    old_status = report.get("status", ReportStatus.PENDING_REVIEW)

    if target_status == ReportStatus.VERIFIED:
        # Match government portal based on incident type and location
        portal_info = match_government_portal(
            state=report.get("state", ""),
            district=report.get("district", ""),
            incident_type=report.get("incident_type", "Landslide"),
        )
        report["verified"] = True
        report["admin_note"] = admin_note
        report["government_portal"] = portal_info
        report["verified_at"] = now
        report["updated_at"] = now
        report["status"] = ReportStatus.AWAITING_GOVT_APPROVAL

        report.setdefault("history", []).append({
            "from_status": old_status,
            "to_status": ReportStatus.VERIFIED,
            "action": "ADMIN_VERIFY",
            "actor": "admin",
            "timestamp": now,
            "note": admin_note or "Report marked as verified by admin.",
            "metadata": {
                "matched_portal": portal_info["portal_name"],
                "has_api": portal_info["has_api"],
            },
        })
        report["history"].append({
            "from_status": ReportStatus.VERIFIED,
            "to_status": ReportStatus.AWAITING_GOVT_APPROVAL,
            "action": "QUEUE_FOR_GOVT_APPROVAL",
            "actor": "system",
            "timestamp": now,
            "note": "Queued for explicit human approval before external submission.",
            "metadata": {"portal_name": portal_info["portal_name"]},
        })

        logger.info(f"Report verified: {report_id} -> matched {portal_info['portal_name']} (has_api={portal_info['has_api']})")
        return {
            "message": "Report verified successfully and queued for government escalation approval.",
            "id": report_id,
            "status": report["status"],
            "verified": True,
            "government_portal": portal_info,
            "admin_note": admin_note,
            "report": report,
        }

    elif target_status == ReportStatus.REJECTED:
        report["verified"] = False
        report["status"] = ReportStatus.REJECTED
        report["admin_note"] = admin_note
        report["updated_at"] = now

        report.setdefault("history", []).append({
            "from_status": old_status,
            "to_status": ReportStatus.REJECTED,
            "action": "ADMIN_REJECT",
            "actor": "admin",
            "timestamp": now,
            "note": admin_note or "Report rejected during admin verification.",
        })

        logger.info(f"Report rejected: {report_id} by admin. Note: {admin_note}")
        return {
            "message": "Report marked as rejected.",
            "id": report_id,
            "status": report["status"],
            "verified": False,
            "admin_note": admin_note,
            "report": report,
        }


@router.patch("/reports/{report_id}/approve-govt-submission", summary="Approve government escalation", dependencies=[Depends(verify_api_key)])
async def approve_govt_submission(
    report_id: str,
    approval_req: Optional[GovtApprovalRequest] = None,
):
    """
    Explicit human approval gate before any government-facing action.
    If real API exists for portal -> programmatically submits and stores confirmation ID (SUBMITTED_TO_GOVT).
    If no real API exists -> generates pre-filled submission package and direct portal link (READY_FOR_MANUAL_SUBMISSION).
    """
    if report_id not in _reports_store:
        raise HTTPException(status_code=404, detail="Report not found")

    report = _reports_store[report_id]
    current_status = report.get("status")

    if current_status not in (ReportStatus.AWAITING_GOVT_APPROVAL, ReportStatus.VERIFIED):
        raise HTTPException(
            status_code=400,
            detail=f"Report cannot be escalated from status '{current_status}'. It must be in 'AWAITING_GOVT_APPROVAL'.",
        )

    portal_info = report.get("government_portal")
    if not portal_info:
        portal_info = match_government_portal(
            state=report.get("state", ""),
            district=report.get("district", ""),
            incident_type=report.get("incident_type", "Landslide"),
        )
        report["government_portal"] = portal_info

    now = datetime.utcnow().isoformat()
    notes = approval_req.notes if approval_req else None

    if portal_info.get("has_api"):
        # Programmatic API submission
        submission_res = submit_to_govt_api(portal_info, report)
        submission_id = submission_res["submission_id"]
        report["status"] = ReportStatus.SUBMITTED_TO_GOVT
        report["govt_submission_id"] = submission_id
        report["submitted_at"] = now
        report["updated_at"] = now

        report.setdefault("history", []).append({
            "from_status": current_status,
            "to_status": ReportStatus.SUBMITTED_TO_GOVT,
            "action": "APPROVE_AND_SUBMIT_API",
            "actor": "admin",
            "timestamp": now,
            "note": notes or f"Programmatic submission dispatched to {portal_info['portal_name']}",
            "metadata": {
                "submission_id": submission_id,
                "portal_name": portal_info["portal_name"],
                "api_endpoint": portal_info.get("api_endpoint"),
            },
        })

        return {
            "success": True,
            "id": report_id,
            "status": report["status"],
            "submission_id": submission_id,
            "portal_name": portal_info["portal_name"],
            "mode": "PROGRAMMATIC_API",
            "message": f"Report successfully submitted programmatically to {portal_info['portal_name']}.",
            "report": report,
        }

    else:
        # Honest manual fallback package
        package = build_manual_submission_package(portal_info, report)
        report["status"] = ReportStatus.READY_FOR_MANUAL_SUBMISSION
        report["submission_package"] = package
        report["updated_at"] = now

        report.setdefault("history", []).append({
            "from_status": current_status,
            "to_status": ReportStatus.READY_FOR_MANUAL_SUBMISSION,
            "action": "APPROVE_MANUAL_PACKAGE",
            "actor": "admin",
            "timestamp": now,
            "note": notes or f"Manual submission package prepared for {portal_info['portal_name']}",
            "metadata": {
                "portal_name": portal_info["portal_name"],
                "portal_url": portal_info["url"],
            },
        })

        return {
            "success": True,
            "id": report_id,
            "status": report["status"],
            "portal_name": portal_info["portal_name"],
            "portal_url": portal_info["url"],
            "mode": "MANUAL_SUBMISSION",
            "message": f"No programmatic API available for {portal_info['portal_name']}. Formatted package generated for 1-click manual submission.",
            "submission_package": package,
            "report": report,
        }


@router.get("/reports/{report_id}/history", summary="Get audit trail for a report")
async def get_report_history(report_id: str):
    """Retrieve full chronological audit history of status transitions and admin decisions."""
    if report_id not in _reports_store:
        raise HTTPException(status_code=404, detail="Report not found")
    report = _reports_store[report_id]
    return {
        "report_id": report_id,
        "current_status": report.get("status", ReportStatus.PENDING_REVIEW),
        "history": report.get("history", []),
    }


@router.get("/reports/stats/summary", summary="Report statistics")
async def report_stats():
    """Aggregated statistics on citizen reports."""
    reports = list(_reports_store.values())

    by_severity = {}
    by_state = {}
    by_status = {}
    verified_count = 0

    for r in reports:
        s = r["severity"]
        st = r["state"]
        stat = r.get("status", ReportStatus.PENDING_REVIEW)
        by_severity[s] = by_severity.get(s, 0) + 1
        by_state[st] = by_state.get(st, 0) + 1
        by_status[stat] = by_status.get(stat, 0) + 1
        if r.get("verified"):
            verified_count += 1

    return {
        "total_reports": len(reports),
        "verified": verified_count,
        "unverified": len(reports) - verified_count,
        "by_status": by_status,
        "by_severity": by_severity,
        "by_state": by_state,
    }
