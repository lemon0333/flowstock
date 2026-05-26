# Airflow 2.10.4 + DAGs bake-in.
#
# - 베이스: 공식 apache/airflow 이미지 (slim 아니라 기본 — pandas/pyarrow가 의존하는 system lib 포함됨)
# - DAGs와 common 모듈을 /opt/airflow/dags로 복사 → scheduler가 자동 발견
# - 사용자 추가 pip 패키지는 requirements.txt에 한 줄씩 (airflow constraints에 맞춤)
# - 빌드: docker build -t ghcr.io/lemon0333/flowstock-airflow:<TAG> .
# - 운영 image tag는 git short sha로 박는 게 무난 (CI에서 ${{ github.sha }} 사용)
FROM apache/airflow:2.10.4-python3.12

USER airflow

# constraints 파일로 호환 보장 — 로컬 .venv-airflow와 동일 버전
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir \
    --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.10.4/constraints-3.12.txt" \
    -r /tmp/requirements.txt

# DAGs와 common 모듈 복사. Airflow가 AIRFLOW__CORE__DAGS_FOLDER에서 자동 발견
COPY --chown=airflow:root dags /opt/airflow/dags
