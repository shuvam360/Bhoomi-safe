"""
Tests for BhoomiSafe Prediction Endpoints.
Verifies AI landslide inference, validation error handling, and output schemas.
"""

from fastapi.testclient import TestClient


def test_predict_returns_valid_probability_for_correct_input(client: TestClient, sample_prediction_payload: dict):
    """
    Test that POST /api/v1/predict returns 200 and a valid probability in [0, 1]
    along with corresponding risk classification and model version.
    """
    response = client.post("/api/v1/predict", json=sample_prediction_payload)
    assert response.status_code == 200
    
    data = response.json()
    
    # Check probability bounds
    assert "probability" in data
    assert isinstance(data["probability"], (int, float))
    assert 0.0 <= data["probability"] <= 1.0
    
    # Check risk classification
    assert data.get("risk_level") in ("LOW", "MODERATE", "HIGH", "VERY_HIGH")
    assert data.get("risk_code") in (1, 2, 3, 4)
    assert isinstance(data.get("risk_color"), str)
    assert data.get("risk_color").startswith("#")
    assert isinstance(data.get("trigger_alert"), bool)
    
    # Check versioning and source
    assert "model_version" in data
    assert data.get("model_version").startswith("v")
    assert data.get("source") in ("ensemble_model", "heuristic_fallback", "fallback_rule_based")


def test_predict_returns_422_for_empty_body(client: TestClient):
    """
    Test that POST /api/v1/predict returns 422 Unprocessable Entity when body is empty.
    """
    response = client.post("/api/v1/predict", json={})
    assert response.status_code == 422
    
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)
    missing_fields = {err["loc"][-1] for err in data["detail"] if err.get("type") == "missing"}
    assert "rainfall_24h_mm" in missing_fields
    assert "slope_degrees" in missing_fields


def test_predict_returns_422_for_missing_required_fields(client: TestClient, sample_prediction_payload: dict):
    """
    Test that omitting any critical geotechnical or meteorological parameter triggers 422.
    """
    # Remove rainfall_24h_mm
    incomplete_payload = dict(sample_prediction_payload)
    del incomplete_payload["rainfall_24h_mm"]
    
    response = client.post("/api/v1/predict", json=incomplete_payload)
    assert response.status_code == 422
    data = response.json()
    assert any(err["loc"][-1] == "rainfall_24h_mm" for err in data["detail"])

    # Remove slope_degrees
    incomplete_slope = dict(sample_prediction_payload)
    del incomplete_slope["slope_degrees"]
    
    response_slope = client.post("/api/v1/predict", json=incomplete_slope)
    assert response_slope.status_code == 422
    data_slope = response_slope.json()
    assert any(err["loc"][-1] == "slope_degrees" for err in data_slope["detail"])


def test_predict_returns_422_for_inconsistent_rainfall(client: TestClient, sample_prediction_payload: dict):
    """
    Test that custom field validator catches 72h rainfall strictly less than 24h rainfall.
    """
    bad_rainfall = dict(sample_prediction_payload)
    bad_rainfall["rainfall_24h_mm"] = 200.0
    bad_rainfall["rainfall_72h_mm"] = 100.0  # Invalid: 72h cannot be less than 24h
    
    response = client.post("/api/v1/predict", json=bad_rainfall)
    assert response.status_code == 422
