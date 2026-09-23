"""
Tests for BhoomiSafe Citizen Reports Endpoints.
Verifies payload validation, GPS coordinate boundary constraints, and submission flow.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.parametrize("invalid_lat", [91.0, 180.0, 999.0, -90.1, -150.0])
def test_reports_rejects_out_of_bounds_latitude(
    client: TestClient,
    sample_report_payload: dict,
    invalid_lat: float,
):
    """
    Test that POST /api/v1/reports rejects latitude values outside [-90, 90] with 422.
    """
    payload = dict(sample_report_payload)
    payload["latitude"] = invalid_lat
    
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422
    
    data = response.json()
    assert any(err["loc"][-1] == "latitude" for err in data.get("detail", []))


@pytest.mark.parametrize("invalid_lon", [180.1, 250.0, 999.0, -180.1, -200.0])
def test_reports_rejects_out_of_bounds_longitude(
    client: TestClient,
    sample_report_payload: dict,
    invalid_lon: float,
):
    """
    Test that POST /api/v1/reports rejects longitude values outside [-180, 180] with 422.
    """
    payload = dict(sample_report_payload)
    payload["longitude"] = invalid_lon
    
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422
    
    data = response.json()
    assert any(err["loc"][-1] == "longitude" for err in data.get("detail", []))


def test_reports_rejects_non_numeric_coordinates(client: TestClient, sample_report_payload: dict):
    """
    Test that string or non-numeric coordinate values trigger a 422 validation error.
    """
    payload = dict(sample_report_payload)
    payload["latitude"] = "not_a_valid_latitude"
    
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert any(err["loc"][-1] == "latitude" for err in data.get("detail", []))


def test_reports_accepts_valid_gps_and_payload(client: TestClient, sample_report_payload: dict):
    """
    Test that a well-formed report with valid NER GPS coordinates is accepted with 201.
    """
    response = client.post("/api/v1/reports", json=sample_report_payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data.get("success") is True
    assert "report_id" in data
    assert "report" in data
    assert data["report"]["latitude"] == sample_report_payload["latitude"]
    assert data["report"]["longitude"] == sample_report_payload["longitude"]
    assert data["report"]["verified"] is False
