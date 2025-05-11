from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "inventory_db"
    MODEL_PATH: str = "../models/lgb_reg.pkl"
    TRAIN_DATA_PATH: str = "../input/train.csv"
    RETRAIN_MAE_THRESHOLD: float = 0.15
    # LLM providers — first one found is used; all are free-tier eligible
    GROQ_API_KEY: str = ""       # free at console.groq.com  (Llama 3.3 70B)
    GEMINI_API_KEY: str = ""     # free at aistudio.google.com (Gemini 2.0 Flash)
    ANTHROPIC_API_KEY: str = ""  # paid  at console.anthropic.com (Claude Haiku)
    JWT_SECRET: str = "inveniq-dev-secret-change-in-production-32chars"
    ADMIN_EMAIL: str = "admin@inveniq.ai"
    ADMIN_PASSWORD: str = "inveniq2025"
    REQUIRE_AUTH: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
