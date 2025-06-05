"""
Logistics Agent — assembles the final purchase order from validated quantities,
saves it to MongoDB, and marks the run complete.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List

from .state import AgentState, AgentStep, OrderItem
from core.database import get_db


def _step(agent: str, message: str, detail: str = None, level: str = "info") -> AgentStep:
    return {
        "agent": agent,
        "message": message,
        "detail": detail,
        "level": level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def logistics_node(state: AgentState) -> dict:
    steps: List[AgentStep] = list(state.get("steps", []))
    orders: List[OrderItem] = state.get("validated_orders", [])
    store_id   = state["store_id"]
    store_name = state["store_name"]
    run_id     = state["run_id"]

    if not orders:
        steps.append(_step("logistics", "No purchase order needed — all stock levels are adequate",
                           None, "success"))
        return {"steps": steps, "purchase_order_id": None, "status": "done"}

    steps.append(_step("logistics", f"Drafting Purchase Order for {store_name}",
                       f"{len(orders)} line items to process"))

    total_cost = round(sum(o["subtotal"] for o in orders), 2)
    n_festival = sum(1 for o in orders if o["festival_adjusted"])

    # Priority: escalate based on worst urgency in the order
    urgencies  = {o["urgency"] for o in orders}
    if "critical" in urgencies:
        priority = "urgent"
    elif "high" in urgencies:
        priority = "high"
    else:
        priority = "normal"

    # Estimated delivery: worst lead time + 1 buffer day
    max_lead = max((o["lead_time_days"] for o in orders), default=2)
    eta       = (datetime.now(timezone.utc) + timedelta(days=max_lead + 1)).strftime("%Y-%m-%d")

    po_id = str(uuid.uuid4())

    db = get_db()
    db.purchase_orders.insert_one({
        "_id":           po_id,
        "run_id":        run_id,
        "store_id":      store_id,
        "store_name":    store_name,
        "items":         [dict(o) for o in orders],
        "total_cost":    total_cost,
        "priority":      priority,
        "status":        "pending",
        "rejection_note": None,
        "estimated_delivery": eta,
        "created_at":    datetime.now(timezone.utc),
        "reviewed_at":   None,
    })

    festival_note = f" · {n_festival} SKUs festival-adjusted" if n_festival else ""
    steps.append(_step(
        "logistics",
        f"PO#{po_id[:8].upper()} drafted — {priority.upper()} priority",
        f"{len(orders)} SKUs · Total ₹{total_cost:,.0f} · ETA {eta}{festival_note}",
        "success",
    ))
    steps.append(_step("logistics",
                       "Awaiting manager approval",
                       "Use Approve or Reject buttons to action this purchase order",
                       "info"))

    return {"steps": steps, "purchase_order_id": po_id, "status": "done"}
