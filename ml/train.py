"""
BhoomiSafe — ML Training & Geotechnical Validation Script
=========================================================
Trains an XGBoost + Random Forest ensemble for landslide risk classification
using Spatial Cross-Validation (GroupKFold) and Temporal Holdout Validation.

------------------------------------------------------------------------------
CRITICAL GEOSPATIAL VALIDATION RATIONALE:
WHY THE ORIGINAL RANDOM TRAIN/TEST SPLIT WAS FLAWED (DATA LEAKAGE):
------------------------------------------------------------------------------
1. Spatial Autocorrelation Leakage:
   In geotechnical landslide susceptibility modeling, static conditioning factors
   (lithology, slope, elevation, soil type, curvature) are geographically clustered
   by district, ridge, and watershed. When a standard random split
   (e.g., train_test_split(shuffle=True)) is applied, samples or repeat events from
   the SAME hillside/district leak into both the training and test sets.
   The machine learning algorithm trivially memorizes the static geographic
   signature rather than learning genuine, generalizable physical relationships
   between dynamic rainfall triggers and slope shear failure. When evaluated on
   unseen districts in real operational conditions, standard random-split models
   suffer massive performance degradation.

2. Temporal Lookahead Leakage:
   Random splitting shuffles chronological event dates, training the model on
   future weather observations while testing on past occurrences. In operational
   early-warning applications, an AI system can only observe past data to forecast
   future hazards. Shuffling past and future records produces overly optimistic,
   artificially inflated test metrics (e.g. false ROC-AUC ~ 1.0).

SOLUTION IMPLEMENTED:
1. Spatial Cross-Validation: GroupKFold grouped strictly by 'district', ensuring
   that test folds contain only geographic regions unseen during model training.
2. Temporal Holdout: Forward-chaining chronological split training strictly on older
   historical events and evaluating on newer future events.
------------------------------------------------------------------------------
"""

import os
import sys
import json
import pickle
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from sklearn.model_selection import GroupKFold
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
    confusion_matrix
)

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    warnings.warn("XGBoost not installed. Using Random Forest only.")

# Project imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from ml.feature_engineering import engineer_features, FEATURE_COLUMNS

# ─────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = Path(__file__).parent / "saved_models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────
# Data Ingestion & Geotechnical Feature Pipeline
# ─────────────────────────────────────────────
def load_data() -> pd.DataFrame:
    """
    Load and merge rainfall time-series, DEM topographic metadata,
    and soil characteristics, then apply geotechnical feature engineering.
    Prefers real-event dataset (data/real_landslide_ner.csv) if available.
    """
    print("[1/5] Loading multi-source geotechnical & weather dataset...")
    
    real_csv = DATA_DIR / "real_landslide_ner.csv"
    baseline_csv = DATA_DIR / "synthetic_baseline" / "rainfall_ner.csv"
    default_csv = DATA_DIR / "rainfall_ner.csv"
    
    if real_csv.exists():
        print(f"    --> Using REAL event-joined dataset: {real_csv.name}")
        df = pd.read_csv(real_csv, parse_dates=["date"])
    elif default_csv.exists():
        print(f"    --> Using default dataset: {default_csv.name}")
        df = pd.read_csv(default_csv, parse_dates=["date"])
    else:
        df = pd.read_csv(baseline_csv, parse_dates=["date"])
        
    dem_path = DATA_DIR / "dem_metadata.csv"
    if not dem_path.exists():
        dem_path = DATA_DIR / "synthetic_baseline" / "dem_metadata.csv"
    dem = pd.read_csv(dem_path)
    
    # Merge DEM topographical indicators
    df = df.merge(
        dem[["district", "curvature", "drainage_density", "fault_distance_km"]],
        on="district",
        how="left"
    )
    
    # Impute any missing physical measurements with regional medians
    df["curvature"] = df["curvature"].fillna(df["curvature"].median())
    df["drainage_density"] = df["drainage_density"].fillna(df["drainage_density"].median())
    df["fault_distance_km"] = df["fault_distance_km"].fillna(df["fault_distance_km"].median())
    
    # Geotechnical feature engineering
    print("[2/5] Engineering compound geotechnical features...")
    df = engineer_features(df)
    
    pos_rate = df["landslide_occurred"].mean()
    print(f"    Total records: {len(df)} | Unique districts: {df['district'].nunique()} | Positive rate: {pos_rate:.1%}")
    print(f"    Temporal coverage: {df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}")
    
    return df


# ─────────────────────────────────────────────
# Ensemble Model Factory
# ─────────────────────────────────────────────
def build_model() -> VotingClassifier:
    """
    Constructs a soft-voting ensemble combining Random Forest and XGBoost.
    Tuned with regularization to reduce variance on geospatial boundaries.
    """
    rf = RandomForestClassifier(
        n_estimators=150,
        max_depth=6,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    
    estimators = [("rf", rf)]
    
    if XGBOOST_AVAILABLE:
        xgb = XGBClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=1.5,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1
        )
        estimators.append(("xgb", xgb))
        
    return VotingClassifier(estimators=estimators, voting="soft")


# ─────────────────────────────────────────────
# Method 1: Spatial Cross-Validation (GroupKFold)
# ─────────────────────────────────────────────
def evaluate_spatial_cv(df: pd.DataFrame, n_splits: int = 5) -> dict:
    """
    Evaluates generalization across unseen geographic regions using GroupKFold
    grouped by 'district'. Ensures complete spatial separation: no district
    in the validation fold ever appears in the training fold.
    """
    print(f"\n[3/5] Running Spatial Cross-Validation (GroupKFold by district, k={n_splits})...")
    
    X = df[FEATURE_COLUMNS]
    y = df["landslide_occurred"]
    groups = df["district"]
    
    gkf = GroupKFold(n_splits=n_splits)
    
    fold_aucs = []
    fold_f1s = []
    fold_precisions = []
    fold_recalls = []
    
    # For out-of-fold prediction tracking
    oof_probabilities = np.zeros(len(df))
    oof_predictions = np.zeros(len(df))
    
    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=groups), 1):
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
        val_districts = set(groups.iloc[val_idx])
        
        fold_model = build_model()
        fold_model.fit(X_train, y_train)
        
        val_proba = fold_model.predict_proba(X_val)[:, 1]
        val_pred = (val_proba >= 0.5).astype(int)
        
        oof_probabilities[val_idx] = val_proba
        oof_predictions[val_idx] = val_pred
        
        auc = roc_auc_score(y_val, val_proba)
        f1 = f1_score(y_val, val_pred, zero_division=0)
        prec = precision_score(y_val, val_pred, zero_division=0)
        rec = recall_score(y_val, val_pred, zero_division=0)
        
        fold_aucs.append(auc)
        fold_f1s.append(f1)
        fold_precisions.append(prec)
        fold_recalls.append(rec)
        
        print(f"  Fold {fold} ({len(val_districts)} districts, {len(val_idx)} samples): "
              f"ROC-AUC = {auc:.4f} | F1 = {f1:.4f} | Prec = {prec:.4f} | Rec = {rec:.4f}")
    
    oof_auc = roc_auc_score(y, oof_probabilities)
    oof_f1 = f1_score(y, oof_predictions, zero_division=0)
    
    spatial_results = {
        "n_splits": n_splits,
        "grouping_column": "district",
        "roc_auc_mean": round(float(np.mean(fold_aucs)), 4),
        "roc_auc_std": round(float(np.std(fold_aucs)), 4),
        "f1_score_mean": round(float(np.mean(fold_f1s)), 4),
        "f1_score_std": round(float(np.std(fold_f1s)), 4),
        "precision_mean": round(float(np.mean(fold_precisions)), 4),
        "recall_mean": round(float(np.mean(fold_recalls)), 4),
        "oof_roc_auc": round(float(oof_auc), 4),
        "oof_f1_score": round(float(oof_f1), 4),
    }
    
    print(f"  --> Spatial CV Mean ROC-AUC: {spatial_results['roc_auc_mean']} +/- {spatial_results['roc_auc_std']}")
    print(f"  --> Spatial CV Mean F1-Score: {spatial_results['f1_score_mean']} +/- {spatial_results['f1_score_std']}")
    print(f"  --> Out-of-Fold Overall ROC-AUC: {spatial_results['oof_roc_auc']}")
    
    return spatial_results


# ─────────────────────────────────────────────
# Method 2: Temporal Holdout Validation
# ─────────────────────────────────────────────
def evaluate_temporal_holdout(df: pd.DataFrame, train_ratio: float = 0.8) -> tuple[dict, VotingClassifier, tuple]:
    """
    Evaluates operational temporal forecasting by strictly sorting events by date.
    Trains on historical older events and tests on subsequent newer events,
    preventing lookahead bias.
    """
    print(f"\n[4/5] Running Temporal Holdout Validation ({int(train_ratio*100)}% historical train / {int((1-train_ratio)*100)}% future test)...")
    
    df_sorted = df.sort_values("date").reset_index(drop=True)
    split_idx = int(len(df_sorted) * train_ratio)
    
    train_slice = df_sorted.iloc[:split_idx]
    test_slice = df_sorted.iloc[split_idx:]
    
    X_train = train_slice[FEATURE_COLUMNS]
    y_train = train_slice["landslide_occurred"]
    X_test = test_slice[FEATURE_COLUMNS]
    y_test = test_slice["landslide_occurred"]
    
    train_date_range = f"{train_slice['date'].min().strftime('%Y-%m-%d')} to {train_slice['date'].max().strftime('%Y-%m-%d')}"
    test_date_range = f"{test_slice['date'].min().strftime('%Y-%m-%d')} to {test_slice['date'].max().strftime('%Y-%m-%d')}"
    
    print(f"  Training set (historical): {len(train_slice)} records ({train_date_range}) | Positives: {y_train.sum()}")
    print(f"  Test set (future holdout): {len(test_slice)} records ({test_date_range}) | Positives: {y_test.sum()}")
    
    temporal_model = build_model()
    temporal_model.fit(X_train, y_train)
    
    test_proba = temporal_model.predict_proba(X_test)[:, 1]
    test_pred = (test_proba >= 0.5).astype(int)
    
    roc_auc = roc_auc_score(y_test, test_proba)
    f1 = f1_score(y_test, test_pred, zero_division=0)
    acc = accuracy_score(y_test, test_pred)
    prec = precision_score(y_test, test_pred, zero_division=0)
    rec = recall_score(y_test, test_pred, zero_division=0)
    
    print(f"  --> Temporal Holdout ROC-AUC: {roc_auc:.4f}")
    print(f"  --> Temporal Holdout F1-Score: {f1:.4f}")
    print(f"  --> Temporal Holdout Precision: {prec:.4f} | Recall: {rec:.4f}")
    
    temporal_results = {
        "roc_auc": round(float(roc_auc), 4),
        "f1_score": round(float(f1), 4),
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "train_samples": int(len(train_slice)),
        "test_samples": int(len(test_slice)),
        "train_date_range": train_date_range,
        "test_date_range": test_date_range,
        "test_positive_rate": round(float(y_test.mean()), 4),
    }
    
    return temporal_results, temporal_model, (X_train, X_test, y_train, y_test, test_pred)


# ─────────────────────────────────────────────
# Main Pipeline
# ─────────────────────────────────────────────
def train(save: bool = True) -> dict:
    """
    Executes the comprehensive geotechnical validation pipeline:
    1. Loads integrated environmental dataset
    2. Runs Spatial Cross-Validation (GroupKFold by district)
    3. Runs Temporal Holdout Validation (chronological sequence)
    4. Compares and reports both validation paradigms
    5. Saves operational model artifact and structured metrics.json
    """
    df = load_data()
    
    # 1. Spatial Cross-Validation
    spatial_metrics = evaluate_spatial_cv(df, n_splits=5)
    
    # 2. Temporal Holdout Validation
    temporal_metrics, model, (X_train, X_test, y_train, y_test, test_pred) = evaluate_temporal_holdout(df, train_ratio=0.8)
    
    # Print Comparative Validation Summary
    print("\n" + "=" * 65)
    print("        BHOOMISAFE VALIDATION PARADIGM COMPARISON")
    print("=" * 65)
    print(f"  Validation Scheme               |  ROC-AUC  |  F1-Score")
    print("-" * 65)
    print(f"  1. Spatial CV (GroupKFold)      |   {spatial_metrics['roc_auc_mean']:.4f}  |   {spatial_metrics['f1_score_mean']:.4f}")
    print(f"  2. Temporal Holdout (Future)    |   {temporal_metrics['roc_auc']:.4f}  |   {temporal_metrics['f1_score']:.4f}")
    print("=" * 65)
    
    print("\nTEMPORAL HOLDOUT CLASSIFICATION REPORT:")
    print(classification_report(y_test, test_pred, target_names=["No Landslide", "Landslide"]))
    
    # Consolidated metrics payload for API endpoints and dashboard
    metrics = {
        "model_version": "v2.1.0",
        # High-level primary metrics (Backward compatible with API/UI)
        "roc_auc": temporal_metrics["roc_auc"],
        "f1_score": temporal_metrics["f1_score"],
        "cv_roc_auc_mean": spatial_metrics["roc_auc_mean"],
        "cv_roc_auc_std": spatial_metrics["roc_auc_std"],
        "cv_f1_mean": spatial_metrics["f1_score_mean"],
        "train_samples": temporal_metrics["train_samples"],
        "test_samples": temporal_metrics["test_samples"],
        "positive_rate": round(float(df["landslide_occurred"].mean()), 4),
        "trained_at": datetime.now().isoformat(),
        "features": FEATURE_COLUMNS,
        
        # Method 1: Spatial Cross-Validation Breakdown
        "spatial_cross_validation": spatial_metrics,
        
        # Method 2: Temporal Holdout Breakdown
        "temporal_holdout": temporal_metrics,
        
        # Scientific Documentation on Validation Strategy
        "validation_notes": {
            "spatial_strategy": "5-Fold GroupKFold partitioned strictly on district boundaries to eliminate spatial autocorrelation.",
            "temporal_strategy": "Chronological train/test split (80/20) preserving event causality and simulating real-time operational early warning.",
            "original_flaw_resolved": "Eliminated geographic and temporal data leakage caused by naive random shuffling."
        }
    }
    
    if save:
        print("[5/5] Persisting production model artifact and verified metrics...")
        model_path = MODELS_DIR / "bhoomi_ensemble.pkl"
        metrics_path = MODELS_DIR / "metrics.json"
        
        with open(model_path, "wb") as f:
            pickle.dump(model, f)
            
        with open(metrics_path, "w") as f:
            json.dump(metrics, f, indent=2)
            
        print(f"    [OK] Model artifact saved: {model_path}")
        print(f"    [OK] Metrics payload saved: {metrics_path}")
        
    return metrics


if __name__ == "__main__":
    metrics = train(save=True)
    print("\nGeotechnical validation pipeline executed successfully.")
