"""
Diagnose Sampling Bias & Artificial Separability in real_landslide_ner.csv
Compares feature distributions between real_event and real_negative_sample,
computes Kolmogorov-Smirnov statistics, single-feature AUCs, and overlap metrics.
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import roc_auc_score

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
df = pd.read_csv(DATA_DIR / "real_landslide_ner.csv")

pos_mask = df["landslide_occurred"] == 1
neg_mask = df["landslide_occurred"] == 0

pos = df[pos_mask]
neg = df[neg_mask]

features = [
    "rainfall_24h_mm",
    "rainfall_72h_mm",
    "antecedent_rainfall_mm",
    "soil_moisture_percent",
    "slope_degrees",
    "elevation_m",
    "ndvi",
    "lithology_code"
]

print("="*80)
print(f"DIAGNOSING SAMPLING BIAS: POSITIVE ({len(pos)}) vs NEGATIVE ({len(neg)})")
print("="*80)

rows = []
for col in features:
    p_vals = pos[col]
    n_vals = neg[col]
    
    # Kolmogorov-Smirnov 2-sample test
    ks_res = stats.ks_2samp(p_vals, n_vals)
    
    # Standalone ROC-AUC
    auc = roc_auc_score(df["landslide_occurred"], df[col])
    if auc < 0.5:
        auc = 1.0 - auc
        
    rows.append({
        "feature": col,
        "pos_mean": round(float(p_vals.mean()), 2),
        "pos_std": round(float(p_vals.std()), 2),
        "pos_min": round(float(p_vals.min()), 2),
        "pos_p25": round(float(p_vals.quantile(0.25)), 2),
        "pos_p50": round(float(p_vals.median()), 2),
        "pos_p75": round(float(p_vals.quantile(0.75)), 2),
        "pos_max": round(float(p_vals.max()), 2),
        "neg_mean": round(float(n_vals.mean()), 2),
        "neg_std": round(float(n_vals.std()), 2),
        "neg_min": round(float(n_vals.min()), 2),
        "neg_p25": round(float(n_vals.quantile(0.25)), 2),
        "neg_p50": round(float(n_vals.median()), 2),
        "neg_p75": round(float(n_vals.quantile(0.75)), 2),
        "neg_max": round(float(n_vals.max()), 2),
        "ks_stat": round(float(ks_res.statistic), 4),
        "p_value": ks_res.pvalue,
        "single_auc": round(float(auc), 4)
    })

res_df = pd.DataFrame(rows)
print("\n--- FEATURE-BY-FEATURE DISTRIBUTION COMPARISON ---")
for _, r in res_df.iterrows():
    print(f"\nFeature: {r['feature'].upper()} (Single-Feature AUC = {r['single_auc']}, KS Stat = {r['ks_stat']})")
    print(f"  Positive (Real Events, N={len(pos)}):")
    print(f"    Mean ± Std: {r['pos_mean']} ± {r['pos_std']} | Median: {r['pos_p50']} | IQR: [{r['pos_p25']}, {r['pos_p75']}] | Range: [{r['pos_min']}, {r['pos_max']}]")
    print(f"  Negative (Sampled, N={len(neg)}):")
    print(f"    Mean ± Std: {r['neg_mean']} ± {r['neg_std']} | Median: {r['neg_p50']} | IQR: [{r['neg_p25']}, {r['neg_p75']}] | Range: [{r['neg_min']}, {r['neg_max']}]")
    
    # Check overlap
    overlap = max(0, min(r['pos_max'], r['neg_max']) - max(r['pos_min'], r['neg_min']))
    print(f"    Overlap range: {overlap:.2f}")

print("\n" + "="*80)
print("ANALYSIS OF MONSOON MONTHS (JUNE-AUGUST)")
print("="*80)
df["month"] = pd.to_datetime(df["date"]).dt.month
monsoon = df[df["month"].isin([6, 7, 8])]
pos_m = monsoon[monsoon["landslide_occurred"] == 1]
neg_m = monsoon[monsoon["landslide_occurred"] == 0]

print(f"Monsoon samples: Pos={len(pos_m)}, Neg={len(neg_m)}")
print(f"Monsoon rainfall_24h_mm:")
print(f"  Positive: Min={pos_m['rainfall_24h_mm'].min()}, Max={pos_m['rainfall_24h_mm'].max()}, Mean={pos_m['rainfall_24h_mm'].mean():.2f}")
print(f"  Negative: Min={neg_m['rainfall_24h_mm'].min()}, Max={neg_m['rainfall_24h_mm'].max()}, Mean={neg_m['rainfall_24h_mm'].mean():.2f}")
print(f"Monsoon slope_degrees:")
print(f"  Positive: Min={pos_m['slope_degrees'].min()}, Max={pos_m['slope_degrees'].max()}, Mean={pos_m['slope_degrees'].mean():.2f}")
print(f"  Negative: Min={neg_m['slope_degrees'].min()}, Max={neg_m['slope_degrees'].max()}, Mean={neg_m['slope_degrees'].mean():.2f}")
print(f"Monsoon soil_moisture_percent:")
print(f"  Positive: Min={pos_m['soil_moisture_percent'].min()}, Max={pos_m['soil_moisture_percent'].max()}, Mean={pos_m['soil_moisture_percent'].mean():.2f}")
print(f"  Negative: Min={neg_m['soil_moisture_percent'].min()}, Max={neg_m['soil_moisture_percent'].max()}, Mean={neg_m['soil_moisture_percent'].mean():.2f}")
