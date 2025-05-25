from fastapi import APIRouter, BackgroundTasks
from services.retraining_service import trigger_retrain, get_pipeline_history, get_pipeline_status

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.get("/status")
def status():
    return get_pipeline_status()


@router.get("/history")
def history(limit: int = 20):
    return get_pipeline_history(limit)


@router.post("/retrain")
def retrain(background_tasks: BackgroundTasks):
    background_tasks.add_task(trigger_retrain, "manual")
    return {"message": "Retraining started in background"}
