"""Unit tests for feature engineering module."""

import pytest
import numpy as np
from src.feature_engineering import (
    calculate_haversine,
    calculate_manhattan_distance,
    calculate_bearing,
    extract_features_single,
)
from src.config import FEATURE_COLS


def test_haversine_distance():
    """Verify haversine distance calculation."""
    # Distance between JFK (40.6413, -73.7781) and Times Square (40.7580, -73.9855) is ~21 km
    dist = calculate_haversine(40.6413, -73.7781, 40.7580, -73.9855)
    assert 20.0 <= dist <= 23.0

    # Same point distance should be 0
    zero_dist = calculate_haversine(40.7580, -73.9855, 40.7580, -73.9855)
    assert np.isclose(zero_dist, 0.0, atol=1e-5)


def test_manhattan_distance():
    """Verify Manhattan distance is greater than or equal to Euclidean/Haversine."""
    lat1, lon1 = 40.7580, -73.9855
    lat2, lon2 = 40.7071, -74.0090
    haversine = calculate_haversine(lat1, lon1, lat2, lon2)
    manhattan = calculate_manhattan_distance(lat1, lon1, lat2, lon2)
    assert manhattan >= haversine


def test_extract_features_single():
    """Verify single inference feature vector extraction matches model features."""
    feat_df = extract_features_single(
        pickup_lat=40.6413,
        pickup_lon=-73.7781,
        dropoff_lat=40.7580,
        dropoff_lon=-73.9855,
        pickup_datetime="2026-06-15 18:30:00",
        passenger_count=2,
    )
    assert len(feat_df) == 1
    assert list(feat_df.columns) == FEATURE_COLS
    assert feat_df["is_rush_hour"].iloc[0] == 1
    assert feat_df["is_overnight"].iloc[0] == 0
    assert feat_df["passenger_count"].iloc[0] == 2
