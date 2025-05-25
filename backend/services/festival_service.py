"""
Indian festival calendar with demand multipliers by product category.
Applied as POST-PROCESSING on ML predictions — not as model features.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional


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
            # Pick the festival with the strongest average multiplier
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
    """Return festival name for this date, or None."""
    f = get_festival_for_date(date_str)
    return f["name"] if f else None


def get_upcoming_events(days: int = 60) -> List[Dict]:
    """Return festivals starting within the next `days` days."""
    today = datetime.utcnow().date()
    results = []
    for f in FESTIVALS:
        center = _parse(f["date"]).date()
        half = f.get("window", 1) // 2
        start = center - timedelta(days=half)
        end = center + timedelta(days=half)
        # Show if the festival window overlaps with [today, today+days]
        if end >= today and start <= today + timedelta(days=days):
            days_away = (center - today).days
            results.append({
                "name": f["name"],
                "date": f["date"],
                "days_away": days_away,
                "window_days": f["window"],
                "multipliers": f["multipliers"],
                "peak_category": max(f["multipliers"], key=f["multipliers"].get),
                "peak_multiplier": max(f["multipliers"].values()),
            })
    results.sort(key=lambda x: abs(x["days_away"]))
    return results
