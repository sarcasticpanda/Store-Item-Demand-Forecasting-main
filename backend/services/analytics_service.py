import os
import pandas as pd
import numpy as np
from core.database import get_db


def get_error_by_store() -> list:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "reports", "error_by_store.csv")
    if not os.path.exists(path):
        return []
    df = pd.read_csv(path)
    return df.rename(columns={"abs_error": "mae"}).to_dict("records")


def get_error_by_item() -> list:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "reports", "error_by_product.csv")
    if not os.path.exists(path):
        return []
    df = pd.read_csv(path)
    return df.rename(columns={"product": "item_id", "abs_error": "mae"}).to_dict("records")


def get_feature_importance() -> list:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "reports", "feature_importance_tuned.csv")
    if not os.path.exists(path):
        return []
    df = pd.read_csv(path)
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    return df.head(20).to_dict("records")


def get_sku_summary() -> dict:
    db = get_db()
    items = list(db.items.find())
    segments = {}
    for item in items:
        seg = item.get("sku_segment", "unknown")
        if seg not in segments:
            segments[seg] = {"count": 0, "avg_daily_sales": [], "avg_cv": []}
        segments[seg]["count"] += 1
        segments[seg]["avg_daily_sales"].append(item.get("avg_daily_sales", 0))
        segments[seg]["avg_cv"].append(item.get("cv", 0))

    result = []
    for seg, data in segments.items():
        result.append({
            "segment": seg,
            "count": data["count"],
            "avg_daily_sales": round(np.mean(data["avg_daily_sales"]), 2),
            "avg_cv": round(np.mean(data["avg_cv"]), 3),
        })
    return result


def get_dashboard_stats() -> dict:
    db = get_db()
    total_stores = db.stores.count_documents({})
    total_items = db.items.count_documents({})
    active_alerts = db.reorder_alerts.count_documents({"status": "active"})
    critical_alerts = db.reorder_alerts.count_documents({"status": "active", "alert_type": "critical"})

    inventory = list(db.inventory.find())
    stockout_count = sum(1 for i in inventory if i.get("current_stock", 0) <= 0)
    total_stock = sum(i.get("current_stock", 0) for i in inventory)

    from ml.predictor import get_model_metrics
    metrics = get_model_metrics()

    return {
        "total_stores": total_stores,
        "total_items": total_items,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "stockout_count": stockout_count,
        "total_stock_units": total_stock,
        "model_mae": metrics["mae"],
        "model_rmse": metrics["rmse"],
        "model_r2": metrics["r2"],
        "model_mape": metrics["mape"],
    }
