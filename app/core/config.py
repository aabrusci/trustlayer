from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "TrustLayer"
    APP_VERSION: str = "0.1.0"
    SECRET_KEY: str = "changeme-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "postgresql://trustlayer:trustlayer@localhost:5432/trustlayer"
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
