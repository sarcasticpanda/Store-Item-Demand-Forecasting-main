from fastapi import APIRouter, Query, HTTPException, Body
from services.inventory_service import (
    get_inventory_status, update_stock, generate_alerts,
    get_alerts, resolve_alert
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("")
def inventory(store_id: int = Query(None)):
    return get_inventory_status(store_id)


@router.put("/update")
def update_inventory(
    store_id: int = Body(...),
    item_id:  int = Body(...),
    new_stock: int = Body(..., ge=0),
):
    ok = update_stock(store_id, item_id, new_stock)
    if not ok:
        raise HTTPException(404, "Inventory record not found")
    # Refresh alerts after stock change so stale alerts auto-resolve
    generate_alerts(store_id)
    return {"message": "Stock updated", "store_id": store_id, "item_id": item_id, "new_stock": new_stock}


@router.get("/alerts")
def alerts(store_id: int = Query(None), status: str = Query("active")):
    return get_alerts(store_id, status)


@router.post("/alerts/{alert_id}/resolve")
def resolve(alert_id: str):
    ok = resolve_alert(alert_id)
    if not ok:
        raise HTTPException(404, "Alert not found")
    return {"message": "Alert resolved", "alert_id": alert_id}
