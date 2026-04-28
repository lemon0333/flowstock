"""FastAPI app smoke 테스트.

DB connection이 실패해도 startup 핸들러가 swallow하므로 health 라우트는 항상 200.
.venv-test 환경에 langchain/claude-code-sdk 등 무거운 의존성이 없으면 import 실패 — skip.
"""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint_returns_200():
    try:
        from app.main import app
    except Exception as e:
        pytest.skip(f"app import 불가 (테스트 환경 의존성 부족): {e}")
        return

    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict)
