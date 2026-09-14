"""LightGBM Gradient Boosted Tree models for Fare & Trip Duration prediction (CRISP-DM Phase 4)."""

import os
import sys
import logging
from pathlib import Path
import numpy as np
import lightgbm as lgb

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class LightGBMTaxiModel:
    """Production-grade LightGBM Regressor with log1p target optimization."""

    def __init__(
        self,
        n_estimators: int = 350,
        learning_rate: float = 0.05,
        num_leaves: int = 63,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        random_state: int = 42,
    ):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.num_leaves = num_leaves
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.random_state = random_state

        self.model = lgb.LGBMRegressor(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            num_leaves=self.num_leaves,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            random_state=self.random_state,
            n_jobs=-1,
            verbosity=-1,
        )
        self.feature_names = None

    def fit(self, X, y, eval_set=None):
        """Fit model on log1p(y) to directly optimize RMSLE and guarantee positive outputs."""
        self.feature_names = list(X.columns) if hasattr(X, "columns") else [f"f_{i}" for i in range(X.shape[1])]
        y_log = np.log1p(np.maximum(y, 0))

        callbacks = [lgb.early_stopping(stopping_rounds=30, verbose=False)] if eval_set is not None else None
        
        if eval_set is not None:
            X_val, y_val = eval_set
            y_val_log = np.log1p(np.maximum(y_val, 0))
            self.model.fit(
                X,
                y_log,
                eval_set=[(X_val, y_val_log)],
                callbacks=callbacks,
            )
        else:
            self.model.fit(X, y_log)

        return self

    def predict(self, X) -> np.ndarray:
        """Predict and transform back via expm1."""
        pred_log = self.model.predict(X)
        return np.expm1(np.maximum(pred_log, 0))

    def get_feature_importance(self, importance_type: str = "gain") -> dict:
        """Return dict of feature names to importance scores sorted descending."""
        if self.feature_names is None or not hasattr(self.model, "booster_"):
            return {}
        scores = self.model.booster_.feature_importance(importance_type=importance_type)
        importance_dict = {name: float(score) for name, score in zip(self.feature_names, scores)}
        return dict(sorted(importance_dict.items(), key=lambda item: item[1], reverse=True))
