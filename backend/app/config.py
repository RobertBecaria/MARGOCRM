from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://dom:dom@localhost:5432/dom"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    resend_api_key: str = ""
    from_email: str = "noreply@dom.app"

    class Config:
        env_file = ".env"


settings = Settings()
