# InvenIQ — AI-Powered Inventory Intelligence for Indian Quick-Commerce

> End-to-end demand forecasting and inventory management system built for dark store operations (Blinkit-style). Combines LightGBM time-series forecasting, a LangGraph multi-agent pipeline, and a real-time Next.js dashboard.

---

## What This Is

A full-stack product that tells a dark store manager:
- **What will sell tomorrow** — per SKU, per store, with confidence bands
- **What to order right now** — quantity, cost, priority, ETA
- **What festivals are coming** — and how much extra stock to pre-position
- **Why** — an AI agent (Llama 3.3 / Gemini 2.0) explains the reasoning in plain English

Built for the Indian quick-commerce context: 10 Blinkit dark stores, 50 FMCG SKUs, ₹ pricing, Indian festival calendar (Diwali, IPL, Navratri, Janmashtami, Onam, Ganesh Chaturthi, etc.)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **ML Model** | LightGBM — lag/rolling/EWM features, log1p transform, ±MAE confidence bands |
| **AI Agents** | LangGraph 0.2 — 3-node state machine (Demand → Inventory → Logistics) |
| **LLM** | Groq (Llama 3.3 70B, free) · Gemini 2.0 Flash (free) · Claude Haiku (paid) |
| **Backend** | FastAPI + APScheduler + slowapi rate limiting + JWT auth |
| **Database** | MongoDB — stores, items, inventory, alerts, agent runs, purchase orders |
| **Frontend** | Next.js 14, Tailwind CSS, Recharts, Framer Motion |
| **Training Data** | Synthetic Indian FMCG demand (2021–2025), 913K rows, Poisson-calibrated |

---

## Architecture

```
Browser (Next.js · port 3000)
        ↓  REST API calls
FastAPI Backend (port 8001)
    ├── /api/forecast      → LightGBM predictions + confidence bands
    ├── /api/inventory     → stock levels, reorder alerts, EOQ
    ├── /api/analytics     → dashboard stats, store/item summaries
    ├── /api/agents/run    → LangGraph pipeline
    │       Demand Agent   → scans 50 SKUs, forecasts top 12
    │       Inventory Agent → calculates order quantities
    │       Logistics Agent → drafts Purchase Order in MongoDB
    ├── /api/auth/login    → JWT bearer token (8-hour expiry)
    └── /api/data/upload   → ingest real CSV sales data
        ↓
MongoDB (local · port 27017)
    └── inventory_db: stores, items, inventory, reorder_alerts,
                      predictions, purchase_orders, agent_runs
```

---

## Key Features

**Demand Forecasting**
- LightGBM trained on 5 years of Indian FMCG daily sales
- 70+ features: 10 lag periods (91–728 days), rolling windows (365/546/730), 50 EWM features, date features
- Confidence bands on every prediction (±MAE, widening over horizon)
- Festival post-processing: Diwali +60% snacks, Janmashtami +60% dairy, IPL +50% beverages, etc.

**Multi-Agent Pipeline**
- Click "Run AI Agents" → 3 agents execute in sequence
- Agent 1 (Demand): Identifies critical/high/normal SKUs, runs 14-day forecasts
- Agent 2 (Inventory): Calculates order quantities with lead-time buffer + festival uplift
- Agent 3 (Logistics): Drafts a Purchase Order saved to MongoDB with priority and ETA
- LLM insight: "Restock Nestle Dahi 400g and Fortune Sunflower Oil 1L first — both are at 0.9 days stock"
- Manager can Approve or Reject the PO from the UI

**Inventory Intelligence**
- Safety stock per SKU segment (essential z=2.33, fast z=1.65, slow z=1.04, premium z=1.28)
- EOQ (Economic Order Quantity) for cost-optimal reorder sizing
- Auto-resolving alerts: restocked items clear automatically
- Real-time status: stockout / critical / reorder / ok / overstock per (store, item)

---

## Model Performance

| Metric | Value |
|---|---|
| MAE | 3.41 units/day |
| RMSE | 4.76 |
| R² | 0.8827 |
| MAPE | 26.3% |

*Trained on synthetic Indian FMCG data calibrated on IBEF 2023 market reports.*

---

## Quick Start

**Prerequisites:** Python 3.10+, Node.js 18+, MongoDB running locally

```bash
# 1. Clone
git clone https://github.com/sarcasticpanda/Store-Item-Demand-Forecasting-main.git
cd Store-Item-Demand-Forecasting-main

# 2. Backend
cd backend
pip install -r requirements.txt
python seed.py          # seeds MongoDB with Indian stores, products, inventory
python -m uvicorn main:app --host 0.0.0.0 --port 8001

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev             # opens http://localhost:3000

# 4. (Optional) Train model from scratch
python train_model.py   # requires input/train.csv from Kaggle
```

**Add a free LLM key for AI insights** (optional):
```bash
# backend/.env
GROQ_API_KEY=gsk_...   # free at console.groq.com
# OR
GEMINI_API_KEY=AIza... # free at aistudio.google.com/apikey
```

---

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI app, lifespan, rate limiting
│   ├── seed.py                  # MongoDB seeder (stores, products, inventory)
│   ├── requirements.txt
│   ├── core/
│   │   ├── config.py            # settings (env vars)
│   │   └── database.py          # MongoDB connection
│   ├── ml/
│   │   └── predictor.py         # LightGBM inference + confidence bands
│   ├── agents/
│   │   ├── graph.py             # LangGraph state machine
│   │   ├── demand_agent.py      # Agent 1: forecast + LLM insight
│   │   ├── inventory_agent.py   # Agent 2: order quantity calculation
│   │   ├── logistics_agent.py   # Agent 3: purchase order creation
│   │   └── state.py             # TypedDict state definitions
│   ├── routes/
│   │   ├── auth.py              # JWT login
│   │   ├── forecast.py          # GET /api/forecast
│   │   ├── inventory.py         # GET /api/inventory, alerts
│   │   ├── analytics.py         # dashboard, stores, items, events
│   │   ├── agents.py            # POST /api/agents/run, PO approve/reject
│   │   └── data.py              # CSV upload
│   └── services/
│       ├── inventory_service.py  # safety stock, EOQ, alert generation
│       ├── festival_service.py   # 14 Indian festivals + demand multipliers
│       ├── analytics_service.py  # aggregation queries
│       └── retraining_service.py # scheduled model retraining
│
├── frontend/
│   └── app/
│       ├── page.tsx             # Dashboard
│       ├── forecast/page.tsx    # Forecast chart with confidence bands
│       ├── inventory/page.tsx   # Stock levels + reorder alerts
│       ├── agents/page.tsx      # AI agent activity feed + PO management
│       ├── upload/page.tsx      # CSV data upload
│       └── analytics/page.tsx   # Model performance analytics
│
├── src/
│   └── modelling_utils.py       # Feature engineering (shared by train + predict)
│
├── scripts/
│   └── generate_indian_data.py  # Synthetic Indian FMCG data generator
│
├── train_model.py               # LightGBM training entry point
├── models/lgb_reg.pkl           # Trained model
└── reports/model_metrics.json   # MAE, RMSE, R², MAPE
```

---

## API Reference

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/auth/login` | Get JWT token (email + password) |
| GET | `/api/forecast?store_id=1&item_id=1&days=30` | Forecast with confidence bands |
| GET | `/api/inventory?store_id=1` | All SKU stock levels + status |
| GET | `/api/inventory/alerts` | Active reorder alerts |
| GET | `/api/analytics/dashboard` | Summary stats |
| GET | `/api/analytics/upcoming-events?days=60` | Festival calendar |
| POST | `/api/agents/run` | Run full AI agent pipeline |
| GET | `/api/agents/purchase-orders` | List purchase orders |
| POST | `/api/agents/purchase-orders/{id}/approve` | Approve a PO |
| POST | `/api/agents/purchase-orders/{id}/reject` | Reject with note |
| POST | `/api/data/upload` | Upload CSV sales data |
| GET | `/api/health` | Health check + version |

---

## Contact

- GitHub: [sarcasticpanda](https://github.com/sarcasticpanda)
- Email: saubhagyakashyap44@gmail.com
