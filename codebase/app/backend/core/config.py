from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Elyra"
    APP_ENV: str = "development"
    APP_VERSION: str = "0.1.0"
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "elyra_db"
    POSTGRES_USER: str = "elyra_user"
    POSTGRES_PASSWORD: str = ""
    TEST_DATABASE_URL: str = ""

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    MONGO_HOST: str = "localhost"
    MONGO_PORT: int = 27017
    MONGO_DB: str = "elyra_chat"

    @property
    def MONGO_URL(self) -> str:
        return f"mongodb://{self.MONGO_HOST}:{self.MONGO_PORT}"

    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    AES_ENCRYPTION_KEY: str = "change-me-32-character-key-here!"

    EMBEDDING_SERVICE_URL: str = "http://localhost:9001"
    MODERATION_SERVICE_URL: str = "http://localhost:9002"
    IMAGE_SERVICE_URL: str = "http://localhost:9003"
    FAKE_PROFILE_SERVICE_URL: str = "http://localhost:9004"

    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    LOCAL_LLM_URL: str = ""

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    RATE_LIMIT_PER_MINUTE: int = 100
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10
    USER_RATE_LIMIT_PER_MINUTE: int = 60
    WS_MESSAGE_RATE_LIMIT: int = 30

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_BUCKET: str = "elyra-media"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "ap-south-1"
    MAX_PHOTO_SIZE_MB: int = 5

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@elyra.app"

    TWILIO_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    FCM_SERVER_KEY: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""
    APNS_KEY_ID: str = ""
    APNS_TEAM_ID: str = ""

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_ENVIRONMENT: str = "development"
    PROMETHEUS_ENABLED: bool = True


settings = Settings()
