"""
Inventory Agent — takes the demand analysis, applies dark-store capacity
constraints and festival adjustments, and produces validated order quantities.
"""
import math
from datetime import datetime, timezone
from typing import List

from .state import AgentState, AgentStep, OrderItem, DemandItem
from core.database import get_db

_MAX_STOCK = 300   # physical max for a Blinkit dark store shelf


def _step(agent: str, message: str, detail: str = None, level: str = "info") -> AgentStep:
    return {
        "agent": agent,
        "message": message,
        "detail": detail,
        "level": level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def inventory_node(state: AgentState) -> dict:
    steps: List[AgentStep] = list(state.get("steps", []))
    demand_analysis: List[DemandItem] = state.get("demand_analysis", [])
    store_id   = state["store_id"]
    store_name = state["store_name"]

    if not demand_analysis:
        steps.append(_step("inventory", "No SKUs require restocking — inventory is healthy",
                           None, "success"))
        return {"steps": steps, "validated_orders": []}

    steps.append(_step("inventory",
                       f"Validating order quantities for {store_name}",
                       f"Applying capacity limits · lead time buffers · festival adjustments"))

    db = get_db()
    items_map = {i["_id"]: i for i in db.items.find()}

    validated_orders: List[OrderItem] = []
    total_cost = 0.0

    for item in demand_analysis:
        item_doc  = items_map.get(item["item_id"], {})
        unit_cost = float(item_doc.get("unit_cost", 50))

        # Days of stock to cover = lead_time + 7-day safety buffer
        cover_days = item["lead_time_days"] + 7

        # Base order qty: enough to bring stock up to cover_days demand
        base_qty = math.ceil(item["avg_daily_demand"] * cover_days - item["current_stock"])
        base_qty = max(base_qty, 1)

        # Festival uplift
        festival_adjusted = False
        if item["festival_boost"] > 1.0:
            adjusted = math.ceil(base_qty * item["festival_boost"])
            festival_adjusted = adjusted != base_qty
            base_qty = adjusted

        # Capacity ceiling: can't exceed dark-store max
        headroom = max(0, _MAX_STOCK - int(item["current_stock"]))
        order_qty = min(base_qty, headroom)

        if order_qty <= 0:
            steps.append(_step("inventory",
                               f"{item['item_name']} — SKIP",
                               "Already at capacity", "info"))
            continue

        subtotal   = round(order_qty * unit_cost, 2)
        total_cost += subtotal

        fest_tag = f" · festival boost ×{item['festival_boost']:.1f}" if festival_adjusted else ""
        steps.append(_step(
            "inventory",
            f"{item['item_name']} — order {order_qty} units",
            f"Lead time {item['lead_time_days']}d + 7d buffer{fest_tag} · ₹{unit_cost:.0f}/unit · ₹{subtotal:,.0f}",
            "warning" if item["urgency"] == "critical" else "info",
        ))

        validated_orders.append({
            "item_id":          item["item_id"],
            "item_name":        item["item_name"],
            "category":         item["category"],
            "order_qty":        order_qty,
            "unit_cost":        unit_cost,
            "subtotal":         subtotal,
            "festival_adjusted": festival_adjusted,
            "urgency":          item["urgency"],
            "current_stock":    item["current_stock"],
            "lead_time_days":   item["lead_time_days"],
        })

    steps.append(_step(
        "inventory",
        f"Validation complete — {len(validated_orders)} line items · Total ₹{total_cost:,.0f}",
        "Passing to Logistics Agent for purchase order drafting", "success",
    ))

    return {"steps": steps, "validated_orders": validated_orders}
