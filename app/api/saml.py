from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.saml_provider import SAMLProvider
from app.models.user import User
from app.core.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import base64
import uuid
from datetime import datetime, timezone
from lxml import etree
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.x509 import load_pem_x509_certificate
import os

router = APIRouter(prefix="/saml", tags=["saml"])
bearer_scheme = HTTPBearer()

CERT_FILE = "app/saml/certs/cert.pem"
KEY_FILE = "app/saml/certs/key.pem"

def get_cert_content():
    with open(CERT_FILE) as f:
        cert = f.read()
    return cert.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace("\n", "").strip()

def get_private_key():
    with open(KEY_FILE, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)

class SAMLProviderCreate(BaseModel):
    name: str
    entity_id: str
    acs_url: str

@router.post("/providers", status_code=201)
def create_provider(
    body: SAMLProviderCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    existing = db.query(SAMLProvider).filter(SAMLProvider.entity_id == body.entity_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Entity ID already exists")
    provider = SAMLProvider(
        name=body.name,
        entity_id=body.entity_id,
        acs_url=body.acs_url,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return {"id": str(provider.id), "name": provider.name, "entity_id": provider.entity_id, "acs_url": provider.acs_url}

@router.get("/providers", )
def list_providers(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    providers = db.query(SAMLProvider).filter(SAMLProvider.is_active == True).all()
    return [{"id": str(p.id), "name": p.name, "entity_id": p.entity_id, "acs_url": p.acs_url} for p in providers]

@router.get("/metadata", response_class=Response)
def metadata(request: Request):
    base = str(request.base_url).rstrip("/")
    cert_content = get_cert_content()
    metadata_xml = f"""<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="{base}/saml/metadata">
  <IDPSSODescriptor
      WantAuthnRequestsSigned="false"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>{cert_content}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <SingleSignOnService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="{base}/saml/sso"/>
    <SingleSignOnService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="{base}/saml/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>"""
    return Response(content=metadata_xml, media_type="application/xml")

@router.get("/sso")
def sso_redirect(request: Request, SAMLRequest: str = "", RelayState: str = "", db: Session = Depends(get_db)):
    return HTMLResponse(content=f"""
<html><body style="font-family:sans-serif;max-width:400px;margin:50px auto">
<h2>TrustLayer Login</h2>
<form method="post" action="/saml/sso">
  <input type="hidden" name="SAMLRequest" value="{SAMLRequest}">
  <input type="hidden" name="RelayState" value="{RelayState}">
  <div style="margin-bottom:12px">
    <label>Email</label><br>
    <input type="email" name="email" style="width:100%;padding:8px;margin-top:4px" required>
  </div>
  <div style="margin-bottom:12px">
    <label>Password</label><br>
    <input type="password" name="password" style="width:100%;padding:8px;margin-top:4px" required>
  </div>
  <button type="submit" style="background:#6c63ff;color:white;padding:10px 20px;border:none;border-radius:6px;cursor:pointer">
    Accedi
  </button>
</form>
</body></html>
""")

@router.post("/sso")
async def sso_post(
    request: Request,
    SAMLRequest: str = Form(default=""),
    RelayState: str = Form(default=""),
    email: str = Form(default=""),
    password: str = Form(default=""),
    db: Session = Depends(get_db)
):
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.hashed_password):
        return HTMLResponse("<h3>Credenziali non valide. <a href='javascript:history.back()'>Riprova</a></h3>", status_code=401)

    base = str(request.base_url).rstrip("/")
    issue_instant = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    assertion_id = "_" + str(uuid.uuid4()).replace("-", "")
    response_id = "_" + str(uuid.uuid4()).replace("-", "")

    saml_response = f"""<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="{response_id}"
    Version="2.0"
    IssueInstant="{issue_instant}"
    Destination="{base}/saml/acs">
  <saml:Issuer>{base}/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="{assertion_id}" Version="2.0" IssueInstant="{issue_instant}">
    <saml:Issuer>{base}/saml/metadata</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">{user.email}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="{issue_instant}" Recipient="{base}/saml/acs"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>{user.email}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="name">
        <saml:AttributeValue>{user.full_name or ""}</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>"""

    encoded = base64.b64encode(saml_response.encode()).decode()
    acs_url = f"{base}/saml/acs"

    return HTMLResponse(content=f"""
<html><body onload="document.forms[0].submit()">
<form method="post" action="{acs_url}">
  <input type="hidden" name="SAMLResponse" value="{encoded}">
  <input type="hidden" name="RelayState" value="{RelayState}">
  <noscript><button type="submit">Continua</button></noscript>
</form>
</body></html>
""")

@router.post("/acs")
async def acs(SAMLResponse: str = Form(default=""), RelayState: str = Form(default="")):
    try:
        decoded = base64.b64decode(SAMLResponse).decode()
        return {"status": "success", "message": "SAML assertion received", "relay_state": RelayState}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid SAML response: {str(e)}")
