"""Unit tests for data cleaning module."""

import pytest
import pandas as pd
import numpy as np
from src.data_cleaning import clean_taxi_data
from src.config import NYC_BOUNDS, FARE_BOUNDS


def test_clean_taxi_data_filters_nulls():
    """Verify that rows with missing essential columns are dropped."""
    df = pd.DataFrame([
        {
            "pickup_datetime": "2016-01-01 12:00:00",
            "pickup_longitude": -73.9855,
            "pickup_latitude": 40.7580,
            "dropoff_longitude": -73.7781,
            "dropoff_latitude": 40.6413,
            "fare_amount": 25.0,
            "passenger_count": 1,
        },
        {
            "pickup_datetime": "2016-01-01 12:00:00",
            "pickup_longitude": None,
            "pickup_latitude": 40.7580,
            "dropoff_longitude": -73.7781,
            "dropoff_latitude": 40.6413,
            "fare_amount": 25.0,
            "passenger_count": 1,
        },
    ])
    cleaned = clean_taxi_data(df)
    assert len(cleaned) == 1


def test_clean_taxi_data_bounds():
    """Verify coordinates outside NYC bounds are eliminated."""
    df = pd.DataFrame([
        {  # Valid NYC coordinate (Times Square to JFK)
            "pickup_datetime": "2016-01-01 12:00:00",
            "pickup_longitude": -73.9855,
            "pickup_latitude": 40.7580,
            "dropoff_longitude": -73.7781,
            "dropoff_latitude": 40.6413,
            "fare_amount": 35.0,
            "passenger_count": 1,
        },
        {  # Out of bounds coordinate (0, 0)
            "pickup_datetime": "2016-01-01 12:00:00",
            "pickup_longitude": 0.0,
            "pickup_latitude": 0.0,
            "dropoff_longitude": -73.7781,
            "dropoff_latitude": 40.6413,
            "fare_amount": 20.0,
            "passenger_count": 1,
        },
        {  # Invalid fare (< $2.50)
            "pickup_datetime": "2016-01-01 12:00:00",
            "pickup_longitude": -73.9855,
            "pickup_latitude": 40.7580,
            "dropoff_longitude": -73.7781,
            "dropoff_latitude": 40.6413,
            "fare_amount": -5.0,
            "passenger_count": 1,
        },
    ])
    cleaned = clean_taxi_data(df)
    assert len(cleaned) == 1
    assert cleaned.iloc[0]["fare_amount"] == 35.0
