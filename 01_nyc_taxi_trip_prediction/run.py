"""Root runner for NYC Taxi Trip Prediction Application."""

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from src.config import FARE_MODEL_FILE, DURATION_MODEL_FILE


def main():
    """Verify artifacts and launch FastAPI application."""
    print("=================================================================")
    print("  NYC Taxi Trip & Fare Intelligence Service (CRISP-DM Framework)")
    print("=================================================================")

    if not FARE_MODEL_FILE.exists() or not DURATION_MODEL_FILE.exists():
        print("Model artifacts not found. Starting training pipeline first...")
        from src.train import run_training_pipeline
        run_training_pipeline()

    print("\nStarting FastAPI deployment server...")
    print("Interactive Web App:  http://localhost:8000")
    print("API Documentation:    http://localhost:8000/docs")
    print("Health Check:         http://localhost:8000/api/health")
    print("Press CTRL+C to stop the server.\n")

    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    main()
