"""
Inventory management: safety stock, reorder point, EOQ, stockout detection.
"""
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional
from core.database import get_db


SERVICE_LEVEL_Z = {"fast": 1.65, "slow": 1.04, "premium": 1.28, "essential": 2.33}


def compute_safety_stock(avg_daily: float, std_daily: float, lead_time: int, sku_segment: str) -> float:
    z = SERVICE_LEVEL_Z.get(sku_segment, 1.65)
    return z * std_daily * math.sqrt(lead_time)


def compute_reorder_point(avg_daily: float, lead_time: int, safety_stock: float) -> float:
    return (avg_daily * lead_time) + safety_stock


def compute_eoq(avg_daily: float, ordering_cost: float, holding_cost_pct: float, unit_cost: float) -> float:
    annual_demand = avg_daily * 365
    holding_cost = holding_cost_pct * unit_cost
    if holding_cost <= 0:
        return avg_daily * 30
    return math.sqrt((2 * annual_demand * ordering_cost) / holding_cost)


def compute_days_until_stockout(current_stock: float, avg_daily: float) -> float:
    if avg_daily <= 0:
        return 999
    return current_stock / avg_daily


def get_inventory_status(store_id: Optional[int] = None) -> List[Dict]:
    db = get_db()
    query = {}
    if store_id:
        query["store_id"] = store_id

    inventory_records = list(db.inventory.find(query))
    items = {i["_id"]: i for i in db.items.find()}

    results = []
    for rec in inventory_records:
        item = items.get(rec["item_id"], {})
        avg_daily = item.get("avg_daily_sales", 10)
        std_daily = item.get("sales_std", 5)
        seg = item.get("sku_segment", "fast")
        lead_time = rec.get("lead_time_days", 3)
        current_stock = rec.get("current_stock", 0)

        safety_stock = compute_safety_stock(avg_daily, std_daily, lead_time, seg)
        reorder_point = compute_reorder_point(avg_daily, lead_time, safety_stock)
        eoq = compute_eoq(avg_daily, rec.get("ordering_cost", 50), rec.get("holding_cost_pct", 0.25), rec.get("unit_cost", 10))
        days_until_stockout = compute_days_until_stockout(current_stock, avg_daily)

        if current_stock <= 0:
            status = "stockout"
        elif current_stock <= safety_stock:
            status = "critical"
        elif current_stock <= reorder_point:
            status = "reorder"
        elif current_stock > reorder_point * 2.5:
            status = "overstock"
        else:
            status = "ok"

        results.append({
            "store_id": rec["store_id"],
            "item_id": rec["item_id"],
            "item_name": item.get("name", f"Item {rec['item_id']}"),
            "sku_segment": seg,
            "current_stock": current_stock,
            "safety_stock": round(safety_stock, 1),
            "reorder_point": round(reorder_point, 1),
            "eoq": round(eoq, 1),
            "days_until_stockout": round(days_until_stockout, 1),
            "recommended_order_qty": round(eoq, 0) if status in ("reorder", "critical", "stockout") else 0,
            "status": status,
        })
    return results


def update_stock(store_id: int, item_id: int, new_stock: int) -> bool:
    db = get_db()
    result = db.inventory.update_one(
        {"store_id": store_id, "item_id": item_id},
        {"$set": {"current_stock": new_stock, "last_updated": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


def generate_alerts(store_id: Optional[int] = None):
    db = get_db()
    statuses = get_inventory_status(store_id)

    healthy = []  # items now sufficiently stocked

    for s in statuses:
        if s["status"] not in ("reorder", "critical", "stockout"):
            healthy.append({"store_id": s["store_id"], "item_id": s["item_id"]})
            continue
        existing = db.reorder_alerts.find_one({
            "store_id": s["store_id"],
            "item_id": s["item_id"],
            "status": "active",
        })
        if existing:
            continue
        alert_type = "critical" if s["status"] in ("critical", "stockout") else "reorder"
        db.reorder_alerts.insert_one({
            "store_id": s["store_id"],
            "item_id": s["item_id"],
            "item_name": s["item_name"],
            "sku_segment": s["sku_segment"],
            "alert_type": alert_type,
            "current_stock": s["current_stock"],
            "reorder_point": s["reorder_point"],
            "safety_stock": s["safety_stock"],
            "eoq": s["eoq"],
            "days_until_stockout": s["days_until_stockout"],
            "recommended_order_qty": s["recommended_order_qty"],
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        })

    # Auto-resolve stale alerts for items whose stock is now healthy
    for h in healthy:
        db.reorder_alerts.update_many(
            {"store_id": h["store_id"], "item_id": h["item_id"], "status": "active"},
            {"$set": {"status": "auto_resolved", "resolved_at": datetime.now(timezone.utc)}},
        )


def resolve_alert(alert_id: str) -> bool:
    from bson import ObjectId
    db = get_db()
    result = db.reorder_alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc)}},
    )
    return result.modified_count > 0


def get_alerts(store_id: Optional[int] = None, status: str = "active") -> List[Dict]:
    db = get_db()
    query = {"status": status}
    if store_id:
        query["store_id"] = store_id
    alerts = list(db.reorder_alerts.find(query).sort("created_at", -1).limit(200))
    for a in alerts:
        a["_id"] = str(a["_id"])
        if "created_at" in a:
            a["created_at"] = a["created_at"].isoformat()
        if "resolved_at" in a:
            a["resolved_at"] = a["resolved_at"].isoformat()
    return alerts
