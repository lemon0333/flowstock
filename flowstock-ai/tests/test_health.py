"""FastAPI app smoke 테스트.

DB connection이 실패해도 startup 핸들러가 swallow하므로 health 라우트는 항상 200.
"""

from fastapi.testclient import TestClient


def test_health_endpoint_returns_200():
    # 모듈 import 시 settings 로드돼야 함 — 환경변수 부족 환경 위해 lazy import
    from app.main import app

    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        # 'status' 또는 'db_status' 같은 필드 존재 (구조 변경에 둔감하게)
        assert isinstance(body, dict)
