from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.security import decode_access_token
from app.core.audit import log_event
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/admin/users", tags=["user-management"])
bearer_scheme = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

@router.get("/")
def list_users(
    page: int = 1,
    limit: int = 50,
    search: str = None,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    query = db.query(User)
    if search:
        query = query.filter(
            User.email.ilike(f"%{search}%") |
            User.full_name.ilike(f"%{search}%")
        )
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "users": [{
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "mfa_enabled": u.mfa_enabled,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users]
    }

@router.get("/{user_id}")
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    login_count = db.query(AuditLog).filter(
        AuditLog.user_id == user.id,
        AuditLog.action == "login",
        AuditLog.status == "success"
    ).count()
    last_login = db.query(AuditLog).filter(
        AuditLog.user_id == user.id,
        AuditLog.action == "login",
        AuditLog.status == "success"
    ).order_by(AuditLog.created_at.desc()).first()
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "mfa_enabled": user.mfa_enabled,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "login_count": login_count,
        "last_login": last_login.created_at.isoformat() if last_login else None
    }

@router.patch("/{user_id}")
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_verified is not None:
        user.is_verified = body.is_verified
    db.commit()
    log_event(db, action="user_updated", user_id=admin_id, resource=str(user.id), status="success", details=f"Updated user {user.email}")
    return {"message": "User updated", "user_id": str(user.id)}

@router.post("/{user_id}/block")
def block_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    user.is_active = False
    db.commit()
    log_event(db, action="user_blocked", user_id=admin_id, resource=str(user.id), status="success", details=f"Blocked user {user.email}")
    return {"message": f"User {user.email} blocked"}

@router.post("/{user_id}/unblock")
def unblock_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    log_event(db, action="user_unblocked", user_id=admin_id, resource=str(user.id), status="success", details=f"Unblocked user {user.email}")
    return {"message": f"User {user.email} unblocked"}

@router.delete("/{user_id}/mfa")
def reset_mfa(
    user_id: str,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.mfa_enabled = False
    user.mfa_secret = None
    db.commit()
    log_event(db, action="mfa_reset", user_id=admin_id, resource=str(user.id), status="success", details=f"MFA reset for {user.email}")
    return {"message": f"MFA reset for {user.email}"}
