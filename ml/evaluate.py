"""
BhoomiSafe — Model Evaluation Script
Generates confusion matrix, ROC curve, and feature importance plots.
"""

import sys
import json
import pickle
import warnings
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
# pyrefly: ignore [missing-import]
import seaborn as sns
from pathlib import Path
# pyrefly: ignore [missing-import]
from sklearn.metrics import (
    confusion_matrix, classification_report,
    roc_curve, auc, precision_recall_curve
)
# pyrefly: ignore [missing-import]
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent.parent))
from ml.feature_engineering import engineer_features, FEATURE_COLUMNS

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = Path(__file__).parent / "saved_models"
EVAL_DIR = MODELS_DIR / "eval_plots"
EVAL_DIR.mkdir(parents=True, exist_ok=True)

plt.style.use("dark_background")
PALETTE = {"low": "#22c55e", "moderate": "#eab308", "high": "#f97316", "very_high": "#ef4444"}


def load_test_set():
    df = pd.read_csv(DATA_DIR / "rainfall_ner.csv", parse_dates=["date"])
    df = engineer_features(df)
    X = df[FEATURE_COLUMNS]
    y = df["landslide_occurred"]
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    return X_test, y_test


def load_model():
    model_path = MODELS_DIR / "bhoomi_ensemble.pkl"
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}. Run train.py first.")
    with open(model_path, "rb") as f:
        return pickle.load(f)


def plot_confusion_matrix(y_true, y_pred):
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="RdYlGn",
        xticklabels=["No Landslide", "Landslide"],
        yticklabels=["No Landslide", "Landslide"],
        ax=ax, linewidths=0.5, linecolor="#333"
    )
    ax.set_title("Confusion Matrix — BhoomiSafe Ensemble", color="white", pad=12, fontsize=13)
    ax.set_xlabel("Predicted", color="#aaa")
    ax.set_ylabel("Actual", color="#aaa")
    plt.tight_layout()
    path = EVAL_DIR / "confusion_matrix.png"
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved: {path}")


def plot_roc_curve(y_true, y_proba):
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    roc_auc = auc(fpr, tpr)
    
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(fpr, tpr, color="#6366f1", lw=2, label=f"ROC AUC = {roc_auc:.3f}")
    ax.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.5, label="Random")
    ax.fill_between(fpr, tpr, alpha=0.15, color="#6366f1")
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1.02])
    ax.set_xlabel("False Positive Rate", color="#aaa")
    ax.set_ylabel("True Positive Rate", color="#aaa")
    ax.set_title("ROC Curve — BhoomiSafe Landslide Prediction", color="white", fontsize=13)
    ax.legend(loc="lower right", framealpha=0.3)
    ax.grid(alpha=0.2)
    plt.tight_layout()
    path = EVAL_DIR / "roc_curve.png"
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved: {path}")
    return roc_auc


def plot_feature_importance(model):
    """Extract and plot feature importances from RF component."""
    try:
        rf = model.estimators_[0] if hasattr(model, "estimators_") else model
        importances = rf.feature_importances_
    except AttributeError:
        print("Feature importance not available for this model type.")
        return
    
    feat_df = pd.DataFrame({
        "feature": FEATURE_COLUMNS,
        "importance": importances
    }).sort_values("importance", ascending=True)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    colors = plt.cm.RdYlGn(np.linspace(0.2, 0.9, len(feat_df)))
    bars = ax.barh(feat_df["feature"], feat_df["importance"], color=colors, edgecolor="#333")
    ax.set_xlabel("Feature Importance (Gini)", color="#aaa")
    ax.set_title("Feature Importance — BhoomiSafe RF Component", color="white", fontsize=13)
    ax.tick_params(colors="#ccc")
    ax.grid(axis="x", alpha=0.2)
    plt.tight_layout()
    path = EVAL_DIR / "feature_importance.png"
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved: {path}")


def run_evaluation():
    print("Loading model and test data...")
    model = load_model()
    X_test, y_test = load_test_set()
    
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    print("\n" + "="*50)
    print("EVALUATION RESULTS")
    print("="*50)
    print(classification_report(y_test, y_pred, target_names=["No Landslide", "Landslide"]))
    
    plot_confusion_matrix(y_test, y_pred)
    roc_auc = plot_roc_curve(y_test, y_proba)
    plot_feature_importance(model)
    
    print(f"\nROC-AUC: {roc_auc:.4f}")
    print(f"Plots saved to: {EVAL_DIR}")


if __name__ == "__main__":
    run_evaluation()
