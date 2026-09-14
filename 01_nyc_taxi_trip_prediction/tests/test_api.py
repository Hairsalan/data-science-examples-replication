"""Integration tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_api_health():
    """Verify health endpoint returns status healthy and models loaded."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["models_loaded"] is True
    assert data["framework"] == "CRISP-DM"


def test_api_estimate():
    """Verify trip estimation endpoint returns valid prediction payload."""
    payload = {
        "pickup_latitude": 40.7580,
        "pickup_longitude": -73.9855,
        "dropoff_latitude": 40.7071,
        "dropoff_longitude": -74.0090,
        "pickup_datetime": "2026-06-15 17:30:00",
        "passenger_count": 2,
    }
    response = client.post("/api/estimate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["fare_amount"] > 3.0
    assert data["trip_duration_minutes"] > 0
    assert data["distance_miles"] > 0
    assert "traffic_congestion_level" in data
    assert "fare_breakdown" in data
    assert "baseline" in data


def test_api_presets():
    """Verify preset routes are returned correctly."""
    response = client.get("/api/presets")
    assert response.status_code == 200
    presets = response.json()
    assert isinstance(presets, list)
    assert len(presets) >= 4
    assert any(p["id"] == "jfk_to_times_square" for p in presets)


def test_api_model_info():
    """Verify model info returns CRISP-DM lifecycle and metrics."""
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "crisp_dm_lifecycle" in data
    assert "metrics" in data
    assert "fare_prediction" in data["metrics"]


def test_api_feature_importance():
    """Verify feature importance returns top features."""
    response = client.get("/api/feature-importance")
    assert response.status_code == 200
    data = response.json()
    assert "fare_model_top_features" in data
    assert len(data["fare_model_top_features"]) > 0


def test_api_serve_index():
    """Verify root endpoint serves HTML content."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "NYC Taxi" in response.text
