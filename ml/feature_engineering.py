"""
BhoomiSafe — Feature Engineering Module
Transforms raw geospatial/rainfall data into ML-ready features.
"""

# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
from typing import Optional


# ─────────────────────────────────────────────
# Antecedent Rainfall Index (ARI)
# ─────────────────────────────────────────────
def compute_ari(rainfall_series: pd.Series, decay_factor: float = 0.85) -> pd.Series:
    """
    Compute the Antecedent Rainfall Index using exponential decay.
    ARI_t = R_t + k * ARI_(t-1), where k is the decay factor (0.8–0.9 typical).
    
    Args:
        rainfall_series: Daily rainfall in mm (chronologically ordered)
        decay_factor: Memory decay per day (default 0.85 for NER monsoon conditions)
    Returns:
        ARI series
    """
    ari = [rainfall_series.iloc[0]]
    for i in range(1, len(rainfall_series)):
        ari.append(rainfall_series.iloc[i] + decay_factor * ari[-1])
    return pd.Series(ari, index=rainfall_series.index)


# ─────────────────────────────────────────────
# Safety Factor Proxy (simplified infinite slope)
# ─────────────────────────────────────────────
def compute_safety_factor(
    cohesion_kpa: float,
    friction_angle_deg: float,
    slope_deg: float,
    depth_m: float = 2.0,
    soil_unit_weight: float = 18.0,
    moisture_ratio: float = 0.5
) -> float:
    """
    Simplified infinite slope stability factor (Fs).
    Fs < 1.0 → Unstable | 1.0–1.5 → Marginal | > 1.5 → Stable
    
    Args:
        cohesion_kpa: Soil cohesion (kPa)
        friction_angle_deg: Internal friction angle (degrees)
        slope_deg: Slope angle (degrees)
        depth_m: Failure depth (m)
        soil_unit_weight: Unit weight of soil (kN/m³)
        moisture_ratio: Saturation ratio (0–1)
    Returns:
        Factor of Safety (float)
    """
    slope_rad = np.radians(slope_deg)
    phi_rad = np.radians(friction_angle_deg)
    
    # Pore water pressure effect
    gamma_w = 9.81  # kN/m³
    pore_pressure = moisture_ratio * gamma_w * depth_m * np.cos(slope_rad) ** 2
    
    normal_stress = soil_unit_weight * depth_m * np.cos(slope_rad) ** 2
    shear_strength = cohesion_kpa + (normal_stress - pore_pressure) * np.tan(phi_rad)
    shear_stress = soil_unit_weight * depth_m * np.sin(slope_rad) * np.cos(slope_rad)
    
    if shear_stress == 0:
        return 99.0  # flat terrain
    
    return shear_strength / shear_stress


# ─────────────────────────────────────────────
# Rainfall Intensity Classification
# ─────────────────────────────────────────────
def classify_rainfall_intensity(mm_24h: float) -> int:
    """
    IMD rainfall intensity classes:
    0: Light (<15.6mm), 1: Moderate (15.6–64.4mm), 
    2: Heavy (64.5–115.5mm), 3: Very Heavy (115.6–204.4mm),
    4: Extremely Heavy (>204.4mm)
    """
    if mm_24h < 15.6:
        return 0
    elif mm_24h < 64.5:
        return 1
    elif mm_24h < 115.6:
        return 2
    elif mm_24h < 204.5:
        return 3
    else:
        return 4


# ─────────────────────────────────────────────
# Main Feature Engineering Pipeline
# ─────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Full feature engineering pipeline for BhoomiSafe ML model.
    
    Input columns expected:
        rainfall_24h_mm, rainfall_72h_mm, antecedent_rainfall_mm,
        soil_moisture_percent, slope_degrees, elevation_m, ndvi,
        lithology_code
    
    Returns:
        DataFrame with original + engineered features
    """
    df = df.copy()
    
    # 1. Rainfall intensity classification (IMD scale)
    df["rainfall_intensity_class"] = df["rainfall_24h_mm"].apply(classify_rainfall_intensity)
    
    # 2. Slope × Rainfall interaction term (key predictor for debris flows)
    df["slope_rainfall_index"] = (df["slope_degrees"] * df["rainfall_24h_mm"]) / 100.0
    
    # 3. Soil Moisture × Slope interaction (saturation-driven instability)
    df["moisture_slope_index"] = (df["soil_moisture_percent"] / 100.0) * np.sin(np.radians(df["slope_degrees"]))
    
    # 4. Normalized Antecedent Rainfall (dimensionless)
    df["ari_normalized"] = df["antecedent_rainfall_mm"] / (df["antecedent_rainfall_mm"].max() + 1e-6)
    
    # 5. Rain ratio: 24h to 72h (spike detection)
    df["rain_spike_ratio"] = df["rainfall_24h_mm"] / (df["rainfall_72h_mm"] + 1e-6)
    
    # 6. NDVI inverse (lower vegetation → higher risk)
    df["bare_soil_index"] = 1.0 - df["ndvi"]
    
    # 7. Elevation band (risk varies with elevation zone)
    df["elevation_band"] = pd.cut(
        df["elevation_m"],
        bins=[0, 200, 500, 1000, 1500, 5000],
        labels=[0, 1, 2, 3, 4]
    ).astype(int)
    
    # 8. Combined Risk Score (heuristic, used as feature not label)
    df["heuristic_risk"] = (
        0.35 * df["ari_normalized"] +
        0.25 * (df["slope_degrees"] / 45.0) +
        0.20 * (df["soil_moisture_percent"] / 100.0) +
        0.10 * df["bare_soil_index"] +
        0.10 * (df["lithology_code"] / 3.0)
    )
    
    return df


# ─────────────────────────────────────────────
# Prediction Input → Feature Vector
# ─────────────────────────────────────────────
FEATURE_COLUMNS = [
    "rainfall_24h_mm",
    "rainfall_72h_mm",
    "antecedent_rainfall_mm",
    "soil_moisture_percent",
    "slope_degrees",
    "elevation_m",
    "ndvi",
    "lithology_code",
    "rainfall_intensity_class",
    "slope_rainfall_index",
    "moisture_slope_index",
    "ari_normalized",
    "rain_spike_ratio",
    "bare_soil_index",
    "elevation_band",
    "heuristic_risk",
]


def prepare_input(raw_input: dict) -> pd.DataFrame:
    """
    Convert raw API prediction input dict into a feature-engineered DataFrame row.
    Suitable for passing to the trained model.
    """
    df = pd.DataFrame([raw_input])
    df = engineer_features(df)
    return df[FEATURE_COLUMNS]


if __name__ == "__main__":
    # Quick test
    sample = {
        "rainfall_24h_mm": 180.0,
        "rainfall_72h_mm": 450.0,
        "antecedent_rainfall_mm": 620.0,
        "soil_moisture_percent": 84.0,
        "slope_degrees": 36.0,
        "elevation_m": 1100.0,
        "ndvi": 0.35,
        "lithology_code": 2,
    }
    result = prepare_input(sample)
    print("Feature vector shape:", result.shape)
    print(result.T.to_string())
