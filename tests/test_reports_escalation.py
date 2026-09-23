"""
BhoomiSafe — Automated Tests for Citizen Report Verification & Government Escalation
====================================================================================
Tests the full multi-stage verification & escalation workflow:
1. Media uploads & size/type validation (images <= 10MB, videos <= 50MB)
2. PENDING_REVIEW initial state
3. Admin verification gate with API key auth (VERIFIED -> AWAITING_GOVT_APPROVAL / REJECTED)
4. Government portal matching lookup
5. Explicit human approval gate (AWAITING_GOVT_APPROVAL -> SUBMITTED_TO_GOVT or READY_FOR_MANUAL_SUBMISSION)
6. Full audit history tracking (GET /reports/{id}/history)
"""

import io
import pytest
from fastapi.testclient import TestClient

ADMIN_HEADERS = {"X-API-Key": "bhoomi-admin-key-2026"}


def test_json_submission_starts_in_pending_review(client: TestClient, sample_report_payload: dict):
    """Confirm standard JSON reports start as PENDING_REVIEW with initial audit log."""
    res = client.post("/api/v1/reports", json=sample_report_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    report = data["report"]
    assert report["status"] == "PENDING_REVIEW"
    assert report["verified"] is False
    assert len(report["history"]) == 1
    assert report["history"][0]["action"] == "CITIZEN_SUBMIT"
    assert report["history"][0]["to_status"] == "PENDING_REVIEW"


def test_multipart_submission_with_photo_and_video(client: TestClient):
    """Test citizen submission with valid photo (JPG) and video (MP4) attachments."""
    fake_photo = io.BytesIO(b"\xff\xd8\xff\xe0" + b"fake_jpeg_content" * 100)
    fake_video = io.BytesIO(b"\x00\x00\x00\x18ftypmp42" + b"fake_mp4_content" * 100)

    form_data = {
        "district": "Cherrapunji",
        "state": "Meghalaya",
        "description": "Massive rockfall on sohra bypass road blocking both lanes.",
        "severity": "CRITICAL",
        "incident_type": "Rockfall",
        "reporter_name": "Kynsai Lyngdoh",
        "reporter_phone": "+919436123456",
        "latitude": "25.2833",
        "longitude": "91.7167",
    }
    files = [
        ("photos", ("damage_evidence.jpg", fake_photo, "image/jpeg")),
        ("video", ("slope_creep.mp4", fake_video, "video/mp4")),
    ]

    res = client.post("/api/v1/reports", data=form_data, files=files)
    assert res.status_code == 201
    data = res.json()
    report = data["report"]
    assert report["status"] == "PENDING_REVIEW"
    assert report["photo_url"] is not None
    assert report["photo_url"].endswith(".jpg")
    assert report["video_url"] is not None
    assert report["video_url"].endswith(".mp4")
    assert len(report["media_urls"]) == 2


def test_media_upload_rejects_unauthorized_extension(client: TestClient):
    """Disallowed media extension (e.g. .exe or .pdf) triggers HTTP 400."""
    fake_exe = io.BytesIO(b"MZfakeexecutablebinary")
    form_data = {
        "district": "Guwahati",
        "state": "Assam",
        "description": "Culvert overflow visible near hillside highway.",
        "severity": "MEDIUM",
    }
    files = [
        ("photos", ("malicious.exe", fake_exe, "application/octet-stream")),
    ]
    res = client.post("/api/v1/reports", data=form_data, files=files)
    assert res.status_code == 400
    assert "file type not allowed" in res.json()["detail"].lower()


def test_media_upload_rejects_oversized_image(client: TestClient):
    """Image larger than 10MB must be rejected with HTTP 400."""
    # 10MB + 1KB
    large_bytes = b"X" * (10 * 1024 * 1024 + 1024)
    fake_huge_photo = io.BytesIO(large_bytes)
    form_data = {
        "district": "Aizawl",
        "state": "Mizoram",
        "description": "Cracks expanding across slope foundation.",
        "severity": "HIGH",
    }
    files = [
        ("photos", ("huge_pic.png", fake_huge_photo, "image/png")),
    ]
    res = client.post("/api/v1/reports", data=form_data, files=files)
    assert res.status_code == 400
    assert "exceeds maximum limit" in res.json()["detail"].lower()


def test_admin_verification_requires_api_key(client: TestClient, sample_report_payload: dict):
    """Unauthenticated citizen or client cannot verify reports."""
    sub = client.post("/api/v1/reports", json=sample_report_payload).json()
    report_id = sub["report_id"]

    # Without header
    res_no_auth = client.patch(f"/api/v1/reports/{report_id}/verify", json={"status": "VERIFIED"})
    assert res_no_auth.status_code in (401, 403)

    # With invalid header
    res_bad_auth = client.patch(
        f"/api/v1/reports/{report_id}/verify",
        headers={"X-API-Key": "wrong-key"},
        json={"status": "VERIFIED"},
    )
    assert res_bad_auth.status_code == 403


def test_end_to_end_verification_and_api_escalation(client: TestClient):
    """
    Test complete lifecycle for an API-enabled state (Meghalaya):
    PENDING_REVIEW -> VERIFIED -> AWAITING_GOVT_APPROVAL -> SUBMITTED_TO_GOVT
    """
    # 1. Citizen submits report in Meghalaya
    payload = {
        "district": "East Khasi Hills",
        "state": "Meghalaya",
        "description": "Severe debris flow on Shillong bypass. Vehicles stopped.",
        "severity": "CRITICAL",
        "incident_type": "Landslide",
        "latitude": 25.5788,
        "longitude": 91.8933,
    }
    sub = client.post("/api/v1/reports", json=payload).json()
    report_id = sub["report_id"]
    assert sub["status"] == "PENDING_REVIEW"

    # Verify cannot escalate before admin verification
    esc_premature = client.patch(
        f"/api/v1/reports/{report_id}/approve-govt-submission",
        headers=ADMIN_HEADERS,
        json={"action": "APPROVE"},
    )
    assert esc_premature.status_code == 400
    assert "must be in 'awaiting_govt_approval'" in esc_premature.json()["detail"].lower()

    # 2. Admin verifies report with note
    ver_res = client.patch(
        f"/api/v1/reports/{report_id}/verify",
        headers=ADMIN_HEADERS,
        json={
            "status": "VERIFIED",
            "admin_note": "Confirmed with Meghalaya Emergency Operations Center.",
        },
    )
    assert ver_res.status_code == 200
    ver_data = ver_res.json()
    assert ver_data["status"] == "AWAITING_GOVT_APPROVAL"
    assert ver_data["verified"] is True
    assert ver_data["government_portal"]["has_api"] is True
    assert "MSDMA" in ver_data["government_portal"]["portal_name"]

    # 3. Admin explicitly approves government escalation
    appr_res = client.patch(
        f"/api/v1/reports/{report_id}/approve-govt-submission",
        headers=ADMIN_HEADERS,
        json={"action": "APPROVE", "notes": "Immediate SDMA deployment requested."},
    )
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "SUBMITTED_TO_GOVT"
    assert appr_data["mode"] == "PROGRAMMATIC_API"
    assert "submission_id" in appr_data
    assert appr_data["submission_id"].startswith("MSDMA-")

    # 4. Check full audit history
    hist_res = client.get(f"/api/v1/reports/{report_id}/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert hist["current_status"] == "SUBMITTED_TO_GOVT"
    actions = [h["action"] for h in hist["history"]]
    assert actions == [
        "CITIZEN_SUBMIT",
        "ADMIN_VERIFY",
        "QUEUE_FOR_GOVT_APPROVAL",
        "APPROVE_AND_SUBMIT_API",
    ]


def test_end_to_end_verification_and_manual_escalation_fallback(client: TestClient):
    """
    Test complete lifecycle for a manual-portal state (Assam / ASDMA):
    PENDING_REVIEW -> VERIFIED -> AWAITING_GOVT_APPROVAL -> READY_FOR_MANUAL_SUBMISSION
    """
    # 1. Citizen submits report in Assam
    payload = {
        "district": "Silchar",
        "state": "Assam",
        "description": "Hillside erosion near highway embankment.",
        "severity": "HIGH",
        "incident_type": "Landslide",
        "latitude": 24.8333,
        "longitude": 92.8,
    }
    sub = client.post("/api/v1/reports", json=payload).json()
    report_id = sub["report_id"]

    # 2. Admin verifies report
    ver_res = client.patch(
        f"/api/v1/reports/{report_id}/verify",
        headers=ADMIN_HEADERS,
        json={"status": "VERIFIED", "admin_note": "Verified by Cachar district officer."},
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["government_portal"]["has_api"] is False
    assert "ASDMA" in ver_res.json()["government_portal"]["portal_name"]

    # 3. Admin approves escalation -> honest manual fallback package
    appr_res = client.patch(
        f"/api/v1/reports/{report_id}/approve-govt-submission",
        headers=ADMIN_HEADERS,
        json={"action": "APPROVE"},
    )
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "READY_FOR_MANUAL_SUBMISSION"
    assert appr_data["mode"] == "MANUAL_SUBMISSION"
    assert "portal_url" in appr_data
    assert "https://asdma.assam.gov.in" in appr_data["portal_url"]
    assert "formatted_package" in appr_data["submission_package"]
    assert "BHOOMISAFE VERIFIED INCIDENT BRIEFING PACKAGE" in appr_data["submission_package"]["formatted_package"]

    # 4. Check audit history
    hist = client.get(f"/api/v1/reports/{report_id}/history").json()
    assert hist["current_status"] == "READY_FOR_MANUAL_SUBMISSION"
    actions = [h["action"] for h in hist["history"]]
    assert "APPROVE_MANUAL_PACKAGE" in actions


def test_admin_rejection_flow(client: TestClient, sample_report_payload: dict):
    """Test that rejecting a report sets status REJECTED and verified=False."""
    sub = client.post("/api/v1/reports", json=sample_report_payload).json()
    report_id = sub["report_id"]

    rej_res = client.patch(
        f"/api/v1/reports/{report_id}/verify",
        headers=ADMIN_HEADERS,
        json={"status": "REJECTED", "admin_note": "False alarm - construction rubble, not a landslide."},
    )
    assert rej_res.status_code == 200
    rej_data = rej_res.json()
    assert rej_data["status"] == "REJECTED"
    assert rej_data["verified"] is False
    assert "False alarm" in rej_data["admin_note"]

    # Confirm cannot escalate a rejected report
    esc_res = client.patch(
        f"/api/v1/reports/{report_id}/approve-govt-submission",
        headers=ADMIN_HEADERS,
        json={"action": "APPROVE"},
    )
    assert esc_res.status_code == 400
