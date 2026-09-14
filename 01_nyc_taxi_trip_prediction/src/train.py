"""Training orchestration script for NYC Taxi Trip and Fare models (CRISP-DM Phases 4 & 5)."""

import os
import sys
import logging
import time
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import (
    RAW_DATA_FILE,
    CLEANED_DATA_FILE,
    FEATURE_COLS,
    FARE_MODEL_FILE,
    DURATION_MODEL_FILE,
    BASELINE_MODEL_FILE,
    METRICS_FILE,
    FEATURE_IMPORTANCE_FILE,
    ARTIFACTS_DIR,
)
from src.data_ingestion import download_kaggle_taxi_data
from src.data_cleaning import process_and_save_cleaned_data
from src.feature_engineering import extract_features
from src.models.baseline import BaselineTaxiModel
from src.models.lightgbm_model import LightGBMTaxiModel
from src.models.evaluator import calculate_metrics, save_evaluation_results

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def run_training_pipeline():
    """Execute end-to-end model training, benchmarking, and artifact generation."""
    t0 = time.time()
    logger.info("=================================================================")
    logger.info("  CRISP-DM NYC TAXI TRIP & FARE PREDICTION - MODEL TRAINING PIPELINE")
    logger.info("=================================================================")

    # Step 1: Ingestion & Cleaning check
    if not RAW_DATA_FILE.exists():
        logger.info("Raw dataset not found. Running data ingestion...")
        download_kaggle_taxi_data()

    if not CLEANED_DATA_FILE.exists():
        logger.info("Cleaned dataset not found. Running data cleaning...")
        process_and_save_cleaned_data()

    # Step 2: Load data and engineer features
    logger.info(f"Loading cleaned dataset from {CLEANED_DATA_FILE}...")
    df = pd.read_csv(CLEANED_DATA_FILE)
    logger.info(f"Loaded {len(df)} records. Extracting engineered features...")

    df_feat = extract_features(df, is_training=True)
    logger.info(f"Features engineered: {len(FEATURE_COLS)} feature columns.")

    X = df_feat[FEATURE_COLS]
    y_fare = df_feat["fare_amount"].values
    y_duration = df_feat["trip_duration"].values

    # Step 3: Train / Validation Split (80% / 20%)
    X_train, X_val, y_fare_train, y_fare_val, y_dur_train, y_dur_val = train_test_split(
        X, y_fare, y_duration, test_size=0.20, random_state=42
    )
    logger.info(f"Dataset split: Train={len(X_train)} samples, Validation={len(X_val)} samples.")

    # Step 4: Baseline Models
    logger.info("--- Training Baseline Models (Ridge Regression with Standardization) ---")
    baseline_fare = BaselineTaxiModel(alpha=10.0).fit(X_train, y_fare_train)
    baseline_dur = BaselineTaxiModel(alpha=10.0).fit(X_train, y_dur_train)

    pred_baseline_fare_val = baseline_fare.predict(X_val)
    pred_baseline_dur_val = baseline_dur.predict(X_val)

    metrics_baseline_fare = calculate_metrics(y_fare_val, pred_baseline_fare_val, target_name="fare")
    metrics_baseline_dur = calculate_metrics(y_dur_val, pred_baseline_dur_val, target_name="duration")

    logger.info(f"Baseline Fare Validation RMSE: {metrics_baseline_fare['rmse']}, R2: {metrics_baseline_fare['r2_score']}")
    logger.info(f"Baseline Duration Validation RMSE: {metrics_baseline_dur['rmse']}, R2: {metrics_baseline_dur['r2_score']}")

    # Step 5: LightGBM Fare Model
    logger.info("--- Training LightGBM Fare Regressor with Early Stopping ---")
    lgbm_fare = LightGBMTaxiModel(
        n_estimators=400,
        learning_rate=0.05,
        num_leaves=63,
        subsample=0.85,
        colsample_bytree=0.85,
    )
    lgbm_fare.fit(X_train, y_fare_train, eval_set=(X_val, y_fare_val))
    pred_lgbm_fare_val = lgbm_fare.predict(X_val)
    metrics_lgbm_fare = calculate_metrics(y_fare_val, pred_lgbm_fare_val, target_name="fare")
    logger.info(f"LightGBM Fare Validation RMSE: {metrics_lgbm_fare['rmse']}, RMSLE: {metrics_lgbm_fare['rmsle']}, R2: {metrics_lgbm_fare['r2_score']}")

    # Step 6: LightGBM Duration Model
    logger.info("--- Training LightGBM Duration Regressor with Early Stopping ---")
    lgbm_dur = LightGBMTaxiModel(
        n_estimators=400,
        learning_rate=0.05,
        num_leaves=63,
        subsample=0.85,
        colsample_bytree=0.85,
    )
    lgbm_dur.fit(X_train, y_dur_train, eval_set=(X_val, y_dur_val))
    pred_lgbm_dur_val = lgbm_dur.predict(X_val)
    metrics_lgbm_dur = calculate_metrics(y_dur_val, pred_lgbm_dur_val, target_name="duration")
    logger.info(f"LightGBM Duration Validation RMSE: {metrics_lgbm_dur['rmse']}, RMSLE: {metrics_lgbm_dur['rmsle']}, R2: {metrics_lgbm_dur['r2_score']}")

    # Step 7: Feature Importance
    feature_importance_fare = lgbm_fare.get_feature_importance(importance_type="gain")
    feature_importance_dur = lgbm_dur.get_feature_importance(importance_type="gain")

    # Step 8: Save Artifacts
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(lgbm_fare, FARE_MODEL_FILE)
    joblib.dump(lgbm_dur, DURATION_MODEL_FILE)
    joblib.dump({
        "baseline_fare": baseline_fare,
        "baseline_dur": baseline_dur,
    }, BASELINE_MODEL_FILE)

    fare_comparison = {
        "baseline": metrics_baseline_fare,
        "lightgbm": metrics_lgbm_fare,
        "improvement_pct": {
            "rmse_reduction": round(((metrics_baseline_fare["rmse"] - metrics_lgbm_fare["rmse"]) / metrics_baseline_fare["rmse"]) * 100, 2),
            "mae_reduction": round(((metrics_baseline_fare["mae"] - metrics_lgbm_fare["mae"]) / metrics_baseline_fare["mae"]) * 100, 2),
        },
    }

    duration_comparison = {
        "baseline": metrics_baseline_dur,
        "lightgbm": metrics_lgbm_dur,
        "improvement_pct": {
            "rmse_reduction": round(((metrics_baseline_dur["rmse"] - metrics_lgbm_dur["rmse"]) / metrics_baseline_dur["rmse"]) * 100, 2),
            "mae_reduction": round(((metrics_baseline_dur["mae"] - metrics_lgbm_dur["mae"]) / metrics_baseline_dur["mae"]) * 100, 2),
        },
    }

    combined_feature_importance = {
        "fare_model_top_features": feature_importance_fare,
        "duration_model_top_features": feature_importance_dur,
    }

    save_evaluation_results(
        fare_metrics=fare_comparison,
        duration_metrics=duration_comparison,
        feature_importance=combined_feature_importance,
    )

    elapsed = round(time.time() - t0, 1)
    logger.info("=================================================================")
    logger.info(f" Training Complete in {elapsed}s!")
    logger.info(f" Fare Model RMSE: Baseline={metrics_baseline_fare['rmse']} -> LightGBM={metrics_lgbm_fare['rmse']} ({fare_comparison['improvement_pct']['rmse_reduction']}% improvement)")
    logger.info(f" Duration Model RMSE: Baseline={metrics_baseline_dur['rmse']} -> LightGBM={metrics_lgbm_dur['rmse']} ({duration_comparison['improvement_pct']['rmse_reduction']}% improvement)")
    logger.info(f" Artifacts saved to {ARTIFACTS_DIR}")
    logger.info("=================================================================")


if __name__ == "__main__":
    run_training_pipeline()
