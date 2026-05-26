# Airflow 실행 환경. 새 터미널마다 `source flowstock-airflow/env.sh`.
# - AIRFLOW_HOME: airflow가 cfg/DB/log를 두는 곳. repo 안 .airflow-home/에 격리 (gitignore)
# - DAGS_FOLDER: DAG 파일을 repo 안 flowstock-airflow/dags에 두기 위해 override
# - LOAD_EXAMPLES: example DAG 50+개가 UI에 같이 뜨는 거 끔
# - PATH: .venv-airflow의 airflow 바이너리를 우선
#
# bash/zsh 둘 다 호환: source 경로 잡는 변수가 달라서 fallback 체인.

# zsh는 ${(%):-%x}, bash는 ${BASH_SOURCE[0]}. 둘 다 안 되면 (직접 실행) $0 fallback.
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  _SCRIPT="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  _SCRIPT="${(%):-%x}"
else
  _SCRIPT="$0"
fi

HERE="$(cd "$(dirname "$_SCRIPT")/.." && pwd)"
unset _SCRIPT

export AIRFLOW_HOME="$HERE/.airflow-home"
export AIRFLOW__CORE__DAGS_FOLDER="$HERE/flowstock-airflow/dags"
export AIRFLOW__CORE__LOAD_EXAMPLES=False
export PATH="$HERE/.venv-airflow/bin:$PATH"

# macOS Apple Silicon에서 airflow standalone(gunicorn fork worker)이 SIGSEGV로 죽는 이슈 회피.
# fork() 후 Objective-C 런타임을 그대로 쓰면 macOS가 안전성 검사로 abort 시킴.
# Airflow는 fork만 쓰므로 disable 해도 무해. airflow dags test는 fork 안 해서 영향 없음.
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
# grpc/macOS DNS resolver의 fork 이슈 회피 (보조)
export NO_PROXY="*"

echo "AIRFLOW_HOME=$AIRFLOW_HOME"
echo "DAGS_FOLDER=$AIRFLOW__CORE__DAGS_FOLDER"
echo "airflow: $(command -v airflow)"
