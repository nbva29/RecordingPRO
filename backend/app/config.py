from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
    )

    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: SecretStr

    jwt_secret_key: SecretStr = Field(min_length=32)
    access_token_expire_minutes: int = Field(default=30, gt=0)


settings = Settings()
