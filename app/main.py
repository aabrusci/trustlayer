from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.users import router as users_router
from app.api.mfa import router as mfa_router
from app.api.applications import router as applications_router
from app.api.oidc import router as oidc_router
from app.api.saml import router as saml_router
from app.api.billing import router as billing_router
from app.api.audit import router as audit_router
from app.api.user_management import router as user_mgmt_router
from app.api.sessions import router as sessions_router
from app.api.invitations import router as invitations_router
from app.api.webhooks import router as webhooks_router
from app.api.brand import router as brand_router
from app.api.password_reset import router as password_reset_router

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(mfa_router)
app.include_router(applications_router)
app.include_router(oidc_router)
app.include_router(saml_router)
app.include_router(billing_router)
app.include_router(audit_router)
app.include_router(user_mgmt_router)
app.include_router(sessions_router)
app.include_router(invitations_router)
app.include_router(webhooks_router)
app.include_router(brand_router)
app.include_router(password_reset_router)

@app.get("/")
def root():
    return {"product": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}
