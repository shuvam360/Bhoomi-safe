"""
BhoomiSafe — Inference / Prediction Module
Loads the trained ensemble model and exposes a predict() interface.
"""

import os
import sys
import json
import pickle
import warnings
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
from ml.feature_engineering import prepare_input, FEATURE_COLUMNS

# ─────────────────────────────────────────────
# Model Loading
# ─────────────────────────────────────────────
MODELS_DIR = Path(__file__).parent / "saved_models"
MODEL_PATH = MODELS_DIR / "bhoomi_ensemble.pkl"
METRICS_PATH = MODELS_DIR / "metrics.json"

_model_cache = None  # Singleton cache


def get_model_version() -> str:
    """Read version string from metrics.json with fallback."""
    if METRICS_PATH.exists():
        try:
            with open(METRICS_PATH, "r") as f:
                data = json.load(f)
                return data.get("model_version", "v2.1.0")
        except Exception:
            pass
    return "v2.1.0"


def load_model():
    """Load model from disk (cached after first load)."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    
    if not MODEL_PATH.exists():
        warnings.warn(
            f"Model not found at {MODEL_PATH}. "
            "Run ml/train.py to train the model first. "
            "Falling back to heuristic rule-based predictor."
        )
        return None
    
    with open(MODEL_PATH, "rb") as f:
        _model_cache = pickle.load(f)
    
    return _model_cache


# ─────────────────────────────────────────────
# Risk Level Mapping
# ─────────────────────────────────────────────
def probability_to_risk_level(prob: float) -> dict:
    """
    Map prediction probability to a structured risk assessment.
    
    Risk Levels (aligned with NDMA colour coding):
    - Green  (LOW):      prob < 0.30
    - Yellow (MODERATE): 0.30 ≤ prob < 0.55
    - Orange (HIGH):     0.55 ≤ prob < 0.75
    - Red    (VERY HIGH):prob ≥ 0.75
    """
    if prob < 0.30:
        return {"level": "LOW", "color": "#22c55e", "code": 1, "alert": False}
    elif prob < 0.55:
        return {"level": "MODERATE", "color": "#eab308", "code": 2, "alert": False}
    elif prob < 0.75:
        return {"level": "HIGH", "color": "#f97316", "code": 3, "alert": True}
    else:
        return {"level": "VERY_HIGH", "color": "#ef4444", "code": 4, "alert": True}


# ─────────────────────────────────────────────
# Heuristic Fallback (when no model available)
# ─────────────────────────────────────────────
def heuristic_predict(features: pd.DataFrame) -> float:
    """
    Rule-based risk score for demonstration when ML model is absent.
    Returns probability-like score in [0, 1].
    """
    row = features.iloc[0]
    score = (
        0.35 * min(row.get("antecedent_rainfall_mm", 0) / 900.0, 1.0) +
        0.25 * min(row.get("slope_degrees", 0) / 45.0, 1.0) +
        0.20 * min(row.get("soil_moisture_percent", 0) / 100.0, 1.0) +
        0.10 * (1.0 - min(row.get("ndvi", 0.5), 1.0)) +
        0.10 * min(row.get("lithology_code", 1) / 3.0, 1.0)
    )
    # Add non-linearity for extreme rainfall
    if row.get("rainfall_24h_mm", 0) > 200:
        score = min(score * 1.4, 1.0)
    return float(round(score, 4))


# ─────────────────────────────────────────────
# Main Predict Interface
# ─────────────────────────────────────────────
def predict(raw_input: dict) -> dict:
    """
    Full prediction pipeline for a single observation.
    
    Args:
        raw_input: dict with keys matching rainfall_ner.csv columns
            Required: rainfall_24h_mm, rainfall_72h_mm, antecedent_rainfall_mm,
                      soil_moisture_percent, slope_degrees, elevation_m, ndvi, lithology_code
    
    Returns:
        dict with keys: probability, risk_level, color, code, alert, features_used
    """
    # Feature engineering
    features = prepare_input(raw_input)
    
    model = load_model()
    
    if model is not None:
        proba = float(model.predict_proba(features)[0][1])
        source = "ensemble_model"
    else:
        proba = heuristic_predict(features)
        source = "heuristic_fallback"
    
    risk = probability_to_risk_level(proba)
    
    return {
        "probability": round(proba, 4),
        "risk_level": risk["level"],
        "risk_color": risk["color"],
        "risk_code": risk["code"],
        "trigger_alert": risk["alert"],
        "source": source,
        "model_version": get_model_version(),
        "features_used": FEATURE_COLUMNS,
        "input_summary": {
            "rainfall_24h_mm": raw_input.get("rainfall_24h_mm"),
            "slope_degrees": raw_input.get("slope_degrees"),
            "antecedent_rainfall_mm": raw_input.get("antecedent_rainfall_mm"),
            "soil_moisture_percent": raw_input.get("soil_moisture_percent"),
        }
    }


def predict_batch(inputs: list[dict]) -> list[dict]:
    """Run predictions for a batch of input observations."""
    return [predict(inp) for inp in inputs]


if __name__ == "__main__":
    # Demo prediction
    test_input = {
        "rainfall_24h_mm": 210.0,
        "rainfall_72h_mm": 525.0,
        "antecedent_rainfall_mm": 720.0,
        "soil_moisture_percent": 86.0,
        "slope_degrees": 38.0,
        "elevation_m": 1150.0,
        "ndvi": 0.33,
        "lithology_code": 2,
    }
    
    result = predict(test_input)
    print("\nPrediction Result:")
    for k, v in result.items():
        print(f"  {k}: {v}")
