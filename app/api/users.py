from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.session import UserSession
from app.schemas.user import UserCreate, UserResponse, LoginRequest, TokenResponse
from app.core.security import create_access_token, decode_access_token, create_refresh_token, REFRESH_TOKEN_EXPIRE_DAYS
from app.core.config import settings
from app.core.audit import log_event
from passlib.context import CryptContext
from datetime import timedelta, datetime, timezone
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        log_event(db, action="register", user_email=user_in.email, ip_address=request.client.host, status="failed", details="Email already registered")
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_in.email,
        hashed_password=pwd_context.hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_event(db, action="register", user_id=user.id, user_email=user.email, ip_address=request.client.host, status="success")
    return user

@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        log_event(db, action="login", user_email=credentials.email, ip_address=request.client.host, status="failed", details="Invalid credentials")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    access_token = create_access_token(subject=str(user.id))
    refresh_token_value = create_refresh_token()
    refresh_token = RefreshToken(
        token=refresh_token_value,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token)
    session = UserSession(
        user_id=user.id,
        user_email=user.email,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", "")[:200],
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(session)
    db.commit()
    log_event(db, action="login", user_id=user.id, user_email=user.email, ip_address=request.client.host, status="success", user_agent=request.headers.get("user-agent"))
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_value,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/refresh")
def refresh(body: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    token = db.query(RefreshToken).filter(
        RefreshToken.token == body.refresh_token,
        RefreshToken.is_revoked == False
    ).first()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")
    token.is_revoked = True
    new_refresh_token_value = create_refresh_token()
    new_refresh_token = RefreshToken(
        token=new_refresh_token_value,
        user_id=token.user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_refresh_token)
    db.commit()
    access_token = create_access_token(subject=str(token.user_id))
    log_event(db, action="token_refresh", user_id=token.user_id, ip_address=request.client.host, status="success")
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token_value,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/logout")
def logout(body: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    token = db.query(RefreshToken).filter(RefreshToken.token == body.refresh_token).first()
    if token:
        token.is_revoked = True
        db.commit()
        log_event(db, action="logout", user_id=token.user_id, ip_address=request.client.host, status="success")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def me(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)):
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
