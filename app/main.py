from fastapi import FastAPI
from app.core.config import settings
from app.api.users import router as users_router
from app.api.mfa import router as mfa_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

app.include_router(users_router)
app.include_router(mfa_router)

@app.get("/")
def root():
    return {"product": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}
