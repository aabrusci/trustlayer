from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class ApplicationCreate(BaseModel):
    name: str
    redirect_uris: str
    scopes: str = "openid profile email"

class ApplicationResponse(BaseModel):
    id: UUID
    name: str
    client_id: str
    client_secret: str
    redirect_uris: str
    scopes: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
