"""
Tests for BhoomiSafe Health Check Endpoints.
Verifies system readiness, API availability, and ML model status reporting.
"""

from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient):
    """
    Test that GET /health returns HTTP 200 OK with expected operational status keys.
    """
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data.get("status") == "ok"
    assert "version" in data
    assert isinstance(data.get("model_loaded"), bool)
    assert data.get("model_source") in ("ensemble_model", "fallback_rule_based", "heuristic_fallback")


def test_api_v1_health_returns_200(client: TestClient):
    """
    Test that the versioned alias GET /api/v1/health also returns HTTP 200 OK.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"


def test_root_endpoint_returns_200(client: TestClient):
    """
    Test that GET / returns HTTP 200 and identifies BhoomiSafe service metadata.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data.get("project") == "BhoomiSafe"
    assert data.get("status") == "running"
