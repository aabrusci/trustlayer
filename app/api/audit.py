from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.core.security import decode_access_token
from datetime import datetime
import csv
import io

router = APIRouter(prefix="/audit", tags=["audit"])
bearer_scheme = HTTPBearer()

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

@router.get("/logs")
def get_logs(
    page: int = 1,
    limit: int = 50,
    action: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if status:
        query = query.filter(AuditLog.status == status)
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [{
            "id": str(l.id),
            "user_email": l.user_email,
            "action": l.action,
            "resource": l.resource,
            "ip_address": l.ip_address,
            "status": l.status,
            "details": l.details,
            "created_at": l.created_at.isoformat() if l.created_at else None
        } for l in logs]
    }

@router.get("/export")
def export_csv(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","Email","Azione","Risorsa","IP","Status","Dettagli","Data"])
    for l in logs:
        writer.writerow([str(l.id), l.user_email, l.action, l.resource, l.ip_address, l.status, l.details, l.created_at])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trustlayer_audit.csv"}
    )

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    total = db.query(AuditLog).count()
    success = db.query(AuditLog).filter(AuditLog.status=="success").count()
    failed = db.query(AuditLog).filter(AuditLog.status=="failed").count()
    logins = db.query(AuditLog).filter(AuditLog.action=="login").count()
    return {"total": total, "success": success, "failed": failed, "logins": logins}
