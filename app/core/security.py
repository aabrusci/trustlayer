from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.core.config import settings
import secrets

ALGORITHM = "HS256"
REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)
