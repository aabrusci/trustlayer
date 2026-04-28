from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.db.database import Base
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.application import Application
from app.models.saml_provider import SAMLProvider
from app.models.subscription import Subscription
from app.models.audit_log import AuditLog
from app.models.invitation import Invitation
from app.models.session import UserSession
from app.models.webhook import Webhook, WebhookDelivery
from app.models.brand_settings import BrandSettings
from app.models.password_reset import PasswordReset

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
