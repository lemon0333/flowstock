---
name: test-ai
description: Python AI 서비스 테스트 (pytest + 헬스체크)
---

AI 서비스를 테스트합니다.

## 실행 순서

1. **의존성 확인**:
   ```bash
   cd flowstock-ai && pip install -r requirements.txt --quiet
   ```

2. **pytest** (있으면):
   ```bash
   python -m pytest -v
   ```

3. **수동 헬스체크** (pytest 없으면):
   - 서버 시작: `uvicorn app.main:app --port 8000 &`
   - 헬스: `curl http://localhost:8000/health`
   - 서버 종료

4. **코드 린트**:
   ```bash
   python -m ruff check app/ || python -m flake8 app/ || true
   ```

5. 결과 요약

## 주의사항
- `CLAUDE_API_KEY` 가 설정되지 않으면 실제 AI 호출 테스트는 스킵
- 포트 8000 충돌 확인
