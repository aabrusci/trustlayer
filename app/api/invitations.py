from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.core.security import decode_access_token, create_access_token
from app.core.audit import log_event
from app.core.config import settings
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import secrets

router = APIRouter(prefix="/invitations", tags=["invitations"])
bearer_scheme = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

class InviteRequest(BaseModel):
    email: EmailStr

class AcceptInvitation(BaseModel):
    token: str
    full_name: str
    password: str

@router.post("/")
def create_invitation(
    body: InviteRequest,
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    existing_invite = db.query(Invitation).filter(
        Invitation.email == body.email,
        Invitation.is_used == False,
        Invitation.expires_at > datetime.now(timezone.utc)
    ).first()
    if existing_invite:
        raise HTTPException(status_code=400, detail="Invitation already sent")
    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        email=body.email,
        token=token,
        invited_by=admin_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    log_event(db, action="invitation_sent", user_id=admin_id, resource=body.email, status="success")
    invite_url = f"http://localhost:5173/accept-invite?token={token}"
    return {
        "message": f"Invitation created for {body.email}",
        "invite_url": invite_url,
        "expires_at": invitation.expires_at.isoformat(),
        "token": token
    }

@router.get("/")
def list_invitations(
    db: Session = Depends(get_db),
    admin_id: str = Depends(get_current_user_id)
):
    invitations = db.query(Invitation).order_by(Invitation.created_at.desc()).all()
    return [{
        "id": str(i.id),
        "email": i.email,
        "is_used": i.is_used,
        "expires_at": i.expires_at.isoformat() if i.expires_at else None,
        "created_at": i.created_at.isoformat() if i.created_at else None
    } for i in invitations]

@router.post("/accept")
def accept_invitation(body: AcceptInvitation, db: Session = Depends(get_db)):
    invitation = db.query(Invitation).filter(
        Invitation.token == body.token,
        Invitation.is_used == False
    ).first()
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
    if invitation.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    existing = db.query(User).filter(User.email == invitation.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    user = User(
        email=invitation.email,
        hashed_password=pwd_context.hash(body.password),
        full_name=body.full_name,
        is_verified=True,
        is_active=True
    )
    db.add(user)
    invitation.is_used = True
    db.commit()
    db.refresh(user)
    access_token = create_access_token(subject=str(user.id))
    log_event(db, action="invitation_accepted", user_id=user.id, user_email=user.email, status="success")
    return {
        "message": "Account created successfully",
        "access_token": access_token,
        "user": {"id": str(user.id), "email": user.email, "full_name": user.full_name}
    }

@router.get("/verify/{token}")
def verify_token(token: str, db: Session = Depends(get_db)):
    invitation = db.query(Invitation).filter(
        Invitation.token == token,
        Invitation.is_used == False
    ).first()
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
    if invitation.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation expired")
    return {"email": invitation.email, "valid": True}
