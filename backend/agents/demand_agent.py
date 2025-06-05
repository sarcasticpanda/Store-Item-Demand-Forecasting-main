"""
Demand Agent — scans inventory for a store, runs 14-day forecasts on
at-risk SKUs, and surfaces urgency + festival-adjusted demand signals.

LLM priority (first key found wins — all have free tiers):
  GROQ_API_KEY    → Llama 3.3 70B  (free at console.groq.com)
  GEMINI_API_KEY  → Gemini 2.0 Flash (free at aistudio.google.com)
  ANTHROPIC_API_KEY → Claude Haiku  (paid, console.anthropic.com)
Falls back to rule-based summary when no key is set.
"""
import sys, os, logging
from datetime import datetime, timezone
from typing import List, Optional

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from .state import AgentState, AgentStep, DemandItem
from core.database import get_db
from core.config import settings
from services.inventory_service import get_inventory_status
from services.festival_service import get_upcoming_events
from ml.predictor import forecast as run_forecast

logger = logging.getLogger("inveniq.agents")


def _step(agent: str, message: str, detail: str = None, level: str = "info") -> AgentStep:
    return {
        "agent": agent,
        "message": message,
        "detail": detail,
        "level": level,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _build_prompt(demand_analysis: List[DemandItem], upcoming: list, store_name: str) -> str:
    critical = [d for d in demand_analysis if d["urgency"] == "critical"]
    high = [d for d in demand_analysis if d["urgency"] == "high"]
    fest_names = list({f["name"] for f in upcoming if any(
        f["multipliers"].get(d["category"], 1.0) > 1.1 for d in demand_analysis
    )})
    items_summary = "\n".join(
        f"- {d['item_name']} ({d['category']}): stock={d['current_stock']:.0f}, "
        f"{d['days_until_stockout']:.1f}d left, demand={d['avg_daily_demand']:.1f}/day, "
        f"urgency={d['urgency']}, festival_boost={d['festival_boost']:.2f}"
        for d in demand_analysis[:10]
    )
    fest_ctx = f"Upcoming festivals (30 days): {', '.join(fest_names)}." if fest_names else "No major festivals in 30 days."
    return (
        f"You are an inventory operations AI for {store_name}, an Indian quick-commerce dark store (Blinkit-style).\n"
        f"Demand analysis ({len(critical)} critical, {len(high)} high priority):\n"
        f"{items_summary}\n{fest_ctx}\n\n"
        "Give exactly 2 sentences: (1) what to action first and why, (2) festival stocking advice if relevant. "
        "Name actual products. Under 60 words total."
    )


def _try_groq(prompt: str) -> Optional[str]:
    key = getattr(settings, "GROQ_API_KEY", "")
    if not key:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.warning("Groq call failed: %s", e)
        return None


def _try_gemini(prompt: str) -> Optional[str]:
    key = getattr(settings, "GEMINI_API_KEY", "")
    if not key:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=key)
        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        return resp.text.strip()
    except Exception as e:
        logger.warning("Gemini call failed: %s", e)
        return None


def _try_anthropic(prompt: str) -> Optional[str]:
    key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=120,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        logger.warning("Anthropic call failed: %s", e)
        return None


def _ai_insight(demand_analysis: List[DemandItem], upcoming: list, store_name: str) -> Optional[tuple]:
    """Returns (provider_name, insight_text) or None if no LLM configured."""
    prompt = _build_prompt(demand_analysis, upcoming, store_name)
    for fn, name in [(_try_groq, "Groq · Llama 3.3 70B"), (_try_gemini, "Gemini 2.0 Flash"), (_try_anthropic, "Claude Haiku")]:
        result = fn(prompt)
        if result:
            return name, result
    return None


def demand_node(state: AgentState) -> dict:
    steps: List[AgentStep] = list(state.get("steps", []))
    store_id = state["store_id"]
    store_name = state["store_name"]

    steps.append(_step("demand", f"Scanning {store_name}",
                        "Loading inventory status for all 50 SKUs"))

    statuses = get_inventory_status(store_id)
    at_risk    = [s for s in statuses if s["status"] in ("reorder", "critical", "stockout")]
    n_stockout = sum(1 for s in statuses if s["status"] == "stockout")
    n_critical = sum(1 for s in statuses if s["status"] == "critical")
    n_reorder  = sum(1 for s in statuses if s["status"] == "reorder")

    level = "error" if n_stockout > 0 else ("warning" if n_critical > 0 else "info")
    steps.append(_step("demand",
                        f"Found {len(at_risk)} SKUs needing reorder",
                        f"{n_stockout} stockout · {n_critical} critical · {n_reorder} reorder",
                        level))

    if not at_risk:
        steps.append(_step("demand", "All inventory levels are healthy — no action needed",
                            None, "success"))
        return {"steps": steps, "demand_analysis": []}

    db = get_db()
    items_map = {i["_id"]: i for i in db.items.find()}
    inv_map   = {r["item_id"]: r for r in db.inventory.find({"store_id": store_id})}
    upcoming  = get_upcoming_events(30)

    steps.append(_step("demand", "Running 14-day demand forecasts",
                        f"Forecasting {min(len(at_risk), 12)} priority SKUs"))

    demand_analysis: List[DemandItem] = []

    for s in at_risk[:12]:
        item      = items_map.get(s["item_id"], {})
        inv_rec   = inv_map.get(s["item_id"], {})
        category  = item.get("category", "general")
        lead_time = inv_rec.get("lead_time_days", 2)

        try:
            preds      = run_forecast(store_id, s["item_id"], days=14)
            avg_demand = (sum(p["predicted_sales"] for p in preds) / len(preds)
                          if preds else s.get("eoq", 30) / 7)
        except Exception:
            avg_demand = s.get("recommended_order_qty", 30) / 7

        festival_boost = 1.0
        festival_name  = None
        for fest in upcoming:
            mult = fest["multipliers"].get(category.lower(), 1.0)
            if mult > festival_boost:
                festival_boost = mult
                festival_name  = fest["name"]

        if s["status"] == "stockout" or s["days_until_stockout"] <= 1:
            urgency = "critical"
        elif s["status"] == "critical" or s["days_until_stockout"] <= 3:
            urgency = "high"
        else:
            urgency = "normal"

        fest_note = f" · {festival_name} ×{festival_boost:.1f}" if festival_boost > 1 else ""
        steps.append(_step(
            "demand",
            f"{s['item_name']} — {urgency.upper()}",
            f"Stock {s['current_stock']:.0f} · {s['days_until_stockout']:.1f}d left · "
            f"Forecast {avg_demand:.1f}/day{fest_note}",
            "error" if urgency == "critical" else "warning",
        ))

        demand_analysis.append({
            "item_id":             s["item_id"],
            "item_name":           s["item_name"],
            "category":            category,
            "sku_segment":         s["sku_segment"],
            "current_stock":       s["current_stock"],
            "reorder_point":       s["reorder_point"],
            "safety_stock":        s["safety_stock"],
            "days_until_stockout": s["days_until_stockout"],
            "avg_daily_demand":    round(avg_demand, 2),
            "festival_boost":      round(festival_boost, 2),
            "urgency":             urgency,
            "lead_time_days":      lead_time,
        })

    # AI insight — tries Groq → Gemini → Anthropic → skips gracefully
    llm_result = _ai_insight(demand_analysis, upcoming, store_name)
    if llm_result:
        provider, insight = llm_result
        steps.append(_step("demand", f"AI Insight ({provider})", insight, "success"))
        logger.info("AI insight generated via %s for %s", provider, store_name)
    else:
        steps.append(_step("demand",
                            f"Demand analysis complete — {len(demand_analysis)} SKUs flagged",
                            "Handing off to Inventory Agent", "success"))

    return {"steps": steps, "demand_analysis": demand_analysis}
