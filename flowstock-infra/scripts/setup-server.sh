#!/bin/bash
set -euo pipefail

# =============================================================================
# FlowStock Mini PC Server Setup Script
# =============================================================================
# 이 스크립트는 FlowStock 미니 PC 서버를 셋업합니다.
# Ubuntu 22.04 / 24.04 에서 테스트되었습니다.
# 실행: bash setup-server.sh
# =============================================================================

echo "=============================================="
echo " FlowStock Mini PC Server Setup"
echo " 이 스크립트는 FlowStock 미니 PC 서버를 셋업합니다."
echo "=============================================="
echo ""

# --- Helper ---
step() {
    echo ""
    echo "----------------------------------------------"
    echo "[STEP] $1"
    echo "----------------------------------------------"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo "[ERROR] 이 스크립트는 root 권한이 필요합니다."
        echo "  sudo bash setup-server.sh"
        exit 1
    fi
}

check_root

# =============================================================================
# 1. 시스템 업데이트
# =============================================================================
step "1/10 - 시스템 업데이트 (apt update/upgrade)"
apt-get update -y
apt-get upgrade -y

# =============================================================================
# 2. 필수 패키지 설치
# =============================================================================
step "2/10 - 필수 패키지 설치"
apt-get install -y \
    curl \
    wget \
    git \
    jq \
    unzip \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    gettext-base \
    htop \
    net-tools

echo "[OK] 필수 패키지 설치 완료"

# =============================================================================
# 3. Docker 설치
# =============================================================================
step "3/10 - Docker 설치"
if command -v docker &> /dev/null; then
    echo "[SKIP] Docker가 이미 설치되어 있습니다: $(docker --version)"
else
    # Docker 공식 GPG 키 추가
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Docker 리포지토리 추가
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # 현재 사용자를 docker 그룹에 추가 (SUDO_USER가 있으면 해당 사용자)
    if [ -n "${SUDO_USER:-}" ]; then
        usermod -aG docker "$SUDO_USER"
        echo "[INFO] 사용자 '$SUDO_USER'를 docker 그룹에 추가했습니다."
    fi

    systemctl enable docker
    systemctl start docker
    echo "[OK] Docker 설치 완료: $(docker --version)"
fi

# =============================================================================
# 4. k3s 설치 (single node)
# =============================================================================
step "4/10 - k3s 설치 (single node)"
if command -v k3s &> /dev/null; then
    echo "[SKIP] k3s가 이미 설치되어 있습니다: $(k3s --version)"
else
    curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -

    # k3s 시작 대기
    echo "[INFO] k3s 시작 대기 중..."
    sleep 10

    # kubeconfig 설정
    mkdir -p /root/.kube
    cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
    chmod 600 /root/.kube/config

    if [ -n "${SUDO_USER:-}" ]; then
        SUDO_HOME=$(eval echo "~$SUDO_USER")
        mkdir -p "$SUDO_HOME/.kube"
        cp /etc/rancher/k3s/k3s.yaml "$SUDO_HOME/.kube/config"
        chown "$SUDO_USER:$SUDO_USER" "$SUDO_HOME/.kube/config"
        chmod 600 "$SUDO_HOME/.kube/config"
    fi

    echo "[OK] k3s 설치 완료"
fi

# =============================================================================
# 5. kubectl alias 설정
# =============================================================================
step "5/10 - kubectl alias 설정"

setup_kubectl_alias() {
    local rc_file="$1"
    if ! grep -q "alias kubectl=" "$rc_file" 2>/dev/null; then
        {
            echo ""
            echo "# FlowStock: kubectl alias"
            echo "alias kubectl='k3s kubectl'"
            echo "alias k='k3s kubectl'"
            echo "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
        } >> "$rc_file"
        echo "[OK] kubectl alias 추가: $rc_file"
    else
        echo "[SKIP] kubectl alias가 이미 설정되어 있습니다: $rc_file"
    fi
}

setup_kubectl_alias /root/.bashrc

if [ -n "${SUDO_USER:-}" ]; then
    SUDO_HOME=$(eval echo "~$SUDO_USER")
    setup_kubectl_alias "$SUDO_HOME/.bashrc"
fi

# 현재 세션에서도 사용 가능하도록
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "[OK] kubectl alias 설정 완료"

# =============================================================================
# 6. GHCR 로그인 설정
# =============================================================================
step "6/10 - GHCR (GitHub Container Registry) 로그인 안내"
echo "[INFO] GHCR 로그인은 GitHub Personal Access Token이 필요합니다."
echo ""
echo "  셋업 후 아래 명령어로 로그인하세요:"
echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u <USERNAME> --password-stdin"
echo ""
echo "  k3s에서 GHCR 이미지를 pull하려면 k8s imagePullSecret도 설정하세요."
echo ""

# =============================================================================
# 7. Node.js 20 LTS 설치
# =============================================================================
step "7/10 - Node.js 20 LTS 설치"
if command -v node &> /dev/null && [[ "$(node -v)" == v20* ]]; then
    echo "[SKIP] Node.js 20이 이미 설치되어 있습니다: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "[OK] Node.js 설치 완료: $(node -v), npm: $(npm -v)"
fi

# =============================================================================
# 8. Claude Code CLI 설치
# =============================================================================
step "8/10 - Claude Code CLI 설치"
if command -v claude &> /dev/null; then
    echo "[SKIP] Claude Code CLI가 이미 설치되어 있습니다: $(claude --version 2>/dev/null || echo 'installed')"
else
    npm install -g @anthropic-ai/claude-code
    echo "[OK] Claude Code CLI 설치 완료"
fi

# =============================================================================
# 9. Python 3.12 설치
# =============================================================================
step "9/10 - Python 3.12 설치"
if command -v python3.12 &> /dev/null; then
    echo "[SKIP] Python 3.12가 이미 설치되어 있습니다: $(python3.12 --version)"
else
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update -y
    apt-get install -y python3.12 python3.12-venv python3.12-dev python3-pip
    echo "[OK] Python 3.12 설치 완료: $(python3.12 --version)"
fi

# =============================================================================
# 10. cloudflared 설치
# =============================================================================
step "10/10 - cloudflared 설치"
if command -v cloudflared &> /dev/null; then
    echo "[SKIP] cloudflared가 이미 설치되어 있습니다: $(cloudflared --version)"
else
    curl -L --output /tmp/cloudflared.deb \
        https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i /tmp/cloudflared.deb
    rm -f /tmp/cloudflared.deb
    echo "[OK] cloudflared 설치 완료: $(cloudflared --version)"
fi

# =============================================================================
# 완료
# =============================================================================
echo ""
echo "=============================================="
echo " FlowStock Server Setup 완료!"
echo "=============================================="
echo ""
echo " 다음 단계:"
echo "  1. 프로젝트 클론:"
echo "     git clone https://github.com/lemon0333/flowstock.git /opt/flowstock"
echo ""
echo "  2. 시크릿 설정:"
echo "     cp /opt/flowstock/flowstock-infra/.env.example /opt/flowstock/flowstock-infra/.env"
echo "     nano /opt/flowstock/flowstock-infra/.env"
echo ""
echo "  3. Claude Code 로그인:"
echo "     claude login"
echo ""
echo "  4. 전체 배포:"
echo "     bash /opt/flowstock/flowstock-infra/scripts/deploy-all.sh"
echo ""
echo "  5. GHCR 로그인 (필요 시):"
echo "     echo \$GITHUB_TOKEN | docker login ghcr.io -u <USERNAME> --password-stdin"
echo ""
echo " 새 터미널을 열거나 'source ~/.bashrc'를 실행하면 kubectl alias가 적용됩니다."
echo "=============================================="
