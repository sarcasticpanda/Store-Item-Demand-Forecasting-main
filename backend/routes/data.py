"""
CSV upload route — accepts store manager's historical sales CSV,
matches products to catalog, stores to user_sales, and refreshes forecasts + alerts.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import io
import pandas as pd
from datetime import datetime, timezone
from difflib import SequenceMatcher
from core.database import get_db

router = APIRouter(prefix="/data", tags=["Data Upload"])

_REQUIRED_COLS_ALT = [
    ["date", "product_name", "units_sold"],
    ["date", "product", "units"],
    ["date", "item", "sales"],
    ["date", "name", "qty"],
]


def _fuzzy_match(name: str, catalog: list[dict]) -> Optional[dict]:
    """Find the best-matching item from catalog using case-insensitive fuzzy matching."""
    name_lower = name.strip().lower()
    best_score = 0.0
    best_item  = None
    for item in catalog:
        score = SequenceMatcher(None, name_lower, item["name"].lower()).ratio()
        if score > best_score:
            best_score = score
            best_item  = item
    # Require at least 60% similarity to avoid false matches
    return best_item if best_score >= 0.6 else None


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Try to map various column name conventions to date/product_name/units_sold."""
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    renames = {}
    for col in df.columns:
        if col in ("product", "item", "name", "product_name"): renames[col] = "product_name"
        elif col in ("units", "sales", "qty", "quantity", "units_sold"): renames[col] = "units_sold"
        elif col in ("date", "day", "timestamp"): renames[col] = "date"
    return df.rename(columns=renames)


@router.post("/upload")
async def upload_csv(
    file:     UploadFile = File(...),
    store_id: int        = Form(1),
):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    df = _normalise_columns(df)
    missing = [c for c in ("date", "product_name", "units_sold") if c not in df.columns]
    if missing:
        raise HTTPException(
            400,
            f"CSV missing columns: {missing}. Required: date, product_name (or product/item), units_sold (or units/sales)",
        )

    # Parse dates and drop bad rows
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["units_sold"] = pd.to_numeric(df["units_sold"], errors="coerce")
    df = df.dropna(subset=["date", "product_name", "units_sold"])
    df = df[df["units_sold"] >= 0]

    if df.empty:
        raise HTTPException(400, "No valid rows found after cleaning. Check date format (YYYY-MM-DD) and numeric units_sold.")

    db = get_db()
    catalog = list(db.items.find({}, {"_id": 1, "name": 1}))

    matched_products: list[str] = []
    unmatched:        list[str] = []
    to_insert:        list[dict] = []
    stats_by_item:    dict[int, list[float]] = {}

    for product_name, group in df.groupby("product_name"):
        item = _fuzzy_match(str(product_name), catalog)
        if item is None:
            if str(product_name) not in unmatched:
                unmatched.append(str(product_name))
            continue

        item_id = int(item["_id"])
        if item["name"] not in matched_products:
            matched_products.append(item["name"])

        for _, row in group.iterrows():
            to_insert.append({
                "store_id": store_id,
                "item_id":  item_id,
                "date":     row["date"].to_pydatetime(),
                "sales":    float(row["units_sold"]),
                "source":   "uploaded",
                "filename": file.filename,
            })
            stats_by_item.setdefault(item_id, []).append(float(row["units_sold"]))

    if to_insert:
        # Upsert by (store_id, item_id, date) to avoid duplicates from re-uploads
        for doc in to_insert:
            db.user_sales.update_one(
                {"store_id": doc["store_id"], "item_id": doc["item_id"], "date": doc["date"]},
                {"$set": doc},
                upsert=True,
            )

        # Update item stats with uploaded demand data
        for item_id, sales_list in stats_by_item.items():
            import numpy as np
            arr = np.array(sales_list)
            db.items.update_one(
                {"_id": item_id},
                {"$set": {
                    "avg_daily_sales": round(float(arr.mean()), 2),
                    "sales_std":       round(float(arr.std()) if len(arr) > 1 else 0.0, 2),
                }},
            )

        # Refresh alerts with updated demand stats
        from services.inventory_service import generate_alerts
        generate_alerts(store_id)

    # Log the upload
    db.upload_logs.insert_one({
        "filename":      file.filename,
        "store_id":      store_id,
        "uploaded_at":   datetime.now(timezone.utc),
        "rows_total":    len(df),
        "rows_matched":  len(to_insert),
        "matched_count": len(matched_products),
        "unmatched":     unmatched,
    })

    return {
        "rows_uploaded":    len(to_insert),
        "matched_products": matched_products,
        "unmatched":        unmatched,
        "store_id":         store_id,
    }


@router.get("/uploads")
def list_uploads():
    db = get_db()
    logs = list(db.upload_logs.find({}, {"_id": 0}).sort("uploaded_at", -1).limit(50))
    for log in logs:
        if "uploaded_at" in log:
            log["uploaded_at"] = log["uploaded_at"].isoformat()
    return logs
