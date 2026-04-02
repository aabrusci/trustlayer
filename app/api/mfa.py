from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.core.security import decode_access_token
from pydantic import BaseModel
import pyotp
import qrcode
import qrcode.image.svg
from io import BytesIO
from fastapi.responses import Response
import base64

router = APIRouter(prefix="/mfa", tags=["mfa"])
bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

class VerifyOTPRequest(BaseModel):
    code: str

@router.post("/setup")
def setup_mfa(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA already enabled")
    secret = pyotp.random_base32()
    user.mfa_secret = secret
    db.commit()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user.email, issuer_name="TrustLayer")
    qr = qrcode.make(uri)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_b64}",
        "message": "Scan the QR code with Google Authenticator, then verify with /mfa/verify"
    }

@router.post("/verify")
def verify_mfa(
    body: VerifyOTPRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA not set up yet")
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    user.mfa_enabled = True
    db.commit()
    return {"message": "MFA enabled successfully", "mfa_enabled": True}

@router.post("/disable")
def disable_mfa(
    body: VerifyOTPRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA not enabled")
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    user.mfa_enabled = False
    user.mfa_secret = None
    db.commit()
    return {"message": "MFA disabled successfully", "mfa_enabled": False}

@router.get("/status")
def mfa_status(user: User = Depends(get_current_user)):
    return {"mfa_enabled": user.mfa_enabled, "email": user.email}
