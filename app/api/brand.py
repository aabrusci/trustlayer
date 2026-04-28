from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.brand_settings import BrandSettings
from app.core.security import decode_access_token
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/brand", tags=["brand"])
bearer_scheme = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

class BrandUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    background_color: Optional[str] = None
    accent_color: Optional[str] = None
    support_email: Optional[str] = None
    custom_domain: Optional[str] = None

@router.get("/")
def get_brand(db: Session = Depends(get_db)):
    brand = db.query(BrandSettings).first()
    if not brand:
        return {
            "company_name": "TrustLayer",
            "logo_url": None,
            "primary_color": "#7c6aff",
            "background_color": "#080810",
            "accent_color": "#a594ff",
            "support_email": None,
            "custom_domain": None
        }
    return {
        "company_name": brand.company_name,
        "logo_url": brand.logo_url,
        "primary_color": brand.primary_color,
        "background_color": brand.background_color,
        "accent_color": brand.accent_color,
        "support_email": brand.support_email,
        "custom_domain": brand.custom_domain
    }

@router.patch("/")
def update_brand(
    body: BrandUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    brand = db.query(BrandSettings).first()
    if not brand:
        brand = BrandSettings()
        db.add(brand)
    if body.company_name: brand.company_name = body.company_name
    if body.logo_url is not None: brand.logo_url = body.logo_url
    if body.primary_color: brand.primary_color = body.primary_color
    if body.background_color: brand.background_color = body.background_color
    if body.accent_color: brand.accent_color = body.accent_color
    if body.support_email is not None: brand.support_email = body.support_email
    if body.custom_domain is not None: brand.custom_domain = body.custom_domain
    brand.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Brand settings updated"}
