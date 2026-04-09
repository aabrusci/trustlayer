from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.core.security import decode_access_token
from app.core.config import settings
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/billing", tags=["billing"])
bearer_scheme = HTTPBearer()

PLANS = {
    "starter": {"name": "Starter", "amount": 29900, "currency": "eur"},
    "business": {"name": "Business", "amount": 69900, "currency": "eur"},
    "enterprise": {"name": "Enterprise", "amount": 149900, "currency": "eur"},
}

PLANS_ANNUAL = {
    "starter": {"name": "Starter Annual", "amount": 299000, "currency": "eur"},
    "business": {"name": "Business Annual", "amount": 699000, "currency": "eur"},
    "enterprise": {"name": "Enterprise Annual", "amount": 1499000, "currency": "eur"},
}

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

class CheckoutRequest(BaseModel):
    plan: str
    billing_cycle: str = "monthly"

@router.get("/plans")
def get_plans():
    return {
        "monthly": {
            "starter": {"name": "Starter", "price": "€299/mese", "amount": 299, "users": "500"},
            "business": {"name": "Business", "price": "€699/mese", "amount": 699, "users": "2.000"},
            "enterprise": {"name": "Enterprise", "price": "€1.499/mese", "amount": 1499, "users": "Illimitati"},
        },
        "annual": {
            "starter": {"name": "Starter Annual", "price": "€2.990/anno", "amount": 2990, "users": "500"},
            "business": {"name": "Business Annual", "price": "€6.990/anno", "amount": 6990, "users": "2.000"},
            "enterprise": {"name": "Enterprise Annual", "price": "€14.990/anno", "amount": 14990, "users": "Illimitati"},
        }
    }

@router.post("/checkout")
def create_checkout(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan_data = PLANS_ANNUAL[body.plan] if body.billing_cycle == "annual" else PLANS[body.plan]
    try:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name or user.email,
            metadata={"user_id": str(user.id)}
        )
        checkout_session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": plan_data["currency"],
                    "product_data": {"name": f"TrustLayer {plan_data['name']}"},
                    "unit_amount": plan_data["amount"],
                    "recurring": {
                        "interval": "year" if body.billing_cycle == "annual" else "month"
                    }
                },
                "quantity": 1,
            }],
            mode="subscription",
            subscription_data={
                "trial_settings": {
                    "end_behavior": {"missing_payment_method": "cancel"}
                },
                "trial_period_days": 30,
            },
            payment_method_collection="if_required",
            success_url="http://localhost:3000/billing/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url="http://localhost:3000/billing/cancel",
            metadata={"user_id": str(user.id), "plan": body.plan, "billing_cycle": body.billing_cycle}
        )
        sub = Subscription(
            user_id=user.id,
            stripe_customer_id=customer.id,
            plan=body.plan,
            billing_cycle=body.billing_cycle,
            status="trialing",
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(sub)
        db.commit()
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "trial_days": 30,
            "plan": body.plan,
            "billing_cycle": body.billing_cycle
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/subscription")
def get_subscription(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        return {"status": "no_subscription", "plan": None}
    return {
        "status": sub.status,
        "plan": sub.plan,
        "billing_cycle": sub.billing_cycle,
        "trial_ends_at": sub.trial_ends_at,
        "current_period_end": sub.current_period_end
    }

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]
        sub = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        if sub:
            sub.stripe_subscription_id = session.get("subscription")
            sub.status = "active"
            db.commit()
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription["id"]
        ).first()
        if sub:
            sub.status = "canceled"
            db.commit()
    return {"status": "ok"}
