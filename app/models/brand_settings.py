from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
from app.db.database import Base

class BrandSettings(Base):
    __tablename__ = "brand_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String, nullable=False, default="TrustLayer")
    logo_url = Column(String, nullable=True)
    primary_color = Column(String, nullable=False, default="#7c6aff")
    background_color = Column(String, nullable=False, default="#080810")
    accent_color = Column(String, nullable=False, default="#a594ff")
    support_email = Column(String, nullable=True)
    custom_domain = Column(String, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
