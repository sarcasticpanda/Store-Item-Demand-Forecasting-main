from pymongo import MongoClient
from pymongo.database import Database
from .config import settings

_client: MongoClient = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI)
    return _client

def get_db() -> Database:
    return get_client()[settings.MONGO_DB]

def close_client():
    global _client
    if _client:
        _client.close()
        _client = None
