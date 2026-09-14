"""Exploratory Data Analysis (EDA) module for CRISP-DM Phase 2 (Data Understanding)."""

import os
import sys
import json
import logging
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import CLEANED_DATA_FILE, EDA_PLOTS_DIR
from src.feature_engineering import extract_features

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def generate_eda_visualizations(df: pd.DataFrame, output_dir: Path = EDA_PLOTS_DIR) -> dict:
    """Generate professional EDA plots and statistical summaries."""
    output_dir.mkdir(parents=True, exist_ok=True)
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({"font.size": 11, "figure.autolayout": True})

    # 1. Fare Amount Distribution
    plt.figure(figsize=(9, 5))
    sns.histplot(df["fare_amount"], bins=60, kde=True, color="#2563eb", edgecolor="white")
    plt.title("NYC Taxi Fare Amount Distribution ($ USD)", fontsize=14, fontweight="bold", pad=12)
    plt.xlabel("Fare Amount ($)")
    plt.ylabel("Trip Count")
    plt.xlim(0, 70)
    plt.axvline(df["fare_amount"].median(), color="#ef4444", linestyle="--", label=f"Median: ${df['fare_amount'].median():.2f}")
    plt.axvline(df["fare_amount"].mean(), color="#f59e0b", linestyle=":", label=f"Mean: ${df['fare_amount'].mean():.2f}")
    plt.legend()
    fare_plot_path = output_dir / "fare_distribution.png"
    plt.savefig(fare_plot_path, dpi=150)
    plt.close()

    # 2. Haversine Distance vs Fare Amount
    plt.figure(figsize=(9, 5))
    sample_for_scatter = df.sample(n=min(5000, len(df)), random_state=42)
    sns.scatterplot(
        data=sample_for_scatter,
        x="haversine_distance_miles",
        y="fare_amount",
        hue="is_rush_hour",
        palette={0: "#3b82f6", 1: "#ef4444"},
        alpha=0.6,
        s=25,
    )
    plt.title("Trip Distance vs Fare Amount ($) with Rush Hour Distinction", fontsize=14, fontweight="bold", pad=12)
    plt.xlabel("Haversine Distance (Miles)")
    plt.ylabel("Fare Amount ($)")
    plt.xlim(0, 20)
    plt.ylim(0, 80)
    plt.legend(title="Rush Hour", labels=["Regular", "Rush Hour"])
    scatter_plot_path = output_dir / "distance_vs_fare.png"
    plt.savefig(scatter_plot_path, dpi=150)
    plt.close()

    # 3. Hourly Pickup Density
    plt.figure(figsize=(10, 5))
    hourly_counts = df["pickup_hour"].value_counts().sort_index()
    bar_colors = ["#f87171" if h in [7, 8, 9, 16, 17, 18, 19] else "#60a5fa" for h in hourly_counts.index]
    plt.bar(hourly_counts.index, hourly_counts.values, color=bar_colors, edgecolor="none", width=0.7)
    plt.title("NYC Taxi Pickups by Hour of Day (Rush Hours Highlighted)", fontsize=14, fontweight="bold", pad=12)
    plt.xlabel("Hour of Day (0 - 23)")
    plt.ylabel("Total Pickups")
    plt.xticks(range(0, 24))
    hourly_plot_path = output_dir / "hourly_pickups.png"
    plt.savefig(hourly_plot_path, dpi=150)
    plt.close()

    # 4. Correlation Matrix
    plt.figure(figsize=(10, 8))
    corr_cols = [
        "fare_amount",
        "trip_duration",
        "haversine_distance_miles",
        "manhattan_distance_km",
        "passenger_count",
        "pickup_hour",
        "is_rush_hour",
        "dist_pickup_jfk",
        "dist_dropoff_jfk",
    ]
    corr_matrix = df[corr_cols].corr()
    sns.heatmap(corr_matrix, annot=True, fmt=".2f", cmap="coolwarm", cbar=True, square=True, linewidths=0.5)
    plt.title("Feature Correlation Heatmap", fontsize=14, fontweight="bold", pad=12)
    corr_plot_path = output_dir / "correlation_matrix.png"
    plt.savefig(corr_plot_path, dpi=150)
    plt.close()

    # 5. Statistical Summary JSON
    summary = {
        "total_records": int(len(df)),
        "mean_fare": round(float(df["fare_amount"].mean()), 2),
        "median_fare": round(float(df["fare_amount"].median()), 2),
        "std_fare": round(float(df["fare_amount"].std()), 2),
        "mean_distance_miles": round(float(df["haversine_distance_miles"].mean()), 2),
        "median_distance_miles": round(float(df["haversine_distance_miles"].median()), 2),
        "mean_duration_minutes": round(float(df["trip_duration"].mean() / 60.0), 1),
        "peak_pickup_hour": int(df["pickup_hour"].value_counts().idxmax()),
        "rush_hour_pct": round(float(df["is_rush_hour"].mean() * 100), 1),
        "weekend_pct": round(float(df["is_weekend"].mean() * 100), 1),
    }

    summary_file = output_dir / "eda_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    logger.info(f"EDA visual plots and summary saved to {output_dir}")
    return summary


def run_eda():
    """Run full EDA pipeline on cleaned dataset."""
    logger.info(f"Loading cleaned dataset from {CLEANED_DATA_FILE}...")
    df = pd.read_csv(CLEANED_DATA_FILE)
    df_feat = extract_features(df, is_training=True)
    summary = generate_eda_visualizations(df_feat)
    logger.info(f"EDA Summary: {summary}")


if __name__ == "__main__":
    run_eda()
