from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.core.security import decode_access_token
import secrets

router = APIRouter(prefix="/applications", tags=["applications"])
bearer_scheme = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    app_in: ApplicationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    application = Application(
        name=app_in.name,
        client_id=secrets.token_urlsafe(16),
        client_secret=secrets.token_urlsafe(32),
        redirect_uris=app_in.redirect_uris,
        scopes=app_in.scopes,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

@router.get("/", response_model=list[ApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    return db.query(Application).filter(Application.is_active == True).all()

@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.is_active = False
    db.commit()
