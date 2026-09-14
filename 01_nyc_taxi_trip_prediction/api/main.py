"""FastAPI Application for NYC Taxi Trip and Fare Prediction (CRISP-DM Phase 6: Deployment)."""

import os
import sys
import json
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import (
    FRONTEND_DIR,
    EDA_PLOTS_DIR,
    POPULAR_PRESETS,
    METRICS_FILE,
    FEATURE_IMPORTANCE_FILE,
)
from api.schemas import TripEstimateRequest, TripEstimateResponse, ModelInfoResponse
from api.service import prediction_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NYC Taxi Trip & Fare Intelligence API",
    description="End-to-end Machine Learning deployment for NYC Taxi trip duration and fare estimation following CRISP-DM.",
    version="1.0.0",
)

# Enable CORS for flexible frontend integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "nyc-taxi-prediction-api",
        "models_loaded": prediction_service.fare_model is not None,
        "framework": "CRISP-DM",
    }


@app.post("/api/estimate", response_model=TripEstimateResponse)
def estimate_trip(request: TripEstimateRequest):
    """Estimate trip duration, fare, distance, and congestion using LightGBM models."""
    try:
        response = prediction_service.estimate_trip(request)
        return response
    except Exception as e:
        logger.error(f"Error estimating trip: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model-info")
def get_model_info():
    """Return model architecture details, evaluation metrics, and CRISP-DM overview."""
    metrics_data = {}
    if METRICS_FILE.exists():
        with open(METRICS_FILE, "r", encoding="utf-8") as f:
            metrics_data = json.load(f)

    return {
        "project_name": "NYC Taxi Trip & Fare Prediction",
        "crisp_dm_lifecycle": {
            "1_business_understanding": "Predict accurate trip durations and taxi fares for dispatchers, drivers, and riders across NYC.",
            "2_data_understanding": "Analyzed 74,800+ real-world Kaggle NYC Taxi challenge records; generated distributions, heatmaps, and spatial bounds.",
            "3_data_preparation": "Filtered NYC bounding box, removed anomalous coordinates/fares, engineered Haversine, Manhattan distance, bearing, landmark airport distances, and rush-hour features.",
            "4_modeling": "Trained LightGBM Gradient Boosted Trees with log1p transformation alongside Baseline Ridge Regression with early stopping.",
            "5_evaluation": "Evaluated on RMSE, RMSLE, MAE, R², and business accuracy tolerance thresholds; verified 51%+ error reduction over baseline.",
            "6_deployment": "FastAPI microservice backend paired with Leaflet.js interactive mapping, turn-by-turn route tracing, and real-time inference.",
        },
        "models": {
            "primary": "LightGBM Regressor (log1p target transformed)",
            "baseline": "Standardized Ridge Regression (alpha=10.0)",
        },
        "metrics": metrics_data,
    }


@app.get("/api/feature-importance")
def get_feature_importance():
    """Return top predictive features for Fare and Duration models."""
    if FEATURE_IMPORTANCE_FILE.exists():
        with open(FEATURE_IMPORTANCE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "Feature importance not found."}


@app.get("/api/eda-summary")
def get_eda_summary():
    """Return summary statistics generated during EDA phase."""
    summary_file = EDA_PLOTS_DIR / "eda_summary.json"
    if summary_file.exists():
        with open(summary_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "EDA summary not found."}


@app.get("/api/presets")
def get_route_presets():
    """Return popular NYC trip presets for rapid map testing."""
    return POPULAR_PRESETS


# Mount static files and EDA plots
if EDA_PLOTS_DIR.exists():
    app.mount("/plots", StaticFiles(directory=str(EDA_PLOTS_DIR)), name="plots")

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
def serve_index():
    """Serve the interactive web frontend."""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse({
        "message": "Frontend index.html is being prepared. Access API documentation at /docs",
        "api_docs": "/docs",
    })
