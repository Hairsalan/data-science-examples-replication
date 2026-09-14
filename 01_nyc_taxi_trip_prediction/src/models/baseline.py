"""Baseline regression models for benchmark comparison (CRISP-DM Phase 4)."""

import os
import sys
import logging
from pathlib import Path
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class BaselineTaxiModel:
    """Linear Baseline model using Ridge Regression with feature scaling."""

    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("regressor", Ridge(alpha=self.alpha)),
        ])

    def fit(self, X, y):
        """Fit model with log1p target transformation to enforce non-negativity."""
        y_log = np.log1p(np.maximum(y, 0))
        self.pipeline.fit(X, y_log)
        return self

    def predict(self, X):
        """Predict and invert log1p transformation."""
        pred_log = self.pipeline.predict(X)
        return np.expm1(np.maximum(pred_log, 0))
