from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.webhook import Webhook, WebhookDelivery
from app.core.security import decode_access_token
from pydantic import BaseModel
from typing import Optional
import httpx
import json
import hmac
import hashlib
import secrets
from datetime import datetime, timezone

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
bearer_scheme = HTTPBearer()

AVAILABLE_EVENTS = [
    "login", "logout", "login_failed", "register",
    "user_blocked", "user_unblocked", "mfa_enabled",
    "mfa_disabled", "invitation_sent", "invitation_accepted",
    "session_revoked", "password_reset"
]

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

class WebhookCreate(BaseModel):
    name: str
    url: str
    events: list[str]
    secret: Optional[str] = None

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[list[str]] = None
    is_active: Optional[bool] = None

@router.get("/events")
def list_events(user_id: str = Depends(get_current_user_id)):
    return {"events": AVAILABLE_EVENTS}

@router.get("/")
def list_webhooks(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    webhooks = db.query(Webhook).filter(Webhook.is_active == True).all()
    return [{
        "id": str(w.id),
        "name": w.name,
        "url": w.url,
        "events": w.events.split(","),
        "is_active": w.is_active,
        "created_at": w.created_at.isoformat() if w.created_at else None
    } for w in webhooks]

@router.post("/", status_code=201)
def create_webhook(
    body: WebhookCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    secret = body.secret or secrets.token_urlsafe(32)
    webhook = Webhook(
        name=body.name,
        url=body.url,
        events=",".join(body.events),
        secret=secret
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return {
        "id": str(webhook.id),
        "name": webhook.name,
        "url": webhook.url,
        "events": webhook.events.split(","),
        "secret": secret,
        "message": "Webhook created. Save the secret — it won't be shown again."
    }

@router.patch("/{webhook_id}")
def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if body.name: webhook.name = body.name
    if body.url: webhook.url = body.url
    if body.events: webhook.events = ",".join(body.events)
    if body.is_active is not None: webhook.is_active = body.is_active
    db.commit()
    return {"message": "Webhook updated"}

@router.delete("/{webhook_id}")
def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    webhook.is_active = False
    db.commit()
    return {"message": "Webhook deleted"}

@router.post("/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    payload = {
        "event": "test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {"message": "TrustLayer webhook test"}
    }
    success, status_code = await deliver_webhook(webhook, "test", payload, db)
    return {"success": success, "status_code": status_code}

@router.get("/{webhook_id}/deliveries")
def get_deliveries(
    webhook_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    deliveries = db.query(WebhookDelivery).filter(
        WebhookDelivery.webhook_id == webhook_id
    ).order_by(WebhookDelivery.created_at.desc()).limit(50).all()
    return [{
        "id": str(d.id),
        "event": d.event,
        "response_status": d.response_status,
        "success": d.success,
        "created_at": d.created_at.isoformat() if d.created_at else None
    } for d in deliveries]

async def deliver_webhook(webhook: Webhook, event: str, payload: dict, db: Session):
    payload_str = json.dumps(payload)
    signature = hmac.new(
        webhook.secret.encode(),
        payload_str.encode(),
        hashlib.sha256
    ).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-TrustLayer-Event": event,
        "X-TrustLayer-Signature": f"sha256={signature}",
        "X-TrustLayer-Timestamp": datetime.now(timezone.utc).isoformat()
    }
    status_code = None
    success = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook.url, content=payload_str, headers=headers)
            status_code = response.status_code
            success = 200 <= status_code < 300
    except Exception:
        success = False
    delivery = WebhookDelivery(
        webhook_id=webhook.id,
        event=event,
        payload=payload_str,
        response_status=status_code,
        success=success
    )
    db.add(delivery)
    db.commit()
    return success, status_code

async def trigger_webhook_event(db: Session, event: str, data: dict):
    webhooks = db.query(Webhook).filter(
        Webhook.is_active == True
    ).all()
    for webhook in webhooks:
        if event in webhook.events.split(","):
            payload = {
                "event": event,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": data
            }
            await deliver_webhook(webhook, event, payload, db)
