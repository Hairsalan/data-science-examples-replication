"""Data Cleaning and Quality Assurance module following CRISP-DM Phase 3."""

import os
import sys
import logging
from pathlib import Path
import pandas as pd
import numpy as np

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import (
    RAW_DATA_FILE,
    CLEANED_DATA_FILE,
    PROCESSED_DATA_DIR,
    NYC_BOUNDS,
    FARE_BOUNDS,
    PASSENGER_BOUNDS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def clean_taxi_data(df: pd.DataFrame) -> pd.DataFrame:
    """Apply strict cleaning and quality validation to NYC taxi trips dataset."""
    initial_count = len(df)
    logger.info(f"Starting data cleaning on {initial_count} records...")

    # 1. Drop missing values
    df_clean = df.dropna(subset=[
        "pickup_datetime",
        "pickup_longitude",
        "pickup_latitude",
        "dropoff_longitude",
        "dropoff_latitude",
        "fare_amount",
        "passenger_count",
    ]).copy()
    logger.info(f"Dropped {initial_count - len(df_clean)} rows with null values.")

    # 2. Parse pickup datetime
    df_clean["pickup_datetime"] = pd.to_datetime(df_clean["pickup_datetime"], errors="coerce")
    df_clean = df_clean.dropna(subset=["pickup_datetime"])

    # 3. Filter coordinates within NYC bounding box
    geo_mask = (
        (df_clean["pickup_latitude"] >= NYC_BOUNDS["min_lat"])
        & (df_clean["pickup_latitude"] <= NYC_BOUNDS["max_lat"])
        & (df_clean["pickup_longitude"] >= NYC_BOUNDS["min_lon"])
        & (df_clean["pickup_longitude"] <= NYC_BOUNDS["max_lon"])
        & (df_clean["dropoff_latitude"] >= NYC_BOUNDS["min_lat"])
        & (df_clean["dropoff_latitude"] <= NYC_BOUNDS["max_lat"])
        & (df_clean["dropoff_longitude"] >= NYC_BOUNDS["min_lon"])
        & (df_clean["dropoff_longitude"] <= NYC_BOUNDS["max_lon"])
    )
    dropped_geo = len(df_clean) - geo_mask.sum()
    df_clean = df_clean[geo_mask].copy()
    logger.info(f"Dropped {dropped_geo} rows outside NYC bounding box.")

    # 4. Filter Fare bounds
    fare_mask = (
        (df_clean["fare_amount"] >= FARE_BOUNDS["min_fare"])
        & (df_clean["fare_amount"] <= FARE_BOUNDS["max_fare"])
    )
    dropped_fare = len(df_clean) - fare_mask.sum()
    df_clean = df_clean[fare_mask].copy()
    logger.info(f"Dropped {dropped_fare} rows with invalid fare amounts.")

    # 5. Filter Passenger bounds
    pass_mask = (
        (df_clean["passenger_count"] >= PASSENGER_BOUNDS["min_passengers"])
        & (df_clean["passenger_count"] <= PASSENGER_BOUNDS["max_passengers"])
    )
    dropped_pass = len(df_clean) - pass_mask.sum()
    df_clean = df_clean[pass_mask].copy()
    logger.info(f"Dropped {dropped_pass} rows with invalid passenger count.")

    # 6. Filter zero distance outliers with high fares (abnormal stationary meters)
    coord_diff = (
        np.abs(df_clean["pickup_latitude"] - df_clean["dropoff_latitude"])
        + np.abs(df_clean["pickup_longitude"] - df_clean["dropoff_longitude"])
    )
    same_spot_high_fare = (coord_diff < 0.0001) & (df_clean["fare_amount"] > 10.0)
    df_clean = df_clean[~same_spot_high_fare].copy()

    logger.info(f"Cleaning complete: {len(df_clean)} / {initial_count} ({len(df_clean)/initial_count:.1%}) retained.")
    return df_clean


def process_and_save_cleaned_data(input_file: Path = RAW_DATA_FILE, output_file: Path = CLEANED_DATA_FILE) -> pd.DataFrame:
    """Read raw data, clean it, and save to processed directory."""
    if not input_file.exists():
        raise FileNotFoundError(f"Raw data file not found at {input_file}")

    df_raw = pd.read_csv(input_file)
    df_clean = clean_taxi_data(df_raw)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    df_clean.to_csv(output_file, index=False)
    logger.info(f"Saved cleaned dataset to {output_file}")
    return df_clean


if __name__ == "__main__":
    process_and_save_cleaned_data()
