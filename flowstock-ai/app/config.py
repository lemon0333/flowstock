from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CLAUDE_API_KEY: str
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
