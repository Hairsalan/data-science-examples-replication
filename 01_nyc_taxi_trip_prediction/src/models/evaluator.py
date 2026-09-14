"""Model Evaluation and Metrics calculation following CRISP-DM Phase 5."""

import os
import sys
import json
import logging
from pathlib import Path
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.config import METRICS_FILE, FEATURE_IMPORTANCE_FILE

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, target_name: str = "fare") -> dict:
    """Calculate comprehensive regression metrics for NYC taxi prediction."""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    # Ensure non-negative predictions for metrics
    y_pred_clipped = np.maximum(y_pred, 0)
    y_true_clipped = np.maximum(y_true, 0)

    # Standard metrics
    mse = mean_squared_error(y_true, y_pred)
    rmse = float(np.sqrt(mse))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))

    # Official Kaggle Competition metric: RMSLE (Root Mean Squared Log Error)
    rmsle = float(np.sqrt(mean_squared_error(np.log1p(y_true_clipped), np.log1p(y_pred_clipped))))

    # Business-specific accuracy thresholds
    abs_errors = np.abs(y_true - y_pred)
    if target_name == "fare":
        within_2_dollars = float(np.mean(abs_errors <= 2.0) * 100)
        within_5_dollars = float(np.mean(abs_errors <= 5.0) * 100)
        business_metrics = {
            "within_2_dollars_pct": round(within_2_dollars, 2),
            "within_5_dollars_pct": round(within_5_dollars, 2),
        }
    else:
        # Duration: errors in minutes
        within_2_mins = float(np.mean(abs_errors <= 120.0) * 100)
        within_5_mins = float(np.mean(abs_errors <= 300.0) * 100)
        business_metrics = {
            "within_2_mins_pct": round(within_2_mins, 2),
            "within_5_mins_pct": round(within_5_mins, 2),
        }

    metrics = {
        "rmse": round(rmse, 4),
        "rmsle": round(rmsle, 4),
        "mae": round(mae, 4),
        "r2_score": round(r2, 4),
        **business_metrics,
    }
    return metrics


def save_evaluation_results(
    fare_metrics: dict,
    duration_metrics: dict,
    feature_importance: dict,
    metrics_path: Path = METRICS_FILE,
    importance_path: Path = FEATURE_IMPORTANCE_FILE,
):
    """Save evaluation metrics and feature importances as JSON artifacts."""
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    all_metrics = {
        "fare_prediction": fare_metrics,
        "trip_duration_prediction": duration_metrics,
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)

    with open(importance_path, "w", encoding="utf-8") as f:
        json.dump(feature_importance, f, indent=2)

    logger.info(f"Saved evaluation metrics to {metrics_path}")
    logger.info(f"Saved feature importances to {importance_path}")
