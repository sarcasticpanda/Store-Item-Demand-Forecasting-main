from fastapi import APIRouter, Query, HTTPException
from datetime import date as date_type, datetime as dt
import pandas as pd

from ml.predictor import forecast, get_historical, get_model_metrics
from services.festival_service import get_festival_multiplier, get_festival_name
from core.database import get_db

router = APIRouter(prefix="/forecast", tags=["Forecast"])


def _load_user_sales(store_id: int, item_id: int) -> "pd.DataFrame | None":
    """Load uploaded user sales rows for this store+item from MongoDB."""
    db = get_db()
    rows = list(db.user_sales.find(
        {"store_id": store_id, "item_id": item_id},
        {"_id": 0, "date": 1, "sales": 1},
    ).sort("date", 1))
    if not rows:
        return None
    udf = pd.DataFrame(rows)
    udf["date"] = pd.to_datetime(udf["date"])
    udf.set_index("date", inplace=True)
    udf["store"] = store_id
    udf["item"]  = item_id
    return udf


@router.get("")
def get_forecast(
    store_id: int = Query(..., ge=1, le=10),
    item_id:  int = Query(..., ge=1, le=50),
    days:     int = Query(30, ge=7, le=90),
):
    user_df = _load_user_sales(store_id, item_id)

    predictions = forecast(store_id, item_id, days, extra_sales=user_df)
    if not predictions:
        raise HTTPException(404, "No forecast available for this store/item")
    historical = get_historical(store_id, item_id, last_n_days=90, extra_sales=user_df)

    # Date remapping: if historical tail is >2 years stale, remap so forecast starts today
    dates_remapped = False
    today = date_type.today()
    if historical and predictions:
        last_hist_date = dt.strptime(historical[-1]["date"], "%Y-%m-%d").date()
        if (today - last_hist_date).days > 730:
            first_pred_date = dt.strptime(predictions[0]["date"], "%Y-%m-%d").date()
            offset = today - first_pred_date
            for p in predictions:
                p["date"] = (dt.strptime(p["date"], "%Y-%m-%d").date() + offset).isoformat()
            for h in historical:
                h["date"] = (dt.strptime(h["date"], "%Y-%m-%d").date() + offset).isoformat()
            dates_remapped = True

    # Festival post-processing: multiply base predictions by category demand multiplier
    db = get_db()
    item_doc = db.items.find_one({"_id": item_id}) or {}
    category = item_doc.get("category", "general")

    for p in predictions:
        mult = get_festival_multiplier(p["date"], category)
        p["base_sales"] = p["predicted_sales"]
        if mult != 1.0:
            p["predicted_sales"] = round(p["predicted_sales"] * mult, 2)
            p["lower_bound"]     = round(p.get("lower_bound", 0) * mult, 2)
            p["upper_bound"]     = round(p.get("upper_bound", p["predicted_sales"]) * mult, 2)
            p["festival"]        = get_festival_name(p["date"])
            p["festival_multiplier"] = mult

    return {
        "store_id": store_id,
        "item_id": item_id,
        "item_name": item_doc.get("name", f"Item {item_id}"),
        "category": category,
        "days": days,
        "dates_remapped": dates_remapped,
        "has_user_data": user_df is not None,
        "data_source": "synthetic_indian_fmcg_2021_2025",
        "historical": historical,
        "forecast": predictions,
    }


@router.get("/metrics")
def model_metrics():
    return get_model_metrics()
