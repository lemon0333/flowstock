"""
market_silver — Bronze JSON 읽어서 정제·검증 후 Silver Parquet로 적재.

흐름:
  read_bronze  → 오늘 dt=YYYY-MM-DD/market=KOSPI/data.json 읽기 (list[dict])
  clean        → volume<=0, close<=0 제거 + ticker dedupe
  validate     → 행수 50~1000, ticker 6자리 정수 형태 검증. fail이면 DAG halt
  write_silver → pandas DataFrame → /tmp/.../silver/.../part-0.parquet

Bronze 의존: 사전에 market_bronze가 같은 dt= 파티션을 만들어둬야 함.
지금은 같은 날짜 기준으로 단순 path lookup. (STEP 4에서 ExternalTaskSensor로 진짜 의존 표현 예정.)
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime
from typing import Any

from airflow import DAG
from airflow.exceptions import AirflowFailException
from airflow.operators.python import PythonOperator

logger = logging.getLogger(__name__)

BRONZE_ROOT = "/tmp/flowstock-data/bronze/ohlcv"
SILVER_ROOT = "/tmp/flowstock-data/silver/ohlcv"
MARKET = "KOSPI"
TICKER_RE = re.compile(r"^\d{6}$")


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def read_bronze() -> list[dict[str, Any]]:
    path = os.path.join(BRONZE_ROOT, f"dt={_today()}", f"market={MARKET}", "data.json")
    if not os.path.exists(path):
        raise AirflowFailException(
            f"Bronze 파일 없음: {path}\n먼저 `airflow dags test market_bronze` 실행 필요."
        )
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    logger.info("Bronze 로드: %s (%d 종목)", path, len(rows))
    return rows


def clean(ti) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = ti.xcom_pull(task_ids="read_bronze")
    before = len(rows)

    # 1) 거래 없는 종목 + 가격 0 행 제거
    filtered = [r for r in rows if (r.get("volume") or 0) > 0 and (r.get("close") or 0) > 0]
    dropped_zero = before - len(filtered)

    # 2) ticker dedupe (Naver 페이지 중복 방어)
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for r in filtered:
        t = r.get("ticker") or ""
        if t in seen:
            continue
        seen.add(t)
        deduped.append(r)
    dropped_dup = len(filtered) - len(deduped)

    logger.info(
        "clean: %d → %d (zero vol/close %d, duplicate %d)",
        before,
        len(deduped),
        dropped_zero,
        dropped_dup,
    )
    return deduped


def validate(ti) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = ti.xcom_pull(task_ids="clean")
    n = len(rows)

    # 행수 — KOSPI는 ~900종목, Naver는 top 400 pull. 너무 적으면 데이터 망가짐, 너무 많으면 dedupe 실패
    if n < 50:
        raise AirflowFailException(f"validate FAIL: 행수가 너무 적음 ({n}). 데이터 소스 의심.")
    if n > 1000:
        raise AirflowFailException(f"validate FAIL: 행수가 너무 많음 ({n}). dedupe 누락?")

    # ticker 형태 — KRX 종목 코드는 6자리 숫자. ETN(7자리)은 Bronze에 들어왔다면 다른 케이스라 표시만.
    bad_ticker = [r["ticker"] for r in rows if not TICKER_RE.match(r.get("ticker") or "")]
    if bad_ticker:
        logger.warning("6자리 ticker 아닌 종목 %d개 (ETN/ETF일 수 있음): %s", len(bad_ticker), bad_ticker[:5])

    # close > 0 보장 — clean에서 이미 처리됐지만 한번 더 확인 (방어적)
    if any((r.get("close") or 0) <= 0 for r in rows):
        raise AirflowFailException("validate FAIL: close <= 0 행이 남아있음")

    logger.info("validate OK: %d 종목, 6자리 ticker %d, 기타 %d", n, n - len(bad_ticker), len(bad_ticker))
    return rows


def write_silver(ti) -> str:
    # pandas/pyarrow는 task 안에서만 import — Airflow scheduler 부팅 시 import 비용 최소화
    import pandas as pd

    rows: list[dict[str, Any]] = ti.xcom_pull(task_ids="validate")
    df = pd.DataFrame(rows)

    # dtype 명시 — Parquet 스키마가 안정적이도록
    df = df.astype(
        {
            "ticker": "string",
            "name": "string",
            "market": "string",
            "close": "int64",
            "change": "int64",
            "change_rate": "float64",
            "volume": "int64",
            "market_value": "int64",
        }
    )

    dir_path = os.path.join(SILVER_ROOT, f"dt={_today()}", f"market={MARKET}")
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, "part-0.parquet")

    df.to_parquet(file_path, engine="pyarrow", index=False, compression="snappy")

    size = os.path.getsize(file_path)
    logger.info(
        "Silver 적재 완료: %s (%d bytes, %d 종목, %d 컬럼)",
        file_path,
        size,
        len(df),
        len(df.columns),
    )
    return file_path


with DAG(
    dag_id="market_silver",
    start_date=datetime(2026, 5, 1),
    schedule=None,
    catchup=False,
    tags=["flowstock", "silver"],
) as dag:
    t_read = PythonOperator(task_id="read_bronze", python_callable=read_bronze)
    t_clean = PythonOperator(task_id="clean", python_callable=clean)
    t_validate = PythonOperator(task_id="validate", python_callable=validate)
    t_write = PythonOperator(task_id="write_silver", python_callable=write_silver)

    t_read >> t_clean >> t_validate >> t_write
