"""Configuration settings for NYC Taxi Trip and Fare Prediction."""

import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EDA_PLOTS_DIR = DATA_DIR / "eda_plots"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
FRONTEND_DIR = BASE_DIR / "frontend"

RAW_DATA_FILE = RAW_DATA_DIR / "kaggle_train_sample.csv"
CLEANED_DATA_FILE = PROCESSED_DATA_DIR / "cleaned_trips.csv"
METRICS_FILE = ARTIFACTS_DIR / "metrics.json"
FEATURE_IMPORTANCE_FILE = ARTIFACTS_DIR / "feature_importance.json"
FARE_MODEL_FILE = ARTIFACTS_DIR / "fare_model.joblib"
DURATION_MODEL_FILE = ARTIFACTS_DIR / "duration_model.joblib"
BASELINE_MODEL_FILE = ARTIFACTS_DIR / "baseline_model.joblib"

# Dataset Source
KAGGLE_HF_DATASET_URL = (
    "https://huggingface.co/datasets/JosephFeig/NYC-Taxi/resolve/main/train.csv"
)
SAMPLE_SIZE = 75000  # High quality, fast training sample

# NYC Bounding Box Filter (covers Manhattan, Brooklyn, Queens, Bronx, Staten Island, and NYC airports)
NYC_BOUNDS = {
    "min_lat": 40.50,
    "max_lat": 40.95,
    "min_lon": -74.25,
    "max_lon": -73.70,
}

# Fare and Passenger sanity limits
FARE_BOUNDS = {
    "min_fare": 2.50,
    "max_fare": 250.00,
}

PASSENGER_BOUNDS = {
    "min_passengers": 1,
    "max_passengers": 6,
}

# Key NYC Landmarks (Latitude, Longitude)
NYC_LANDMARKS = {
    "JFK": (40.6413, -73.7781),
    "LGA": (40.7769, -73.8740),
    "EWR": (40.6895, -74.1745),
    "Times_Square": (40.7580, -73.9855),
    "Wall_Street": (40.7071, -74.0090),
    "Central_Park": (40.7829, -73.9654),
    "Grand_Central": (40.7527, -73.9772),
    "Brooklyn_Bridge": (40.7028, -73.9898),
}

# Popular Presets for Frontend & Demos
POPULAR_PRESETS = [
    {
        "id": "jfk_to_times_square",
        "name": "JFK Airport to Times Square",
        "pickup": {"lat": 40.6413, "lon": -73.7781, "name": "JFK Airport"},
        "dropoff": {"lat": 40.7580, "lon": -73.9855, "name": "Times Square"},
    },
    {
        "id": "lga_to_grand_central",
        "name": "LaGuardia Airport to Grand Central",
        "pickup": {"lat": 40.7769, "lon": -73.8740, "name": "LaGuardia Airport"},
        "dropoff": {"lat": 40.7527, "lon": -73.9772, "name": "Grand Central"},
    },
    {
        "id": "dumbo_to_central_park",
        "name": "DUMBO (Brooklyn) to Central Park",
        "pickup": {"lat": 40.7028, "lon": -73.9898, "name": "Brooklyn DUMBO"},
        "dropoff": {"lat": 40.7829, "lon": -73.9654, "name": "Central Park South"},
    },
    {
        "id": "wall_st_to_times_sq",
        "name": "Wall Street to Times Square (Manhattan Cross-town)",
        "pickup": {"lat": 40.7071, "lon": -74.0090, "name": "Wall Street"},
        "dropoff": {"lat": 40.7580, "lon": -73.9855, "name": "Times Square"},
    },
]

# Model Features
FEATURE_COLS = [
    "passenger_count",
    "pickup_longitude",
    "pickup_latitude",
    "dropoff_longitude",
    "dropoff_latitude",
    "haversine_distance_km",
    "haversine_distance_miles",
    "manhattan_distance_km",
    "bearing_degrees",
    "pickup_hour",
    "pickup_dayofweek",
    "pickup_month",
    "is_weekend",
    "is_rush_hour",
    "is_overnight",
    "dist_pickup_jfk",
    "dist_dropoff_jfk",
    "dist_pickup_lga",
    "dist_dropoff_lga",
    "dist_pickup_times_sq",
    "dist_dropoff_times_sq",
    "dist_pickup_wall_st",
    "dist_dropoff_wall_st",
]
