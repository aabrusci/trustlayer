from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.session import UserSession
from app.models.user import User
from app.core.security import decode_access_token
from app.core.audit import log_event
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/sessions", tags=["sessions"])
bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def create_session(db: Session, user: User, request: Request):
    session = UserSession(
        user_id=user.id,
        user_email=user.email,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", "")[:200],
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(session)
    db.commit()
    return session

@router.get("/")
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active == True
    ).order_by(UserSession.last_seen.desc()).all()
    return [{
        "id": str(s.id),
        "ip_address": s.ip_address,
        "user_agent": s.user_agent,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "last_seen": s.last_seen.isoformat() if s.last_seen else None,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        "is_active": s.is_active
    } for s in sessions]

@router.delete("/{session_id}")
def revoke_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = False
    db.commit()
    log_event(db, action="session_revoked", user_id=user.id, user_email=user.email, resource=session_id, status="success")
    return {"message": "Session revoked"}

@router.delete("/")
def revoke_all_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    db.commit()
    log_event(db, action="all_sessions_revoked", user_id=user.id, user_email=user.email, status="success")
    return {"message": "All sessions revoked"}
