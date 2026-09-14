"""Inference service for NYC Taxi Trip and Fare Prediction (CRISP-DM Phase 6)."""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
import joblib
import pandas as pd
import numpy as np

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import (
    FARE_MODEL_FILE,
    DURATION_MODEL_FILE,
    BASELINE_MODEL_FILE,
    METRICS_FILE,
    FEATURE_IMPORTANCE_FILE,
    FEATURE_COLS,
    POPULAR_PRESETS,
)
from src.feature_engineering import extract_features_single, calculate_haversine
from api.schemas import TripEstimateRequest, TripEstimateResponse, FareBreakdown, BaselineEstimate

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class TaxiPredictionService:
    """Singleton service to load models and perform high-speed predictions."""

    def __init__(self):
        self.fare_model = None
        self.duration_model = None
        self.baseline_models = None
        self.metrics = None
        self.feature_importance = None
        self.load_models()

    def load_models(self):
        """Load serialized models and metadata."""
        if not FARE_MODEL_FILE.exists() or not DURATION_MODEL_FILE.exists():
            logger.warning("Models not found. Triggering training pipeline...")
            from src.train import run_training_pipeline
            run_training_pipeline()

        logger.info("Loading serialized models from disk...")
        self.fare_model = joblib.load(FARE_MODEL_FILE)
        self.duration_model = joblib.load(DURATION_MODEL_FILE)
        
        if BASELINE_MODEL_FILE.exists():
            self.baseline_models = joblib.load(BASELINE_MODEL_FILE)

        if METRICS_FILE.exists():
            with open(METRICS_FILE, "r", encoding="utf-8") as f:
                self.metrics = json.load(f)

        if FEATURE_IMPORTANCE_FILE.exists():
            with open(FEATURE_IMPORTANCE_FILE, "r", encoding="utf-8") as f:
                self.feature_importance = json.load(f)

        logger.info("Models and artifacts successfully loaded.")

    def estimate_trip(self, req: TripEstimateRequest) -> TripEstimateResponse:
        """Estimate fare, duration, distance, and congestion for a trip."""
        dt_str = req.pickup_datetime or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Feature Extraction
        X = extract_features_single(
            pickup_lat=req.pickup_latitude,
            pickup_lon=req.pickup_longitude,
            dropoff_lat=req.dropoff_latitude,
            dropoff_lon=req.dropoff_longitude,
            pickup_datetime=dt_str,
            passenger_count=req.passenger_count,
        )

        # LightGBM Predictions
        fare_pred = float(self.fare_model.predict(X)[0])
        dur_pred = float(self.duration_model.predict(X)[0])

        # Enforce realistic NYC taxi lower bounds
        fare_pred = max(round(fare_pred, 2), 3.00)
        dur_pred = max(round(dur_pred, 1), 90.0)  # at least 1.5 mins
        dur_minutes = round(dur_pred / 60.0, 1)

        # Baseline Predictions for comparison
        baseline_fare = fare_pred
        baseline_dur = dur_pred
        if self.baseline_models:
            try:
                base_fare_pred = float(self.baseline_models["baseline_fare"].predict(X)[0])
                base_dur_pred = float(self.baseline_models["baseline_dur"].predict(X)[0])
                baseline_fare = max(round(base_fare_pred, 2), 3.00)
                baseline_dur = max(round(base_dur_pred, 1), 90.0)
            except Exception as e:
                logger.warning(f"Baseline inference error: {e}")

        # Geospatial & Speed metrics
        dist_km = round(float(X["haversine_distance_km"].iloc[0]), 2)
        dist_miles = round(float(X["haversine_distance_miles"].iloc[0]), 2)
        
        hours = dur_pred / 3600.0
        speed_mph = round((dist_miles / hours), 1) if hours > 0 else 12.0

        # Congestion Level
        is_rush = bool(X["is_rush_hour"].iloc[0] == 1)
        is_night = bool(X["is_overnight"].iloc[0] == 1)
        is_wknd = bool(X["is_weekend"].iloc[0] == 1)

        if speed_mph < 8.0 or (is_rush and speed_mph < 12.0):
            congestion = "Heavy / Peak Congestion"
        elif speed_mph < 16.0:
            congestion = "Moderate City Traffic"
        elif speed_mph < 25.0:
            congestion = "Normal / Flowing"
        else:
            congestion = "Light / Express Highway"

        # NYC Fare Breakdown
        base_charge = 3.00
        surcharges = 2.50 if is_rush else (1.00 if is_night else 0.50)
        distance_fare = max(round(fare_pred - base_charge - surcharges, 2), 0.0)

        fare_breakdown = FareBreakdown(
            base_charge=base_charge,
            distance_fare=distance_fare,
            surcharges=surcharges,
            estimated_total=fare_pred,
            suggested_tip_15=round(fare_pred * 0.15, 2),
            suggested_tip_20=round(fare_pred * 0.20, 2),
        )

        return TripEstimateResponse(
            status="success",
            fare_amount=fare_pred,
            trip_duration_minutes=dur_minutes,
            trip_duration_seconds=dur_pred,
            distance_miles=dist_miles,
            distance_km=dist_km,
            average_speed_mph=speed_mph,
            traffic_congestion_level=congestion,
            is_rush_hour=is_rush,
            is_overnight=is_night,
            is_weekend=is_wknd,
            fare_breakdown=fare_breakdown,
            baseline=BaselineEstimate(
                fare_amount=baseline_fare,
                trip_duration_minutes=round(baseline_dur / 60.0, 1),
                trip_duration_seconds=baseline_dur,
            ),
            timestamp=dt_str,
        )


# Global service instance
prediction_service = TaxiPredictionService()
