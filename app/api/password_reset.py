from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.password_reset import PasswordReset
from app.core.audit import log_event
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import secrets

router = APIRouter(prefix="/auth", tags=["password-reset"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"message": "Se l'email esiste riceverai un link di reset"}
    token = secrets.token_urlsafe(32)
    reset = PasswordReset(
        email=body.email,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2)
    )
    db.add(reset)
    db.commit()
    reset_url = f"http://localhost:5173/reset-password?token={token}"
    log_event(db, action="password_reset_requested", user_id=user.id, user_email=user.email, status="success")
    return {
        "message": "Se l'email esiste riceverai un link di reset",
        "reset_url": reset_url,
        "token": token
    }

@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset = db.query(PasswordReset).filter(
        PasswordReset.token == body.token,
        PasswordReset.is_used == False
    ).first()
    if not reset:
        raise HTTPException(status_code=400, detail="Token non valido o già utilizzato")
    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token scaduto")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="La password deve essere di almeno 8 caratteri")
    user = db.query(User).filter(User.email == reset.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    user.hashed_password = pwd_context.hash(body.new_password)
    reset.is_used = True
    db.commit()
    log_event(db, action="password_reset", user_id=user.id, user_email=user.email, status="success")
    return {"message": "Password aggiornata con successo"}

@router.get("/verify-reset/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    reset = db.query(PasswordReset).filter(
        PasswordReset.token == token,
        PasswordReset.is_used == False
    ).first()
    if not reset:
        raise HTTPException(status_code=400, detail="Token non valido")
    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token scaduto")
    return {"email": reset.email, "valid": True}
