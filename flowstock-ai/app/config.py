from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CLAUDE_API_KEY: str
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # MySQL
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "flowstock"
    MYSQL_PASSWORD: str = "flowstock"
    MYSQL_DATABASE: str = "flowstock_ai"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
            f"?charset=utf8mb4"
        )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
