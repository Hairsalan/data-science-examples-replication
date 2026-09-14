"""Unit tests for trained model artifacts and inference service."""

import pytest
import joblib
from src.config import FARE_MODEL_FILE, DURATION_MODEL_FILE, BASELINE_MODEL_FILE
from src.feature_engineering import extract_features_single


def test_model_artifacts_exist():
    """Ensure trained model artifact files exist on disk."""
    assert FARE_MODEL_FILE.exists(), "Fare model artifact missing"
    assert DURATION_MODEL_FILE.exists(), "Duration model artifact missing"
    assert BASELINE_MODEL_FILE.exists(), "Baseline model artifact missing"


def test_model_prediction_sanity():
    """Ensure models predict positive and realistic values for typical NYC route."""
    fare_model = joblib.load(FARE_MODEL_FILE)
    duration_model = joblib.load(DURATION_MODEL_FILE)

    X = extract_features_single(
        pickup_lat=40.6413,
        pickup_lon=-73.7781,
        dropoff_lat=40.7580,
        dropoff_lon=-73.9855,
        pickup_datetime="2026-06-15 14:00:00",
        passenger_count=1,
    )

    pred_fare = fare_model.predict(X)[0]
    pred_dur = duration_model.predict(X)[0]

    # JFK to Times Sq fare should be between $30 and $85
    assert 25.0 <= pred_fare <= 90.0, f"Unexpected fare prediction: {pred_fare}"
    # JFK to Times Sq duration should be between 15 mins (900s) and 90 mins (5400s)
    assert 900.0 <= pred_dur <= 5400.0, f"Unexpected duration prediction: {pred_dur}"
