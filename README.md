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
- Festival post-processing: Diwali +60% snacks, Janmashtami +60% dairy, IPL +50% beverages
- Category-aware stocking windows (dairy 3-day max, snacks 14 days, staples 30 days)

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

## Model Performance & Evaluation

### Regression Metrics (held-out test set: Oct–Dec 2025)

| Metric | Value | Interpretation |
|---|---|---|
| MAE | **3.41 units/day** | Average absolute prediction error |
| RMSE | **4.76** | Penalises large errors more than MAE |
| R² | **0.8827** | 88.3% variance explained by the model |
| MAPE | **26.3%** | Mean absolute percentage error |

### Classification Metrics (stockout risk — binary)

The model output is bucketed into restock-needed vs. sufficient inventory to evaluate as a classification problem:

| Metric | Value |
|---|---|
| Accuracy | 91.4% |
| Precision | 89.2% |
| Recall | 88.7% |
| F1-Score | 88.9% |

### Confusion Matrix

The confusion matrix shows stockout detection performance across the test set:

![Confusion Matrix](reports/confusion_matrix.png)

### Forecast Visualisations

Actual vs. predicted daily unit sales (LightGBM):

![Actual vs Predicted](reports/actual_pred_lgb.png)

Full residuals distribution (should be centred near zero, approximately normal):

![Residuals Distribution](reports/residuals_dist_lgb.png)

LightGBM feature importances — top drivers of demand:

![Feature Importances](reports/feature_importances.png)

### Feature Engineering

`create_time_series_features()` groups by `(store, item)` and creates:

- **Lags:** 91, 98, 105, 112, 119, 126, 182, 364, 546, 728 days
- **Rolling windows:** 365, 546, 730 days (mean, std, min, max)
- **EWM:** 5 decay weights × 10 lags = 50 features
- **Date features:** dayofweek, month, quarter, is_weekend, week_start/end
- **Target transform:** `log1p(sales)` → `expm1()` to back-transform predictions

All features are computed in strict chronological order per group to prevent data leakage.

### Financial Impact Analysis

Using estimated carry cost (₹0.5/unit/day) and stockout penalty (₹5/lost unit):

| Scenario | Cost Reduction vs. Baseline |
|---|---|
| Optimistic | 34% reduction |
| Base case | 22% reduction |
| Pessimistic | 11% reduction |

---

## Monitoring & Alerts

| Signal | Threshold | Action |
|---|---|---|
| Prediction error drift | MAE increases >20% vs. baseline | Flag for retraining |
| Stockout rate | >5% of SKUs simultaneously | Immediate alert |
| Inventory turnover | <2× monthly for a SKU | Review reorder point |
| Auto-retrain trigger | Weekly (Sunday 02:00) via APScheduler | Retrain on latest data |

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
python train_model.py   # requires input/train.csv
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
│       ├── festival_service.py   # 17 Indian festivals + category-aware stocking
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
