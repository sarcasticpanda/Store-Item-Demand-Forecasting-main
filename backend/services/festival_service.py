"""
Indian festival calendar with demand multipliers by product category.
Applied as POST-PROCESSING on ML predictions — not as model features.

Stocking logic is category-aware:
  dairy     → 5-day shelf life → only pre-stock 2-4 days before festival
  snacks    → 90-day shelf life → pre-stock up to 14 days before
  staples   → 180-day shelf life → pre-stock up to 30 days before
  beverages → 90-day shelf life → pre-stock up to 10 days before
  hpc       → 365-day shelf life → pre-stock up to 21 days before
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional


# How many days before a festival each category should START stocking up.
# Based on real shelf life. Dairy cannot be pre-stocked more than 3 days early.
CATEGORY_STOCKING_HORIZON = {
    "dairy":     3,    # Amul Milk expires in ~5 days — order 3 days before festival
    "snacks":    14,   # Lays/Parle-G — months shelf life, pre-stock 2 weeks early
    "staples":   30,   # Atta/Dal/Oil — 6-12 months shelf life, pre-stock 1 month early
    "beverages": 10,   # Coke/Juice — pre-stock 10 days early
    "hpc":       21,   # Soap/Shampoo — pre-stock 3 weeks early
}

FESTIVALS = [
    # ── 2026 ──────────────────────────────────────────────────────────────
    {"name": "IPL Season 2026",  "date": "2026-04-25", "window": 65, "multipliers": {"beverages": 1.5, "snacks": 1.4}},
    {"name": "Eid ul-Adha",      "date": "2026-06-28", "window": 3,  "multipliers": {"staples": 1.4, "snacks": 1.3, "dairy": 1.2}},
    {"name": "Independence Day", "date": "2026-08-15", "window": 2,  "multipliers": {"snacks": 1.2, "beverages": 1.2}},
    {"name": "Raksha Bandhan",   "date": "2026-08-28", "window": 3,  "multipliers": {"snacks": 1.4, "dairy": 1.2, "beverages": 1.2}},
    {"name": "Janmashtami",      "date": "2026-08-31", "window": 2,  "multipliers": {"dairy": 1.6, "snacks": 1.3}},
    {"name": "Ganesh Chaturthi", "date": "2026-09-10", "window": 10, "multipliers": {"snacks": 1.5, "dairy": 1.3, "staples": 1.2}},
    {"name": "Onam",             "date": "2026-09-21", "window": 7,  "multipliers": {"staples": 1.4, "dairy": 1.3, "beverages": 1.2}},
    {"name": "Navratri",         "date": "2026-10-15", "window": 10, "multipliers": {"dairy": 1.4, "staples": 1.2, "snacks": 1.3}},
    {"name": "Dussehra",         "date": "2026-10-24", "window": 2,  "multipliers": {"snacks": 1.3, "beverages": 1.2}},
    {"name": "Diwali",           "date": "2026-11-08", "window": 7,  "multipliers": {"snacks": 1.6, "dairy": 1.3, "hpc": 1.4, "beverages": 1.2}},
    {"name": "Bhai Dooj",        "date": "2026-11-11", "window": 1,  "multipliers": {"snacks": 1.3, "dairy": 1.2}},
    {"name": "Christmas",        "date": "2026-12-25", "window": 3,  "multipliers": {"beverages": 1.4, "snacks": 1.3, "dairy": 1.2}},
    # ── 2027 ──────────────────────────────────────────────────────────────
    {"name": "New Year",         "date": "2027-01-01", "window": 2,  "multipliers": {"beverages": 1.8, "snacks": 1.5, "dairy": 1.2}},
    {"name": "Pongal",           "date": "2027-01-14", "window": 3,  "multipliers": {"staples": 1.4, "dairy": 1.3}},
    {"name": "Holi",             "date": "2027-03-02", "window": 3,  "multipliers": {"beverages": 1.5, "snacks": 1.4, "dairy": 1.2}},
    {"name": "Eid ul-Fitr",      "date": "2027-03-20", "window": 3,  "multipliers": {"staples": 1.5, "snacks": 1.3, "dairy": 1.2}},
    {"name": "IPL Season 2027",  "date": "2027-04-15", "window": 65, "multipliers": {"beverages": 1.5, "snacks": 1.4}},
]


def _parse(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")


def get_festival_for_date(date_str: str) -> Optional[Dict]:
    """Return the highest-priority festival affecting this date, or None."""
    try:
        d = _parse(date_str)
    except ValueError:
        return None
    best = None
    for f in FESTIVALS:
        center = _parse(f["date"])
        half = f["window"] // 2
        if center - timedelta(days=half) <= d <= center + timedelta(days=half):
            avg_mult = sum(f["multipliers"].values()) / len(f["multipliers"])
            if best is None or avg_mult > best["_avg"]:
                best = {**f, "_avg": avg_mult}
    if best:
        best.pop("_avg", None)
    return best


def get_festival_multiplier(date_str: str, category: str) -> float:
    """Return demand multiplier for this date+category (1.0 if no festival)."""
    festival = get_festival_for_date(date_str)
    if not festival:
        return 1.0
    return festival["multipliers"].get(category.lower(), 1.0)


def get_festival_name(date_str: str) -> Optional[str]:
    f = get_festival_for_date(date_str)
    return f["name"] if f else None


def get_actionable_festival_boost(category: str, days_away: int, lead_time: int = 1) -> tuple:
    """
    Returns (festival_name, multiplier) only when it is the RIGHT TIME to
    actually place a stocking order for this category.

    Dairy with Janmashtami 59 days away → returns (None, 1.0) — too early, will expire.
    Snacks with Diwali 10 days away → returns ("Diwali", 1.6) — act now.
    """
    today = datetime.utcnow().date()
    category_lower = category.lower()
    stocking_horizon = CATEGORY_STOCKING_HORIZON.get(category_lower, 14)

    best_name = None
    best_mult = 1.0

    for f in FESTIVALS:
        center = _parse(f["date"]).date()
        days_to_festival = (center - today).days

        # Skip if the festival is already over
        if days_to_festival < -f["window"] // 2:
            continue

        # Skip if it's too early to stock this category
        # (order now would expire before the festival)
        if days_to_festival > stocking_horizon + lead_time:
            continue

        mult = f["multipliers"].get(category_lower, 1.0)
        if mult > best_mult:
            best_mult = mult
            best_name = f["name"]

    return best_name, best_mult


def get_upcoming_events(days: int = 60) -> List[Dict]:
    """Return festivals starting within the next `days` days, with per-category stocking advice."""
    today = datetime.utcnow().date()
    results = []
    for f in FESTIVALS:
        center = _parse(f["date"]).date()
        half = f.get("window", 1) // 2
        start = center - timedelta(days=half)
        end = center + timedelta(days=half)
        if end >= today and start <= today + timedelta(days=days):
            days_away = (center - today).days
            # Per-category stocking advice
            stocking_advice = {}
            for cat, mult in f["multipliers"].items():
                horizon = CATEGORY_STOCKING_HORIZON.get(cat, 14)
                if days_away <= horizon:
                    stocking_advice[cat] = f"ORDER NOW (×{mult})"
                else:
                    stocking_advice[cat] = f"order in {days_away - horizon}d (×{mult})"

            results.append({
                "name": f["name"],
                "date": f["date"],
                "days_away": days_away,
                "window_days": f["window"],
                "multipliers": f["multipliers"],
                "stocking_advice": stocking_advice,
                "peak_category": max(f["multipliers"], key=f["multipliers"].get),
                "peak_multiplier": max(f["multipliers"].values()),
            })
    results.sort(key=lambda x: abs(x["days_away"]))
    return results
