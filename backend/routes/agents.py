"""
Agent routes — trigger multi-agent run, list purchase orders, approve/reject.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, HTTPException, Body
from core.database import get_db
from agents.graph import agent_graph
from agents.state import AgentState

router = APIRouter(prefix="/agents", tags=["Agents"])


def _store_name(store_id: int) -> str:
    db = get_db()
    store = db.stores.find_one({"_id": store_id})
    return store["name"] if store else f"Store {store_id}"


@router.post("/run")
def run_agents(store_id: int = Body(..., embed=True)):
    """Run the full demand→inventory→logistics agent pipeline for a store."""
    if not (1 <= store_id <= 10):
        raise HTTPException(400, "store_id must be 1–10")

    run_id     = str(uuid.uuid4())
    store_name = _store_name(store_id)

    initial_state: AgentState = {
        "run_id":           run_id,
        "store_id":         store_id,
        "store_name":       store_name,
        "steps":            [],
        "demand_analysis":  [],
        "validated_orders": [],
        "purchase_order_id": None,
        "status":           "running",
        "error":            None,
    }

    try:
        result = agent_graph.invoke(initial_state)
    except Exception as exc:
        # Persist failed run to DB so history shows it
        db = get_db()
        db.agent_runs.insert_one({
            "_id":         run_id,
            "store_id":    store_id,
            "store_name":  store_name,
            "steps":       initial_state["steps"],
            "status":      "error",
            "error":       str(exc),
            "started_at":  datetime.now(timezone.utc).isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
        })
        raise HTTPException(500, f"Agent run failed: {exc}")

    # Persist completed run
    db = get_db()
    db.agent_runs.insert_one({
        "_id":              run_id,
        "store_id":         store_id,
        "store_name":       store_name,
        "steps":            result.get("steps", []),
        "demand_analysis":  result.get("demand_analysis", []),
        "validated_orders": result.get("validated_orders", []),
        "purchase_order_id": result.get("purchase_order_id"),
        "status":           result.get("status", "done"),
        "started_at":       datetime.now(timezone.utc).isoformat(),
        "finished_at":      datetime.now(timezone.utc).isoformat(),
    })

    return {
        "run_id":           run_id,
        "store_id":         store_id,
        "store_name":       store_name,
        "steps":            result.get("steps", []),
        "demand_analysis":  result.get("demand_analysis", []),
        "validated_orders": result.get("validated_orders", []),
        "purchase_order_id": result.get("purchase_order_id"),
        "status":           result.get("status", "done"),
    }


@router.get("/runs")
def list_runs(store_id: Optional[int] = Query(None), limit: int = Query(20, le=100)):
    db    = get_db()
    query = {"store_id": store_id} if store_id else {}
    runs  = list(db.agent_runs.find(query).sort("started_at", -1).limit(limit))
    for r in runs:
        r["_id"] = str(r["_id"])
    return runs


@router.get("/purchase-orders")
def list_purchase_orders(
    status:   Optional[str] = Query(None),
    store_id: Optional[int] = Query(None),
    limit:    int            = Query(50, le=200),
):
    db    = get_db()
    query = {}
    if status:
        query["status"] = status
    if store_id:
        query["store_id"] = store_id
    pos = list(db.purchase_orders.find(query).sort("created_at", -1).limit(limit))
    for p in pos:
        if "created_at" in p and not isinstance(p["created_at"], str):
            p["created_at"] = p["created_at"].isoformat()
        if "reviewed_at" in p and p["reviewed_at"] and not isinstance(p["reviewed_at"], str):
            p["reviewed_at"] = p["reviewed_at"].isoformat()
    return pos


@router.post("/purchase-orders/{po_id}/approve")
def approve_po(po_id: str):
    db = get_db()
    result = db.purchase_orders.update_one(
        {"_id": po_id, "status": "pending"},
        {"$set": {"status": "approved", "reviewed_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Purchase order not found or already reviewed")
    return {"message": "Purchase order approved", "po_id": po_id}


@router.post("/purchase-orders/{po_id}/reject")
def reject_po(po_id: str, note: str = Body("", embed=True)):
    db = get_db()
    result = db.purchase_orders.update_one(
        {"_id": po_id, "status": "pending"},
        {"$set": {
            "status":         "rejected",
            "rejection_note": note,
            "reviewed_at":    datetime.now(timezone.utc),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Purchase order not found or already reviewed")
    return {"message": "Purchase order rejected", "po_id": po_id}
