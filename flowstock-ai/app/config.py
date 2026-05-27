from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Claude Code SDK는 API 키 대신 Claude Code 로그인 인증을 사용합니다.
    # 서버에서 `claude login`을 실행하여 로그인하세요.
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Twelve Data — 미국 종목 시세 (무료 티어, batch quote). 빈 값이면 미장 비활성(빈 결과 반환).
    # 키 발급: https://twelvedata.com/ (무료)
    TWELVE_DATA_API_KEY: str = ""

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
