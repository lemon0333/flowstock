FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir 'setuptools<70' \
 && pip install --no-cache-dir -r requirements.txt

# 임베딩 모델 빌드 시 사전 다운로드 (런타임 startup 시간 단축, RAG 즉시 사용 가능)
ENV HF_HOME=/root/.cache/huggingface
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')" \
 || echo "model preload skipped (network/install issue) — runtime fallback"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
