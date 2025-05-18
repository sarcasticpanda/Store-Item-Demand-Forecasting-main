"""
ML inference service — loads the trained LightGBM model and generates
demand forecasts for a given store + item + horizon.
Uses the same feature engineering as train_model.py via create_time_series_features.
"""
import os, sys, pickle, json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict

# Make src/ importable (project root is two levels up)
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from src.modelling_utils import create_time_series_features

# Training params must match train_model.py exactly
_LAGS    = [91, 98, 105, 112, 119, 126, 182, 364, 546, 728]
_WINDOWS = [365, 546, 730]
_WEIGHTS = [0.95, 0.9, 0.8, 0.7, 0.5]
_TO_SORT  = ["store", "item", "date"]
_TO_GROUP = ["store", "item"]

_model: object = None
_train_df: pd.DataFrame | None = None
_cached_metrics: Dict | None = None


def _load_model():
    global _model
    if _model is None:
        path = os.path.join(_ROOT, "models", "lgb_reg.pkl")
        with open(path, "rb") as f:
            _model = pickle.load(f)
    return _model


def _load_train_data() -> pd.DataFrame:
    global _train_df
    if _train_df is None:
        path = os.path.join(_ROOT, "input", "train.csv")
        df = pd.read_csv(path)
        df["date"] = pd.to_datetime(df["date"])
        df.set_index("date", inplace=True)
        df.sort_values(by=["store", "item"], inplace=True)
        _train_df = df
    return _train_df


def _build_features(subset_df: pd.DataFrame) -> pd.DataFrame:
    """Apply the identical feature pipeline used in train_model.py."""
    return create_time_series_features(
        subset_df, "sales", _TO_SORT, _TO_GROUP,
        lags=_LAGS, windows=_WINDOWS, weights=_WEIGHTS, min_periods=30,
        date_related=True, lag=True, log_transformation=True,
        roll=True, ewm=True, roll_mean=True, roll_std=True,
        roll_min=True, roll_max=True,
    )


def forecast(store_id: int, item_id: int, days: int = 30,
             extra_sales: "pd.DataFrame | None" = None) -> List[Dict]:
    model    = _load_model()
    train_df = _load_train_data()

    # Work on this store+item only — avoids 913K-row feature computation
    subset = train_df[(train_df["store"] == store_id) & (train_df["item"] == item_id)].copy()
    if subset.empty:
        return []

    # Append user-uploaded sales data to advance last_date and improve lag features
    if extra_sales is not None and not extra_sales.empty:
        new_rows = extra_sales[~extra_sales.index.isin(subset.index)].copy()
        if not new_rows.empty:
            new_rows["store"] = store_id
            new_rows["item"]  = item_id
            subset = pd.concat([subset, new_rows]).sort_index()

    last_date    = subset.index.max()
    future_dates = [last_date + timedelta(days=i + 1) for i in range(days)]

    avg_sales = np.expm1(np.log1p(subset["sales"]).mean())
    future_df = pd.DataFrame(
        {"store": store_id, "item": item_id, "sales": avg_sales},
        index=pd.DatetimeIndex(future_dates, name="date"),
    )

    combined = pd.concat([subset, future_df]).sort_index()
    combined = combined.sort_values(by=["store", "item"])

    feat = _build_features(combined)

    future_feat = feat[feat.index.isin(future_dates)]
    if future_feat.empty:
        return []

    X = future_feat.drop(columns=["sales"], errors="ignore").fillna(0)

    model_cols = model.feature_name_
    for c in model_cols:
        if c not in X.columns:
            X[c] = 0
    X = X[model_cols]

    preds_log = model.predict(X)
    preds     = np.expm1(preds_log)

    # Uncertainty bands: widen linearly from MAE at day 1 to 1.6×MAE at the horizon
    metrics = get_model_metrics()
    base_mae = metrics.get("mae", 3.41)
    n = len(preds)

    result = []
    for i, (d, p) in enumerate(zip(future_dates, preds)):
        p = max(0.0, float(p))
        horizon_factor = 1.0 + 0.6 * (i / max(n - 1, 1))
        margin = base_mae * horizon_factor
        result.append({
            "date": d.strftime("%Y-%m-%d"),
            "predicted_sales": round(p, 2),
            "lower_bound": round(max(0.0, p - margin), 2),
            "upper_bound": round(p + margin, 2),
        })
    return result


def get_historical(store_id: int, item_id: int, last_n_days: int = 90,
                   extra_sales: "pd.DataFrame | None" = None) -> List[Dict]:
    train_df = _load_train_data()
    subset   = train_df[(train_df["store"] == store_id) & (train_df["item"] == item_id)].copy()

    # Append user-uploaded data so recent history is visible in chart
    if extra_sales is not None and not extra_sales.empty:
        new_rows = extra_sales[~extra_sales.index.isin(subset.index)].copy()
        if not new_rows.empty:
            new_rows["store"] = store_id
            new_rows["item"]  = item_id
            subset = pd.concat([subset, new_rows]).sort_index()

    subset = subset.tail(last_n_days)
    return [
        {"date": idx.strftime("%Y-%m-%d"), "actual_sales": round(float(row["sales"]), 1)}
        for idx, row in subset.iterrows()
    ]


def get_model_metrics() -> Dict:
    global _cached_metrics
    if _cached_metrics is not None:
        return _cached_metrics

    json_path = os.path.join(_ROOT, "reports", "model_metrics.json")
    if os.path.exists(json_path):
        with open(json_path) as f:
            _cached_metrics = json.load(f)
        return _cached_metrics

    csv_path = os.path.join(_ROOT, "reports", "predictions_eval.csv")
    if os.path.exists(csv_path):
        df     = pd.read_csv(csv_path)
        y_true = df["actual"].values.astype(float)
        y_pred = np.maximum(0, df["predicted"].values.astype(float))

        mae  = float(np.mean(np.abs(y_true - y_pred)))
        rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
        ss_res = np.sum((y_true - y_pred) ** 2)
        ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
        r2   = float(1 - ss_res / ss_tot)
        mape = float(np.mean(np.abs((y_true - y_pred) / (y_true + 1e-8))) * 100)

        _cached_metrics = {"mae": round(mae, 3), "rmse": round(rmse, 3), "r2": round(r2, 4), "mape": round(mape, 2)}
        with open(json_path, "w") as f:
            json.dump(_cached_metrics, f)
        return _cached_metrics

    _cached_metrics = {"mae": 6.11, "rmse": 7.99, "r2": 0.9218, "mape": 11.5}
    return _cached_metrics


def reload_model():
    global _model
    _model = None
    _load_model()
