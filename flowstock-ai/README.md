# FlowStock AI Service

FastAPI + LangChain 기반 AI 분석 서비스. Kotlin 백엔드에서 내부 HTTP로 호출.

## 스택
- Python 3.12 + FastAPI
- LangChain + langchain-anthropic (Claude Sonnet)
- Pydantic v2 (스키마 검증)

## 에이전트

| 에이전트 | API | 설명 |
|---------|-----|------|
| NewsAnalyzer | `POST /api/ai/news/analyze` | 뉴스 감성(POS/NEG/NEU), 요약, 중요도, 관련종목+영향도 |
| ChartAgent | `POST /api/ai/chart/analyze` | OHLCV 패턴 분석, 추세, 지지/저항선 |
| GraphAgent | `POST /api/ai/graph/generate` | ReactFlow 호환 노드/엣지 그래프 데이터 |

## 로컬 실행

```bash
# 환경변수
export CLAUDE_API_KEY=your-anthropic-api-key

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 헬스체크
curl http://localhost:8000/health
```

## Docker

```bash
docker build -t flowstock-ai .
docker run -p 8000:8000 -e CLAUDE_API_KEY=your-key flowstock-ai
```

## 환경변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `CLAUDE_API_KEY` | O | - | Anthropic API 키 |
| `APP_PORT` | X | 8000 | 서버 포트 |
| `LOG_LEVEL` | X | INFO | 로그 레벨 |

## 향후 계획
- **LangGraph**: 에이전트 간 오케스트레이션 (뉴스분석 → 그래프생성 파이프라인)
- **LangSmith**: 프롬프트 트레이싱, 성능 모니터링
- **RAG**: 뉴스 임베딩 → 벡터 검색 → 맥락 기반 분석
- **크롤러**: 뉴스 자동 수집 (BeautifulSoup/Scrapy)
