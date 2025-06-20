"""
JWT authentication — login returns a bearer token valid for 8 hours.
Demo credentials come from environment / .env file.
Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

try:
    from jose import JWTError, jwt
    from passlib.context import CryptContext
    _HAS_DEPS = True
except ImportError:
    _HAS_DEPS = False

from core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto") if _HAS_DEPS else None
_oauth2  = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_ALGORITHM = "HS256"
_EXPIRE_HOURS = 8


def _make_token(email: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=_EXPIRE_HOURS)
    return jwt.encode({"sub": email, "exp": exp}, settings.JWT_SECRET, algorithm=_ALGORITHM)


def verify_token(token: str = Depends(_oauth2)) -> Optional[str]:
    """Dependency: returns email if token valid, None if auth disabled."""
    if not settings.REQUIRE_AUTH:
        return None
    if not _HAS_DEPS:
        raise HTTPException(503, "Auth dependencies not installed")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[_ALGORITHM])
        return payload.get("sub")
    except (JWTError, Exception):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token",
                            headers={"WWW-Authenticate": "Bearer"})


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = _EXPIRE_HOURS * 3600
    email: str


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Login with ADMIN_EMAIL / ADMIN_PASSWORD from backend/.env.
    Returns a JWT bearer token valid for 8 hours.
    """
    if not _HAS_DEPS:
        raise HTTPException(503, "python-jose and passlib not installed")
    admin_email = getattr(settings, "ADMIN_EMAIL", "admin@inveniq.ai")
    admin_pass  = getattr(settings, "ADMIN_PASSWORD", "inveniq2025")
    if form.username != admin_email or form.password != admin_pass:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials",
                            headers={"WWW-Authenticate": "Bearer"})
    token = _make_token(form.username)
    return TokenResponse(access_token=token, email=form.username)


@router.get("/me")
def me(email: Optional[str] = Depends(verify_token)):
    return {
        "email": email or "guest",
        "auth_enabled": settings.REQUIRE_AUTH,
        "role": "admin",
    }
