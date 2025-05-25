from fastapi import APIRouter, Query
from services.analytics_service import (
    get_error_by_store, get_error_by_item,
    get_feature_importance, get_sku_summary, get_dashboard_stats
)
from services.festival_service import get_upcoming_events
from core.database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def dashboard():
    return get_dashboard_stats()


@router.get("/error-by-store")
def error_by_store():
    return get_error_by_store()


@router.get("/error-by-item")
def error_by_item():
    return get_error_by_item()


@router.get("/feature-importance")
def feature_importance():
    return get_feature_importance()


@router.get("/sku-summary")
def sku_summary():
    return get_sku_summary()


@router.get("/stores")
def stores():
    db = get_db()
    docs = list(db.stores.find())
    for d in docs:
        d["_id"] = int(d["_id"])
    return docs


@router.get("/items")
def items():
    db = get_db()
    docs = list(db.items.find())
    for d in docs:
        d["_id"] = int(d["_id"])
    return docs


@router.get("/upcoming-events")
def upcoming_events(days: int = Query(60, ge=7, le=365)):
    return get_upcoming_events(days)
