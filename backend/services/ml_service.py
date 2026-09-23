"""
BhoomiSafe — ML Service
=======================
Singleton service managing model lifecycle, versioning, inference serving,
and deterministic NDMA rule-based fallback to guarantee high availability.
"""

import sys
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("bhoomi.ml_service")

# Project root path
_PROJECT_ROOT = Path(__file__).parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Import low-level predictor
try:
    from ml.predict import predict as ml_predict, load_model, predict_batch as ml_predict_batch
except ImportError as e:
    logger.error(f"Failed to import ml.predict: {e}")
    ml_predict = None
    load_model = lambda: None
    ml_predict_batch = None


class MLService:
    """
    Singleton service managing:
    1. Machine Learning ensemble model lifecycle (XGBoost + Random Forest).
    2. Model version tracking loaded from metrics.json.
    3. Automatic rule-based NDMA fallback if pickle fails to load or inference errors out.
    """
    
    _instance = None
    _model_loaded = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._model_loaded:
            self._metrics_path = _PROJECT_ROOT / "ml" / "saved_models" / "metrics.json"
            self._model_version = self._load_version_from_metrics()
            self._model = load_model()
            MLService._model_loaded = True
            
            if self._model is not None:
                logger.info(f"MLService initialized with model version: {self._model_version}")
            else:
                logger.warning(
                    f"ML model pickle not found. MLService primed with NDMA rule-based fallback "
                    f"(Version: {self._model_version}-fallback)."
                )
    
    def _load_version_from_metrics(self) -> str:
        """Load registered version string from metrics.json with safe fallback."""
        if self._metrics_path.exists():
            try:
                with open(self._metrics_path, "r") as f:
                    data = json.load(f)
                    return data.get("model_version", "v2.1.0")
            except Exception as e:
                logger.warning(f"Failed to read version from metrics.json: {e}. Defaulting to v2.1.0.")
        return "v2.1.0"
    
    @property
    def model_version(self) -> str:
        """Return the current registered model release version."""
        return self._model_version
    
    @property
    def is_model_available(self) -> bool:
        """Check if binary ensemble pickle is loaded in memory."""
        if self._model is None:
            self._model = load_model()
        return self._model is not None
    
    def calculate_ndma_fallback(self, input_data: dict, reason: str = "model_unavailable") -> dict:
        """
        Deterministic rule-based geotechnical risk calculation based on
        rainfall thresholds and slope angle, strictly calibrated to NDMA color tiers:
        
        - Green  (LOW, Code 1):        prob < 0.30  (Safe / baseline)
        - Yellow (MODERATE, Code 2):   0.30 <= prob < 0.55 (Advisory watch)
        - Orange (HIGH, Code 3):       0.55 <= prob < 0.75 (Warning / road monitoring)
        - Red    (VERY_HIGH, Code 4):  prob >= 0.75 (Critical / evacuation)
        """
        rain_24h = float(input_data.get("rainfall_24h_mm", 0.0) or 0.0)
        rain_72h = float(input_data.get("rainfall_72h_mm", rain_24h * 2.0) or 0.0)
        slope = float(input_data.get("slope_degrees", 0.0) or 0.0)
        soil_moisture = float(input_data.get("soil_moisture_percent", 50.0) or 50.0)
        district = input_data.get("district", "Unknown")
        
        logger.warning(
            f"⚠️ [RULE-BASED FALLBACK TRIGGERED] Location: {district} | "
            f"Reason: {reason} | 24h Rain: {rain_24h}mm, Slope: {slope}°, SoilMoisture: {soil_moisture}%"
        )
        
        # 1. Base vulnerability formula from rainfall intensity and slope steepness
        rain_component = min(rain_24h / 250.0, 1.0)
        slope_component = min(slope / 45.0, 1.0)
        moisture_component = min(soil_moisture / 100.0, 1.0)
        
        score = (0.50 * rain_component) + (0.35 * slope_component) + (0.15 * moisture_component)
        
        # 2. NDMA Geotechnical threshold overrides:
        # Extreme deluge (>= 200mm) OR severe rain (>= 120mm) on steep slopes (>= 35°)
        if rain_24h >= 200.0 or (rain_24h >= 120.0 and slope >= 35.0) or rain_72h >= 450.0:
            score = max(score, 0.84)
        elif rain_24h >= 90.0 or (rain_24h >= 50.0 and slope >= 28.0) or (slope >= 38.0 and soil_moisture >= 80.0):
            score = max(score, 0.62)
        elif rain_24h >= 35.0 or slope >= 20.0 or soil_moisture >= 65.0:
            score = max(score, 0.38)
        else:
            score = min(score, 0.24)
            
        score = min(max(round(score, 4), 0.05), 0.98)
        
        # 3. Map directly to NDMA color tiers
        if score < 0.30:
            risk_level = "LOW"
            risk_color = "#22c55e"
            risk_code = 1
            trigger_alert = False
        elif score < 0.55:
            risk_level = "MODERATE"
            risk_color = "#eab308"
            risk_code = 2
            trigger_alert = False
        elif score < 0.75:
            risk_level = "HIGH"
            risk_color = "#f97316"
            risk_code = 3
            trigger_alert = True
        else:
            risk_level = "VERY_HIGH"
            risk_color = "#ef4444"
            risk_code = 4
            trigger_alert = True
            
        return {
            "probability": score,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "risk_code": risk_code,
            "trigger_alert": trigger_alert,
            "source": "fallback_rule_based",
            "model_version": f"{self._model_version}-fallback",
            "features_used": ["rainfall_24h_mm", "slope_degrees", "soil_moisture_percent"],
            "input_summary": {
                "rainfall_24h_mm": rain_24h,
                "slope_degrees": slope,
                "soil_moisture_percent": soil_moisture,
            }
        }
    
    def predict(self, input_data: dict) -> dict:
        """
        Run single prediction.
        
        Returns prediction dict with model_version, risk probability, and NDMA tier.
        Guaranteed to never raise an exception (activates rule-based NDMA fallback).
        """
        # Case A: Pickle model not available
        if not self.is_model_available:
            return self.calculate_ndma_fallback(input_data, reason="model_pickle_not_loaded")
        
        # Case B: Run ML inference with automatic exception catch
        try:
            result = ml_predict(input_data)
            if not isinstance(result, dict) or "probability" not in result:
                raise ValueError("Predict interface returned unexpected format")
            
            # Ensure model_version is attached
            result["model_version"] = self.model_version
            return result
        except Exception as exc:
            logger.error(f"Inference error in ML model: {exc}. Falling back to NDMA formula.", exc_info=True)
            return self.calculate_ndma_fallback(input_data, reason=f"inference_exception: {str(exc)}")
    
    def predict_batch(self, inputs: list[dict]) -> list[dict]:
        """Run batch predictions safely with per-item fallback protection."""
        return [self.predict(inp) for inp in inputs]


# Global singleton instance
ml_service = MLService()
