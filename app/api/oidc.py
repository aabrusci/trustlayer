from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.application import Application
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.core.security import create_access_token, decode_access_token, create_refresh_token
from app.core.config import settings
from passlib.context import CryptContext
from datetime import timedelta, datetime, timezone
from pydantic import BaseModel
import secrets
import json

router = APIRouter(tags=["oidc"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

auth_codes = {}

@router.get("/.well-known/openid-configuration")
def openid_configuration(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "userinfo_endpoint": f"{base}/oauth/userinfo",
        "jwks_uri": f"{base}/oauth/jwks",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["HS256"],
        "scopes_supported": ["openid", "profile", "email"],
        "token_endpoint_auth_methods_supported": ["client_secret_post"],
        "claims_supported": ["sub", "email", "name", "iat", "exp"],
        "code_challenge_methods_supported": ["S256"]
    }

@router.get("/oauth/authorize")
def authorize(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    scope: str = "openid profile email",
    state: str = "",
    code_challenge: str = "",
    code_challenge_method: str = "S256",
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        Application.client_id == client_id,
        Application.is_active == True
    ).first()
    if not app:
        raise HTTPException(status_code=400, detail="Invalid client_id")
    if redirect_uri not in app.redirect_uris:
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")
    if response_type != "code":
        raise HTTPException(status_code=400, detail="Only response_type=code supported")
    login_url = f"/oauth/login?client_id={client_id}&redirect_uri={redirect_uri}&state={state}&scope={scope}&code_challenge={code_challenge}"
    return RedirectResponse(url=login_url)

class TokenRequest(BaseModel):
    grant_type: str
    code: str = ""
    redirect_uri: str = ""
    client_id: str = ""
    client_secret: str = ""
    code_verifier: str = ""
    refresh_token: str = ""

@router.post("/oauth/token")
def token(body: TokenRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(
        Application.client_id == body.client_id,
        Application.is_active == True
    ).first()
    if not app or app.client_secret != body.client_secret:
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    if body.grant_type == "authorization_code":
        code_data = auth_codes.pop(body.code, None)
        if not code_data:
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        user_id = code_data["user_id"]
    elif body.grant_type == "refresh_token":
        rt = db.query(RefreshToken).filter(
            RefreshToken.token == body.refresh_token,
            RefreshToken.is_revoked == False
        ).first()
        if not rt:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = str(rt.user_id)
        rt.is_revoked = True
        db.commit()
    else:
        raise HTTPException(status_code=400, detail="Unsupported grant_type")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(subject=str(user.id))
    refresh_token_value = create_refresh_token()
    new_rt = RefreshToken(
        token=refresh_token_value,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(new_rt)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_value,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "scope": "openid profile email"
    }

@router.get("/oauth/userinfo")
def userinfo(request: Request, db: Session = Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ")[1]
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "sub": str(user.id),
        "email": user.email,
        "name": user.full_name,
        "email_verified": user.is_verified
    }

class LoginForm(BaseModel):
    email: str
    password: str
    client_id: str
    redirect_uri: str
    state: str = ""
    scope: str = "openid profile email"
    code_challenge: str = ""

@router.post("/oauth/login")
def oauth_login(body: LoginForm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    code = secrets.token_urlsafe(32)
    auth_codes[code] = {
        "user_id": str(user.id),
        "client_id": body.client_id,
        "redirect_uri": body.redirect_uri,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5)
    }
    separator = "&" if "?" in body.redirect_uri else "?"
    redirect = f"{body.redirect_uri}{separator}code={code}&state={body.state}"
    return {"redirect_to": redirect, "code": code}
