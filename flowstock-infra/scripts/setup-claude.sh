#!/bin/bash
set -euo pipefail

# =============================================================================
# FlowStock - Claude Code 셋업 스크립트
# =============================================================================
# 미니 PC에서 Claude Code를 설치하고 프로젝트를 준비합니다.
# 실행: bash setup-claude.sh
# =============================================================================

FLOWSTOCK_DIR="/opt/flowstock"
REPO_URL="https://github.com/lemon0333/flowstock.git"

echo "=============================================="
echo " FlowStock - Claude Code Setup"
echo "=============================================="
echo ""

# --- Helper ---
step() {
    echo ""
    echo "----------------------------------------------"
    echo "[STEP] $1"
    echo "----------------------------------------------"
}

# =============================================================================
# 1. Node.js 20 확인/설치
# =============================================================================
step "1/5 - Node.js 20 확인"
if command -v node &> /dev/null && [[ "$(node -v)" == v20* || "$(node -v)" == v22* ]]; then
    echo "[OK] Node.js가 설치되어 있습니다: $(node -v)"
else
    echo "[INFO] Node.js 20 LTS를 설치합니다..."

    if [ "$EUID" -ne 0 ]; then
        echo "[ERROR] Node.js 설치를 위해 root 권한이 필요합니다."
        echo "  sudo bash setup-claude.sh"
        exit 1
    fi

    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "[OK] Node.js 설치 완료: $(node -v)"
fi

# =============================================================================
# 2. Claude Code CLI 설치
# =============================================================================
step "2/5 - Claude Code CLI 설치"
if command -v claude &> /dev/null; then
    echo "[OK] Claude Code CLI가 이미 설치되어 있습니다."
    claude --version 2>/dev/null || true
else
    echo "[INFO] Claude Code CLI를 설치합니다..."

    # root인 경우 --unsafe-perm 필요할 수 있음
    if [ "$EUID" -eq 0 ]; then
        npm install -g @anthropic-ai/claude-code --unsafe-perm
    else
        npm install -g @anthropic-ai/claude-code
    fi

    echo "[OK] Claude Code CLI 설치 완료"
fi

# =============================================================================
# 3. Claude Code 로그인 안내
# =============================================================================
step "3/5 - Claude Code 로그인 안내"
echo ""
echo "  Claude Code 로그인은 인터랙티브 과정이 필요합니다."
echo "  아래 명령어를 직접 실행하세요:"
echo ""
echo "    claude login"
echo ""
echo "  브라우저가 열리면 Anthropic 계정으로 로그인합니다."
echo "  서버에 브라우저가 없는 경우, 다른 기기에서 URL을 열어 인증할 수 있습니다."
echo ""

# =============================================================================
# 4. FlowStock 프로젝트 클론
# =============================================================================
step "4/5 - FlowStock 프로젝트 클론"
if [ -d "$FLOWSTOCK_DIR/.git" ]; then
    echo "[SKIP] 프로젝트가 이미 존재합니다: $FLOWSTOCK_DIR"
    echo "[INFO] 최신 코드를 pull합니다..."
    cd "$FLOWSTOCK_DIR"
    git pull origin main || echo "[WARN] git pull 실패 - 네트워크를 확인하세요."
else
    echo "[INFO] 프로젝트를 클론합니다: $REPO_URL"

    # /opt 디렉토리 권한 확인
    if [ ! -w "/opt" ]; then
        if [ "$EUID" -ne 0 ]; then
            echo "[ERROR] /opt 디렉토리에 쓰기 권한이 없습니다. root로 실행하세요."
            exit 1
        fi
    fi

    git clone "$REPO_URL" "$FLOWSTOCK_DIR"
    echo "[OK] 프로젝트 클론 완료: $FLOWSTOCK_DIR"
fi

# =============================================================================
# 5. Claude Code 프로젝트 설정 + 사용 예시
# =============================================================================
step "5/5 - Claude Code 프로젝트 설정 및 사용 안내"

# CLAUDE.md 존재 확인
if [ -f "$FLOWSTOCK_DIR/CLAUDE.md" ]; then
    echo "[OK] CLAUDE.md 파일이 존재합니다. Claude Code가 프로젝트를 자동으로 인식합니다."
else
    echo "[WARN] CLAUDE.md 파일이 없습니다. Claude Code가 프로젝트 컨텍스트를 파악하지 못할 수 있습니다."
fi

echo ""
echo "=============================================="
echo " Claude Code 셋업 완료!"
echo "=============================================="
echo ""
echo " 먼저 로그인하세요:"
echo "   claude login"
echo ""
echo " 사용 예시:"
echo ""
echo "   # 전체 서비스 헬스체크"
echo "   cd $FLOWSTOCK_DIR && claude \"전체 서비스 헬스체크 해줘\""
echo ""
echo "   # 전체 배포"
echo "   cd $FLOWSTOCK_DIR && claude \"/deploy-k3s all\""
echo ""
echo "   # 코드 리뷰"
echo "   cd $FLOWSTOCK_DIR && claude \"/full-review\""
echo ""
echo "   # 로그 확인 및 에러 분석"
echo "   cd $FLOWSTOCK_DIR && claude \"로그 확인하고 에러 있으면 알려줘\""
echo ""
echo "   # 특정 문제 해결"
echo "   cd $FLOWSTOCK_DIR && claude \"backend pod가 CrashLoopBackOff인데 원인 찾아줘\""
echo ""
echo "   # 인터랙티브 모드 (대화형)"
echo "   cd $FLOWSTOCK_DIR && claude"
echo ""
echo "=============================================="
