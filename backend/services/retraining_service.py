"""
Auto-retraining pipeline: triggered on schedule or manual call.
"""
import os, pickle, uuid
from datetime import datetime, timezone
from core.database import get_db
from core.config import settings


def _run_training() -> dict:
    import pandas as pd
    import numpy as np
    from lightgbm import LGBMRegressor
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    train_path = os.path.join(os.path.dirname(__file__), "..", "..", "input", "train.csv")
    df = pd.read_csv(train_path, parse_dates=["date"])
    df.sort_values(["store", "item", "date"], inplace=True)

    # Lazy import to avoid circular dependency
    from ml.predictor import _create_features
    df_feat = _create_features(df)
    df_feat.dropna(subset=["lag_91"], inplace=True)

    cutoff = pd.Timestamp("2017-09-30")
    train = df_feat[df_feat["date"] < cutoff]
    test  = df_feat[df_feat["date"] >= cutoff]

    drop_cols = ["date", "sales", "sales_log", "store", "item"]
    X_train = train.drop(columns=[c for c in drop_cols if c in train.columns]).fillna(0)
    y_train = train["sales"]
    X_test  = test.drop(columns=[c for c in drop_cols if c in test.columns]).fillna(0)
    y_test  = test["sales"]

    params = {
        "objective": "regression", "metric": "rmse",
        "n_estimators": 500, "verbosity": -1,
        "learning_rate": 0.01, "num_leaves": 100,
        "subsample": 0.8, "colsample_bytree": 0.8,
        "min_data_in_leaf": 50, "random_state": 42,
    }
    model = LGBMRegressor(**params)
    model.fit(X_train, np.log1p(y_train))

    y_pred_log = model.predict(X_test)
    y_pred = np.expm1(y_pred_log)
    y_true = y_test.values

    mae  = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2   = float(r2_score(y_true, y_pred))

    model_path = os.path.join(os.path.dirname(__file__), "..", "..", "models", "lgb_reg.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    return {"mae": round(mae, 3), "rmse": round(rmse, 3), "r2": round(r2, 4)}


def trigger_retrain(trigger_type: str = "manual") -> dict:
    db = get_db()
    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)

    # Get current metrics before retraining
    try:
        from ml.predictor import get_model_metrics, reload_model
        before = get_model_metrics()
    except Exception:
        before = {"mae": None, "rmse": None, "r2": None}

    log = {
        "run_id": run_id,
        "triggered_at": started_at,
        "trigger_type": trigger_type,
        "mae_before": before.get("mae"),
        "rmse_before": before.get("rmse"),
        "r2_before": before.get("r2"),
        "status": "running",
    }
    db.retraining_logs.insert_one(log)

    try:
        after = _run_training()
        duration = (datetime.now(timezone.utc) - started_at).seconds

        db.retraining_logs.update_one(
            {"run_id": run_id},
            {"$set": {
                "mae_after": after["mae"],
                "rmse_after": after["rmse"],
                "r2_after": after["r2"],
                "duration_seconds": duration,
                "status": "success",
            }},
        )
        # Reload model in predictor
        from ml.predictor import reload_model
        reload_model()

        return {"status": "success", "run_id": run_id, "before": before, "after": after, "duration_seconds": duration}
    except Exception as e:
        db.retraining_logs.update_one(
            {"run_id": run_id},
            {"$set": {"status": "failed", "error": str(e)}},
        )
        return {"status": "failed", "run_id": run_id, "error": str(e)}


def get_pipeline_history(limit: int = 20) -> list:
    db = get_db()
    logs = list(db.retraining_logs.find().sort("triggered_at", -1).limit(limit))
    for l in logs:
        l["_id"] = str(l["_id"])
        if "triggered_at" in l:
            l["triggered_at"] = l["triggered_at"].isoformat()
    return logs


def get_pipeline_status() -> dict:
    db = get_db()
    latest = db.retraining_logs.find_one(sort=[("triggered_at", -1)])
    if not latest:
        return {"last_run": None, "status": "never_run"}
    latest["_id"] = str(latest["_id"])
    if "triggered_at" in latest:
        latest["triggered_at"] = latest["triggered_at"].isoformat()
    return latest
