"""
Investigate why GroupKFold AUC was 1.0 on 4 of 5 folds.
Check for:
1. Exact or near-duplicate rows across districts
2. Single-feature correlation and separability with target label
3. Class balance per fold in GroupKFold
4. Synthetic generation indicators across datasets
"""

import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from scipy.spatial.distance import pdist, squareform

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from ml.train import load_data, FEATURE_COLUMNS

df = load_data()
X = df[FEATURE_COLUMNS]
y = df["landslide_occurred"]
districts = df["district"]

print("="*70)
print(f"TOTAL ROWS IN DATASET: {len(df)}")
print(f"UNIQUE DISTRICTS: {districts.nunique()}")
print(f"CLASS BALANCE OVERALL: {y.value_counts().to_dict()} (Positive rate: {y.mean():.4f})")
print("="*70)

# -------------------------------------------------------------
# 1. Exact or near-duplicate rows across districts
# -------------------------------------------------------------
print("\n--- 1. EXACT OR NEAR-DUPLICATE ROWS ---")
feature_df = df[FEATURE_COLUMNS]
exact_dupes = feature_df.duplicated(keep=False)
exact_dupe_count = exact_dupes.sum()
print(f"Exact duplicate feature rows: {exact_dupe_count}")

# Check near-duplicates using normalized Euclidean distance
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
dists = squareform(pdist(X_scaled, metric='euclidean'))
np.fill_diagonal(dists, np.inf)

near_dupes = []
threshold = 0.5  # Very close in normalized feature space
for i in range(len(df)):
    for j in range(i + 1, len(df)):
        if dists[i, j] < threshold:
            near_dupes.append({
                "row_i": i,
                "district_i": df.loc[i, "district"],
                "y_i": int(df.loc[i, "landslide_occurred"]),
                "row_j": j,
                "district_j": df.loc[j, "district"],
                "y_j": int(df.loc[j, "landslide_occurred"]),
                "distance": round(float(dists[i, j]), 4)
            })

print(f"Near-duplicate pairs (normalized Euclidean distance < {threshold}): {len(near_dupes)}")
for nd in near_dupes[:10]:
    print(f"  Rows {nd['row_i']} ({nd['district_i']}, y={nd['y_i']}) & {nd['row_j']} ({nd['district_j']}, y={nd['y_j']}): dist={nd['distance']}")

# Check if any district appears multiple times
district_counts = df["district"].value_counts()
districts_with_mult_rows = district_counts[district_counts > 1]
print(f"\nDistricts appearing more than once: {len(districts_with_mult_rows)}")
print(district_counts.head(10))

# -------------------------------------------------------------
# 2. Single-feature correlation with target label
# -------------------------------------------------------------
print("\n--- 2. FEATURE CORRELATIONS & SEPARABILITY ---")
correlations = []
for col in FEATURE_COLUMNS:
    pearson = df[col].corr(df["landslide_occurred"], method="pearson")
    spearman = df[col].corr(df["landslide_occurred"], method="spearman")
    
    # Calculate separability: ROC AUC of single feature predicting label
    from sklearn.metrics import roc_auc_score
    try:
        single_auc = roc_auc_score(df["landslide_occurred"], df[col])
        if single_auc < 0.5:
            single_auc = 1.0 - single_auc  # inverse direction
    except Exception:
        single_auc = np.nan
        
    pos_vals = df[df["landslide_occurred"] == 1][col]
    neg_vals = df[df["landslide_occurred"] == 0][col]
    
    correlations.append({
        "feature": col,
        "pearson_r": round(float(pearson), 4),
        "spearman_rho": round(float(spearman), 4),
        "single_feature_auc": round(float(single_auc), 4),
        "pos_mean": round(float(pos_vals.mean()), 2),
        "pos_min": round(float(pos_vals.min()), 2),
        "pos_max": round(float(pos_vals.max()), 2),
        "neg_mean": round(float(neg_vals.mean()), 2),
        "neg_min": round(float(neg_vals.min()), 2),
        "neg_max": round(float(neg_vals.max()), 2),
    })

corr_df = pd.DataFrame(correlations).sort_values(by="spearman_rho", key=abs, ascending=False)
print(corr_df.to_string(index=False))

# Check composite rule: Is there a deterministic formula or decision rule?
print("\nChecking compound threshold separability:")
print(f"Rainfall > 100mm: Precision={(df[df['rainfall_24h_mm'] > 100]['landslide_occurred'] == 1).mean():.4f}, Recall={(df[df['landslide_occurred'] == 1]['rainfall_24h_mm'] > 100).mean():.4f}")
print(f"slope_rainfall_index AUC: {roc_auc_score(df['landslide_occurred'], df['slope_rainfall_index']):.4f}")
print(f"moisture_slope_index AUC: {roc_auc_score(df['landslide_occurred'], df['moisture_slope_index']):.4f}")
print(f"heuristic_risk AUC: {roc_auc_score(df['landslide_occurred'], df['heuristic_risk']):.4f}")


# -------------------------------------------------------------
# 3. Class balance per fold in GroupKFold
# -------------------------------------------------------------
print("\n--- 3. CLASS BALANCE PER FOLD IN GROUPKFOLD ---")
gkf = GroupKFold(n_splits=5)
fold_stats = []

for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=districts), 1):
    y_val = y.iloc[val_idx]
    y_train = y.iloc[train_idx]
    val_dist = districts.iloc[val_idx]
    
    pos_val = (y_val == 1).sum()
    neg_val = (y_val == 0).sum()
    total_val = len(y_val)
    pos_val_pct = pos_val / total_val if total_val > 0 else 0
    
    pos_train = (y_train == 1).sum()
    neg_train = (y_train == 0).sum()
    total_train = len(y_train)
    
    fold_stats.append({
        "fold": fold,
        "test_total": total_val,
        "test_positives": int(pos_val),
        "test_negatives": int(neg_val),
        "test_pos_pct": round(pos_val_pct * 100, 1),
        "train_total": total_train,
        "train_positives": int(pos_train),
        "train_negatives": int(neg_train),
        "train_pos_pct": round((pos_train / total_train) * 100, 1),
        "test_districts": list(val_dist.unique())
    })

fold_df = pd.DataFrame(fold_stats)
for _, r in fold_df.iterrows():
    print(f"Fold {r['fold']}: Test n={r['test_total']} (Pos: {r['test_positives']}, Neg: {r['test_negatives']}, {r['test_pos_pct']}% pos) | Train n={r['train_total']} (Pos: {r['train_positives']}, Neg: {r['train_negatives']}, {r['train_pos_pct']}% pos) | Districts={len(r['test_districts'])}")

# -------------------------------------------------------------
# 4. Synthetic Generation Evidence
# -------------------------------------------------------------
print("\n--- 4. SYNTHETIC GENERATION EVIDENCE ---")
data_dir = BASE_DIR / "data"
for fname in ["rainfall_ner.csv", "dem_metadata.csv", "landslide_events.csv", "soil_types.csv"]:
    fpath = data_dir / fname
    if fpath.exists():
        f_df = pd.read_csv(fpath)
        print(f"\nFile: {fname}")
        print(f"  Shape: {f_df.shape} (Rows: {len(f_df)}, Cols: {len(f_df.columns)})")
        print(f"  Columns: {list(f_df.columns)}")
        print(f"  Head(2):\n{f_df.head(2).to_dict(orient='records')}")
        
        # Check for rounding / perfectly synthetic numbers
        if "rainfall_24h_mm" in f_df:
            print(f"  rainfall_24h_mm values head: {f_df['rainfall_24h_mm'].head(5).tolist()}")
        if "date" in f_df:
            print(f"  Date min: {f_df['date'].min()}, max: {f_df['date'].max()}, unique dates: {f_df['date'].nunique()}")
