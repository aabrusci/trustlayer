from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from datetime import datetime, timezone

def log_event(
    db: Session,
    action: str,
    user_id=None,
    user_email=None,
    resource=None,
    ip_address=None,
    user_agent=None,
    status="success",
    details=None
):
    try:
        entry = AuditLog(
            user_id=user_id,
            user_email=user_email,
            action=action,
            resource=resource,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
