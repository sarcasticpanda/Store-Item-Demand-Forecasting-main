import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from routes.forecast  import router as forecast_router
from routes.inventory import router as inventory_router
from routes.analytics import router as analytics_router
from routes.pipeline  import router as pipeline_router
from routes.data      import router as data_router
from routes.agents    import router as agents_router
from routes.auth      import router as auth_router
from core.database import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("inveniq")

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


def scheduled_retrain():
    from services.retraining_service import trigger_retrain
    trigger_retrain("scheduled")


def scheduled_alert_refresh():
    from services.inventory_service import generate_alerts
    generate_alerts()
    logger.info("Scheduled alert refresh complete")


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("InvenIQ backend starting up")
    from ml.predictor import _load_model, _load_train_data
    _load_model()
    _load_train_data()
    logger.info("Model and training data loaded")

    # Generate alerts immediately so dashboard shows real data after every restart
    from services.inventory_service import generate_alerts
    generate_alerts()
    logger.info("Startup alert generation complete")

    scheduler.add_job(scheduled_retrain,       "cron", day_of_week="sun", hour=2)
    scheduler.add_job(scheduled_alert_refresh,  "interval", hours=1)
    scheduler.start()

    yield

    scheduler.shutdown()
    logger.info("InvenIQ backend shutdown")


app = FastAPI(
    title="Inventory Intelligence API",
    description="Demand forecasting + inventory management for Indian quick-commerce dark stores",
    version="1.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth_router,      prefix="/api")
app.include_router(forecast_router,  prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(pipeline_router,  prefix="/api")
app.include_router(data_router,      prefix="/api")
app.include_router(agents_router,    prefix="/api")


@app.get("/api/health")
def health():
    try:
        get_db().command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "ok",
        "database": db_status,
        "version": "1.1.0",
        "data_note": "Training data is synthetic Indian FMCG demand (Poisson-calibrated, 2021-2025)",
    }
