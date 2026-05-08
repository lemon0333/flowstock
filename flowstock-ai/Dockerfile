FROM python:3.12-slim

WORKDIR /app

# Node 20 + claude 심볼릭 링크 placeholder 생성
# (실제 binary는 deployment.yaml의 hostPath mount로 /usr/lib/node_modules/@anthropic-ai/claude-code/
#  를 호스트에서 받음. 호스트 binary는 mini PC CPU에 맞게 native build로 install되어 있어
#  Bun baseline build segfault 없음. GitHub Actions runner에서 npm install된 컨테이너 binary
#  는 baseline 빌드라 mini PC에서 segfault — 그래서 컨테이너 install 자체 제거.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && mkdir -p /usr/lib/node_modules/@anthropic-ai/claude-code/bin \
 && ln -sf /usr/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe /usr/bin/claude \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir 'setuptools<70' \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
